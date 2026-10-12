import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchSource } from "@/lib/sources/fetch";

const URL = "https://www.aphis.usda.gov/pet-travel";

describe("fetchSource", () => {
  afterEach(() => vi.restoreAllMocks());

  it("retries once after a network error, so a one-off timeout does not fail the check", async () => {
    const fetch = vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(new TypeError("fetch failed")).mockResolvedValueOnce(new Response("ok"));
    expect(await (await fetchSource(URL)).text()).toBe("ok");
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("reports the failure when the retry also fails", async () => {
    const fetch = vi.spyOn(globalThis, "fetch").mockRejectedValue(new TypeError("fetch failed"));
    await expect(fetchSource(URL)).rejects.toThrow("fetch failed");
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("does not retry an HTTP error, since the site answered", async () => {
    const fetch = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("gone", { status: 404 }));
    expect((await fetchSource(URL)).status).toBe(404);
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
