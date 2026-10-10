import { NextRequest } from "next/server";
import { afterEach, describe, expect, it } from "vitest";
import { parsePilotCodes, PILOT_COOKIE } from "@/lib/pilot";
import { proxy } from "@/proxy";

describe("parsePilotCodes", () => {
  it("maps each code to a pseudonymous veterinarian id", () => {
    expect(parsePilotCodes("abc123:vet-01, xyz789:vet-02")).toEqual(
      new Map([
        ["abc123", "vet-01"],
        ["xyz789", "vet-02"],
      ]),
    );
  });

  it("returns null when no codes are configured, leaving the app open", () => {
    expect(parsePilotCodes(undefined)).toBeNull();
    expect(parsePilotCodes("  ")).toBeNull();
  });

  it("drops entries missing a code or a veterinarian id, so a blank code can never match", () => {
    expect(parsePilotCodes(":vet-01, abc123, xyz789:vet-02")).toEqual(new Map([["xyz789", "vet-02"]]));
    expect(parsePilotCodes(":vet-01")).toBeNull();
  });
});

describe("proxy", () => {
  const original = { codes: process.env.PILOT_CODES, vercel: process.env.VERCEL_ENV };
  afterEach(() => {
    process.env.PILOT_CODES = original.codes;
    if (original.vercel === undefined) delete process.env.VERCEL_ENV;
    else process.env.VERCEL_ENV = original.vercel;
  });

  it("refuses every request on a Vercel deployment with no codes configured", () => {
    delete process.env.PILOT_CODES;
    process.env.VERCEL_ENV = "preview";
    expect(proxy(new NextRequest("http://localhost/case/plan")).status).toBe(503);
  });

  it("stays open locally even when pulled Vercel development variables are present", () => {
    delete process.env.PILOT_CODES;
    process.env.VERCEL_ENV = "development";
    expect(proxy(new NextRequest("http://localhost/case/plan")).status).toBe(200);
  });

  it("exempts only the access page and its form handler", () => {
    process.env.PILOT_CODES = "abc123:vet-01";
    expect(proxy(new NextRequest("http://localhost/access")).headers.get("location")).toBeNull();
    expect(proxy(new NextRequest("http://localhost/api/access", { method: "POST" })).headers.get("location")).toBeNull();
    expect(proxy(new NextRequest("http://localhost/accessories")).headers.get("location")).toBe("http://localhost/access");
  });

  it("lets every request through when no codes are configured", () => {
    delete process.env.PILOT_CODES;
    const res = proxy(new NextRequest("http://localhost/case/plan"));
    expect(res.headers.get("location")).toBeNull();
  });

  it("redirects to the access page without a valid code", () => {
    process.env.PILOT_CODES = "abc123:vet-01";
    const res = proxy(new NextRequest("http://localhost/case/plan"));
    expect(res.headers.get("location")).toBe("http://localhost/access");
  });

  it("admits a request carrying a configured code", () => {
    process.env.PILOT_CODES = "abc123:vet-01";
    const req = new NextRequest("http://localhost/case/plan", { headers: { cookie: `${PILOT_COOKIE}=abc123` } });
    expect(proxy(req).headers.get("location")).toBeNull();
  });
});
