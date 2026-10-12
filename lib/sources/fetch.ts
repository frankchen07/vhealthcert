export const USER_AGENT = "VetTravelVerify-SourceCheck/0.1";

/** Retries once on a network error; an HTTP error status is the site's answer and is returned as is. */
export async function fetchSource(url: string): Promise<Response> {
  const attempt = () => fetch(url, { headers: { "user-agent": USER_AGENT }, signal: AbortSignal.timeout(30_000) });
  try {
    return await attempt();
  } catch {
    return attempt();
  }
}
