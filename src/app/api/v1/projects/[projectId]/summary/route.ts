import { AuthenticationError, AuthorizationError } from "@/server/auth/errors";
import { getMatchingDashboard } from "@/server/services/dashboard";
import { observeHttpRequest } from "@/server/observability/http";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  return observeHttpRequest(request, "/api/v1/projects/[projectId]/summary", async () => {
    try {
      const { projectId } = await params;
      const dashboard = await getMatchingDashboard(projectId);
      return Response.json({ data: dashboard }, { headers: { "Cache-Control": "private, no-store" } });
    } catch (error) {
      if (error instanceof AuthenticationError) return Response.json({ error: "unauthorized" }, { status: 401 });
      if (error instanceof AuthorizationError) return Response.json({ error: "not_found" }, { status: 404 });
      throw error;
    }
  });
}
