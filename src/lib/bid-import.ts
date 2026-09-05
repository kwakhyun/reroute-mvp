import { z } from "zod";
import { CsvParseError, parseCsvRows } from "./csv";
import { fromSeoulDateKey } from "./date";
import { MAX_BID_CASH_VALUE } from "./domain-constraints";

export const BID_IMPORT_MAX_BYTES = 5 * 1024 * 1024;
export const BID_IMPORT_MAX_ROWS = 5_000;
export const BID_IMPORT_HEADERS = [
  "assetGroupId",
  "assetGroupName",
  "partnerName",
  "partnerType",
  "verificationLabel",
  "verificationReference",
  "verificationExpiresOn",
  "quantity",
  "cashRecovery",
  "costSavings",
  "reuseQuantity",
  "performanceLabel",
  "performanceRate",
  "pickupDate",
] as const;

const dateKey = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
  try {
    fromSeoulDateKey(value);
    return true;
  } catch {
    return false;
  }
}, "Invalid calendar date");
const bidRowSchema = z
  .object({
    assetGroupId: z.string().trim().min(1).max(100),
    assetGroupName: z.string().trim().min(1).max(80),
    partnerName: z.string().trim().min(1).max(100),
    partnerType: z.enum(["BUSINESS", "EMPLOYEE", "NONPROFIT", "RECYCLER"]),
    verificationLabel: z.string().trim().min(2).max(60),
    verificationReference: z.string().trim().min(3).max(160),
    verificationExpiresOn: z.union([dateKey, z.literal("")]),
    quantity: z.string().trim().min(1, "숫자를 입력해 주세요. 값이 없으면 0을 명시해 주세요.").pipe(z.coerce.number<string>().int().min(1).max(100_000)),
    cashRecovery: z.string().trim().min(1, "숫자를 입력해 주세요. 값이 없으면 0을 명시해 주세요.").pipe(z.coerce.number<string>().int().min(0).max(MAX_BID_CASH_VALUE)),
    costSavings: z.string().trim().min(1, "숫자를 입력해 주세요. 값이 없으면 0을 명시해 주세요.").pipe(z.coerce.number<string>().int().min(0).max(MAX_BID_CASH_VALUE)),
    reuseQuantity: z.string().trim().min(1, "숫자를 입력해 주세요. 값이 없으면 0을 명시해 주세요.").pipe(z.coerce.number<string>().int().min(0).max(100_000)),
    performanceLabel: z.string().trim().min(1).max(60),
    performanceRate: z.string().trim().min(1, "숫자를 입력해 주세요. 값이 없으면 0을 명시해 주세요.").pipe(z.coerce.number<string>().min(0).max(100)),
    pickupDate: dateKey,
  })
  .superRefine((row, context) => {
    if (row.reuseQuantity > row.quantity) {
      context.addIssue({ code: "custom", path: ["reuseQuantity"], message: "reuseQuantity must not exceed quantity" });
    }
  })
  .transform((row) => ({
    ...row,
    pickupDate: fromSeoulDateKey(row.pickupDate),
    verificationExpiresAt: row.verificationExpiresOn
      ? fromSeoulDateKey(row.verificationExpiresOn)
      : null,
  }));

export type ImportedBidRow = z.infer<typeof bidRowSchema>;

export class BidImportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BidImportError";
  }
}

export function parseBidCsv(source: string): ImportedBidRow[] {
  let rows: string[][];
  try {
    rows = parseCsvRows(source.replace(/^\uFEFF/, ""));
  } catch (error) {
    if (error instanceof CsvParseError) throw new BidImportError(error.message);
    throw error;
  }

  const [headers, ...body] = rows;
  if (
    !headers ||
    headers.length !== BID_IMPORT_HEADERS.length ||
    headers.some((header, index) => header.trim() !== BID_IMPORT_HEADERS[index])
  ) {
    throw new BidImportError(`CSV 헤더는 ${BID_IMPORT_HEADERS.join(",")} 순서여야 합니다.`);
  }
  if (body.length === 0) throw new BidImportError("입찰 데이터를 한 행 이상 입력해 주세요.");
  if (body.length > BID_IMPORT_MAX_ROWS) {
    throw new BidImportError(`입찰은 최대 ${BID_IMPORT_MAX_ROWS.toLocaleString("ko-KR")}건까지 가져올 수 있습니다.`);
  }

  return body.map((values, rowIndex) => {
    if (values.length !== headers.length) {
      throw new BidImportError(`${rowIndex + 2}행의 열 개수가 올바르지 않습니다.`);
    }
    const parsed = bidRowSchema.safeParse(
      Object.fromEntries(headers.map((header, index) => [header.trim(), values[index]?.trim() ?? ""])),
    );
    if (!parsed.success) {
      const field = String(parsed.error.issues[0]?.path[0] ?? "값");
      throw new BidImportError(`${rowIndex + 2}행 ${field} 열의 값을 확인해 주세요. 숫자 값은 빈칸 대신 0을 명시해 주세요.`);
    }
    return parsed.data;
  });
}
