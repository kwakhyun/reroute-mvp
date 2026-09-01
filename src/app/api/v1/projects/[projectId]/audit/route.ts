import { AuthenticationError, AuthorizationError, ProjectNotFoundError } from "@/server/auth/errors";
import { getProjectAuditLog } from "@/server/services/dashboard";
import { observeHttpRequest } from "@/server/observability/http";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  return observeHttpRequest(request, "/api/v1/projects/[projectId]/audit", async () => {
    try {
      const { projectId } = await params;
      const requestedLimit = Number(new URL(request.url).searchParams.get("limit") ?? 20);
      const limit = Number.isFinite(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), 100) : 20;
      const rows = await getProjectAuditLog(projectId, limit);
      return Response.json({ data: rows }, { headers: { "Cache-Control": "private, no-store" } });
    } catch (error) {
      if (error instanceof AuthenticationError) return Response.json({ error: "unauthorized" }, { status: 401 });
      if (error instanceof ProjectNotFoundError) return Response.json({ error: "not_found" }, { status: 404 });
      if (error instanceof AuthorizationError) return Response.json({ error: "forbidden" }, { status: 403 });
      throw error;
    }
  });
}
