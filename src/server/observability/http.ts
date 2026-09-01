import "server-only";

import { randomUUID } from "node:crypto";
import { logger } from "./logger";

export async function observeHttpRequest(
  request: Request,
  routePath: string,
  handler: () => Promise<Response>,
) {
  const startedAt = performance.now();
  const requestId = request.headers.get("x-request-id") ?? request.headers.get("x-vercel-id") ?? randomUUID();
  let response: Response;

  try {
    response = await handler();
  } catch (error) {
    await logger.error("http_request_failed", {
      requestId,
      method: request.method,
      routePath,
      errorName: error instanceof Error ? error.name : "UnknownError",
      errorMessage: error instanceof Error ? error.message.slice(0, 300) : "Unknown server error",
      durationMs: Math.round(performance.now() - startedAt),
    });
    response = Response.json({ error: "internal_error" }, { status: 500 });
  }

  const context = {
    requestId,
    method: request.method,
    routePath,
    status: response.status,
    durationMs: Math.round(performance.now() - startedAt),
  };
  if (response.status >= 500) await logger.error("http_request_completed", context);
  else await logger.info("http_request_completed", context);
  response.headers.set("X-Request-Id", requestId);
  return response;
}
