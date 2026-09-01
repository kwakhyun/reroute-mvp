import { z } from "zod";
import { CsvParseError, parseCsvRows } from "./csv";

export const ASSET_IMPORT_MAX_BYTES = 1024 * 1024;
export const ASSET_IMPORT_MAX_ROWS = 500;
export const ASSET_IMPORT_HEADERS = [
  "name",
  "category",
  "quantity",
  "conditionGrade",
  "conditionLabel",
  "minimumRecovery",
  "imagePath",
] as const;

export const SUPPORTED_ASSET_IMAGE_PATHS = [
  "/assets/meeting-chair.png",
  "/assets/monitor-arm.png",
  "/assets/mobile-pedestal.png",
  "/assets/lounge-table.png",
] as const;

const assetRowSchema = z.object({
  name: z.string().trim().min(1).max(80),
  category: z.string().trim().min(1).max(40),
  quantity: z.coerce.number().int().min(1).max(100_000),
  conditionGrade: z.string().trim().min(1).max(12),
  conditionLabel: z.string().trim().min(1).max(24),
  minimumRecovery: z.coerce.number().int().min(0).max(1_000_000),
  imagePath: z.enum(SUPPORTED_ASSET_IMAGE_PATHS),
});

export type ImportedAssetRow = z.infer<typeof assetRowSchema>;

export class AssetImportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AssetImportError";
  }
}

export function parseAssetCsv(source: string): ImportedAssetRow[] {
  let rows: string[][];
  try {
    rows = parseCsvRows(source.replace(/^\uFEFF/, ""));
  } catch (error) {
    if (error instanceof CsvParseError) throw new AssetImportError(error.message);
    throw error;
  }
  const [headers, ...body] = rows;
  if (!headers || headers.length !== ASSET_IMPORT_HEADERS.length || headers.some((header, index) => header.trim() !== ASSET_IMPORT_HEADERS[index])) {
    throw new AssetImportError(`CSV 헤더는 ${ASSET_IMPORT_HEADERS.join(",")} 순서여야 합니다.`);
  }
  if (body.length === 0) throw new AssetImportError("자산 데이터를 한 행 이상 입력해 주세요.");
  if (body.length > ASSET_IMPORT_MAX_ROWS) throw new AssetImportError(`자산군은 최대 ${ASSET_IMPORT_MAX_ROWS}개까지 가져올 수 있습니다.`);

  return body.map((values, rowIndex) => {
    if (values.length !== headers.length) throw new AssetImportError(`${rowIndex + 2}행의 열 개수가 올바르지 않습니다.`);
    const parsed = assetRowSchema.safeParse(Object.fromEntries(headers.map((header, index) => [header.trim(), values[index]?.trim() ?? ""])));
    if (!parsed.success) throw new AssetImportError(`${rowIndex + 2}행의 값 또는 이미지 경로를 확인해 주세요.`);
    return parsed.data;
  });
}
