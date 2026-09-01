export function resolveClientAddress(
  requestHeaders: Pick<Headers, "get">,
  environment: { VERCEL?: string; TRUST_PROXY_HEADERS?: string },
) {
  const trustsProxy = environment.VERCEL === "1" || environment.TRUST_PROXY_HEADERS === "true";
  if (!trustsProxy) return "untrusted-proxy";
  return (
    requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    requestHeaders.get("x-real-ip")?.trim() ||
    "trusted-proxy-unknown"
  );
}
