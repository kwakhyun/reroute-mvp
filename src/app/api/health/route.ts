import { checkDatabaseReadiness } from "@/server/db/readiness";
import { logger } from "@/server/observability/logger";
import { observeHttpRequest } from "@/server/observability/http";

export async function GET(request: Request) {
  return observeHttpRequest(request, "/api/health", async () => {
    const startedAt = performance.now();

    try {
      const schema = await checkDatabaseReadiness();
      return Response.json(
        {
          status: "ready",
          database: "ready",
          schema,
          latencyMs: Math.round(performance.now() - startedAt),
          timestamp: new Date().toISOString(),
        },
        { headers: { "Cache-Control": "no-store" } },
      );
    } catch (error) {
      await logger.error("health_database_not_ready", { errorName: error instanceof Error ? error.name : "UnknownError" });
      return Response.json(
        { status: "degraded", database: "not_ready", timestamp: new Date().toISOString() },
        { status: 503, headers: { "Cache-Control": "no-store" } },
      );
    }
  });
}
