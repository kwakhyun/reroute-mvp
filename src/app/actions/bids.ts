"use server";

import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { BID_IMPORT_MAX_BYTES, BidImportError, parseBidCsv } from "@/lib/bid-import";
import type { BidImportActionState } from "@/lib/bid-import-action-state";
import { AuthenticationError, AuthorizationError } from "@/server/auth/errors";
import { logger } from "@/server/observability/logger";
import { getRequestIpHash } from "@/server/security/request";
import { MatchingIntegrityError } from "@/server/services/matching-engine";
import { importProjectBids } from "@/server/services/bid-import";

const importSchema = z.object({
  projectId: z.string().min(1),
  intent: z.enum(["preview", "commit"]),
  previewToken: z.string().max(100).default(""),
});

export async function importBidsAction(
  _state: BidImportActionState,
  formData: FormData,
): Promise<BidImportActionState> {
  const parsed = importSchema.safeParse(Object.fromEntries(formData));
  const file = formData.get("bidFile");
  if (!parsed.success) return { status: "error", message: "프로젝트 정보를 확인해 주세요." };
  if (!(file instanceof File) || file.size === 0) {
    return { status: "error", message: "입찰 CSV 파일을 선택해 주세요." };
  }
  if (file.size > BID_IMPORT_MAX_BYTES) {
    return { status: "error", message: "입찰 CSV는 5MB 이하여야 합니다." };
  }
  if (!file.name.toLowerCase().endsWith(".csv")) {
    return { status: "error", message: "CSV 형식의 파일만 가져올 수 있습니다." };
  }

  let imported;
  let fileHash;
  try {
    const source = await file.text();
    fileHash = createHash("sha256").update(source).digest("hex");
    imported = parseBidCsv(source);
  } catch (error) {
    if (error instanceof BidImportError) return { status: "error", message: error.message };
    return { status: "error", message: "CSV 파일을 읽지 못했습니다." };
  }

  try {
    const result = await importProjectBids({ ...parsed.data, imported, fileHash, ipHash: await getRequestIpHash() });
    if (result.status === "success") {
      revalidatePath(`/projects/${parsed.data.projectId}/bids`);
      revalidatePath(`/projects/${parsed.data.projectId}/matching`);
    }
    return result;
  } catch (error) {
    if (error instanceof BidImportError || error instanceof AuthenticationError || error instanceof AuthorizationError || error instanceof MatchingIntegrityError) {
      return { status: "error", message: error.message };
    }
    if (error instanceof Error && error.message.includes("PROJECT_VERSION_CONFLICT")) {
      return { status: "error", message: "프로젝트가 다른 사용자에 의해 변경되었습니다. 새로고침 후 다시 시도해 주세요." };
    }
    await logger.error("bid_import_failed", {
      projectId: parsed.data.projectId,
      errorName: error instanceof Error ? error.name : "UnknownError",
    });
    return { status: "error", message: "입찰을 가져오지 못했습니다. 원본 데이터는 변경되지 않았습니다." };
  }
}
