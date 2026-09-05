import { BidImportError, type ImportedBidRow } from "@/lib/bid-import";
import { toSeoulDateKey } from "@/lib/date";
import type { assetGroups } from "@/server/db/schema";

export type ImportAsset = Pick<typeof assetGroups.$inferSelect, "id" | "name" | "quantity" | "displayOrder" | "minimumRecovery">;

export function validateBidImport(imported: ImportedBidRow[], assets: ImportAsset[], now = new Date()) {
  const today = toSeoulDateKey(now);
  const assetById = new Map(assets.map((asset) => [asset.id, asset]));
  const covered = new Set<string>();
  const assetPartnerPairs = new Set<string>();
  const partnerEvidence = new Map<string, (typeof imported)[number]>();

  for (const [rowIndex, row] of imported.entries()) {
    const asset = assetById.get(row.assetGroupId);
    if (!asset || asset.name !== row.assetGroupName || asset.quantity !== row.quantity) {
      throw new BidImportError(`자산 항목 ${row.assetGroupName}의 ID, 이름, 전체 수량이 현재 프로젝트와 일치하지 않습니다.`);
    }
    const hasPlaceholder = (value: string) => /^(?:REPLACE(?:_|:)|입력 필요:)/i.test(value);
    if (hasPlaceholder(row.verificationReference) || hasPlaceholder(row.partnerName)) {
      throw new BidImportError("템플릿의 인수처와 확인 자료를 실제 확인한 내용으로 바꿔 주세요.");
    }
    if (row.verificationExpiresAt && toSeoulDateKey(row.verificationExpiresAt) < today) {
      throw new BidImportError(`${row.partnerName}의 인수처 확인 자료가 만료되었습니다.`);
    }
    const pair = `${row.assetGroupId}:${row.verificationReference}`;
    if (assetPartnerPairs.has(pair)) {
      throw new BidImportError(`${row.assetGroupName}에 ${row.partnerName} 입찰이 중복되었습니다.`);
    }
    assetPartnerPairs.add(pair);
    covered.add(row.assetGroupId);

    const existingEvidence = partnerEvidence.get(row.verificationReference);
    if (
      existingEvidence &&
      (existingEvidence.partnerName !== row.partnerName ||
        existingEvidence.partnerType !== row.partnerType ||
        existingEvidence.verificationLabel !== row.verificationLabel ||
        existingEvidence.verificationExpiresOn !== row.verificationExpiresOn)
    ) {
      throw new BidImportError(`${rowIndex + 2}행의 확인 자료 ${row.verificationReference}가 앞선 행과 다릅니다. 같은 자료의 인수처, 유형, 확인 내용과 만료일을 일치시켜 주세요.`);
    }
    partnerEvidence.set(row.verificationReference, row);
  }

  if (covered.size !== assets.length) {
    const missing = assets.filter((asset) => !covered.has(asset.id)).map((asset) => asset.name);
    throw new BidImportError(`각 자산 항목에 입찰이 하나 이상 필요합니다. 입찰이 없는 자산 항목: ${missing.join(", ")}`);
  }
  return { assetById, covered, partnerEvidence };
}
