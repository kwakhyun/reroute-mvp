import type { Instrumentation } from "next";
import { writeLog } from "@/server/observability/logger";

export const onRequestError: Instrumentation.onRequestError = async (error, request, context) => {
  const digest = typeof error === "object" && error !== null && "digest" in error ? String(error.digest) : undefined;
  await writeLog("error", "next_request_failed", {
    errorName: error instanceof Error ? error.name : "UnknownError",
    errorMessage: error instanceof Error ? error.message.slice(0, 300) : "Unknown server error",
    digest,
    method: request.method,
    path: request.path.split("?")[0],
    routePath: context.routePath,
    routeType: context.routeType,
  });
};
