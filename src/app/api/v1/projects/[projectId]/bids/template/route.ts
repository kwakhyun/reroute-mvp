import { asc, eq } from "drizzle-orm";
import { BID_IMPORT_HEADERS } from "@/lib/bid-import";
import { csvCell } from "@/lib/csv";
import { toSeoulDateKey } from "@/lib/date";
import { AuthenticationError, AuthorizationError, ProjectNotFoundError } from "@/server/auth/errors";
import { requireProjectAccess } from "@/server/auth/project-access";
import { db } from "@/server/db/client";
import { assetGroups } from "@/server/db/schema";
import { observeHttpRequest } from "@/server/observability/http";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  return observeHttpRequest(request, "/api/v1/projects/[projectId]/bids/template", async () => {
    try {
    const { projectId } = await params;
    await requireProjectAccess(projectId, ["APPROVER"]);
    const assets = await db
      .select({ id: assetGroups.id, name: assetGroups.name, quantity: assetGroups.quantity })
      .from(assetGroups)
      .where(eq(assetGroups.projectId, projectId))
      .orderBy(asc(assetGroups.displayOrder));
    const suggestedPickupDate = toSeoulDateKey(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const csv = [
      BID_IMPORT_HEADERS.map(csvCell).join(","),
      ...assets.map((asset, index) =>
        [
          asset.id,
          asset.name,
          `입력 필요: 인수처 ${index + 1}`,
          "BUSINESS",
          "사업자 확인",
          "입력 필요: 인수처 확인 자료",
          "",
          asset.quantity,
          0,
          0,
          asset.quantity,
          "재사용",
          100,
          suggestedPickupDate,
        ].map(csvCell).join(","),
      ),
    ].join("\n");

    return new Response(`\uFEFF${csv}`, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${projectId}-bid-import-template.csv"`,
        "Cache-Control": "private, no-store",
      },
    });
    } catch (error) {
      if (error instanceof AuthenticationError) return Response.json({ error: "unauthorized" }, { status: 401 });
      if (error instanceof ProjectNotFoundError) return Response.json({ error: "not_found" }, { status: 404 });
      if (error instanceof AuthorizationError) return Response.json({ error: "forbidden" }, { status: 403 });
      throw error;
    }
  });
}
