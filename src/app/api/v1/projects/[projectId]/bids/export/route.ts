import { AuthenticationError, AuthorizationError } from "@/server/auth/errors";
import { csvCell } from "@/lib/csv";
import { toSeoulDateKey } from "@/lib/date";
import { getProjectBids } from "@/server/services/dashboard";
import { observeHttpRequest } from "@/server/observability/http";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  return observeHttpRequest(request, "/api/v1/projects/[projectId]/bids/export", async () => {
    try {
    const { projectId } = await params;
    const rows = await getProjectBids(projectId);
    const header = ["수요처", "자산군", "수량", "현금 회수", "비용 절감", "성과 지표", "성과율", "수거일"];
    const csv = [
      header.map(csvCell).join(","),
      ...rows.map((row) =>
        [
          row.partnerName,
          row.assetGroupName,
          row.quantity,
          row.cashRecovery,
          row.costSavings,
          row.performanceLabel,
          row.performanceRate,
          toSeoulDateKey(row.pickupDate),
        ]
          .map(csvCell)
          .join(","),
      ),
    ].join("\n");

    return new Response(`\uFEFF${csv}`, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${projectId}-bids.csv"`,
        "Cache-Control": "private, no-store",
      },
    });
    } catch (error) {
      if (error instanceof AuthenticationError) return Response.json({ error: "unauthorized" }, { status: 401 });
      if (error instanceof AuthorizationError) return Response.json({ error: "not_found" }, { status: 404 });
      throw error;
    }
  });
}
