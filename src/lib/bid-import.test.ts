import { describe, expect, it } from "vitest";
import { BID_IMPORT_HEADERS, BidImportError, parseBidCsv } from "./bid-import";
import { toSeoulDateKey } from "./date";

const header = BID_IMPORT_HEADERS.join(",");
const row = [
  "asset-1",
  "회의용 의자",
  "파트너 A",
  "BUSINESS",
  "사업자 확인",
  "biz-2026-001",
  "2027-09-01",
  "12",
  "100",
  "20",
  "12",
  "재사용",
  "100",
  "2026-09-08",
].join(",");

describe("parseBidCsv", () => {
  it("parses evidence and KST calendar dates", () => {
    const [parsed] = parseBidCsv(`${header}\n${row}`);
    expect(parsed).toMatchObject({ assetGroupId: "asset-1", quantity: 12, verificationReference: "biz-2026-001" });
    expect(toSeoulDateKey(parsed.pickupDate)).toBe("2026-09-08");
    expect(parsed.verificationExpiresAt && toSeoulDateKey(parsed.verificationExpiresAt)).toBe("2027-09-01");
  });

  it("supports commas inside quoted partner names", () => {
    const quoted = row.replace("파트너 A", '"파트너, A"');
    expect(parseBidCsv(`${header}\n${quoted}`)[0]?.partnerName).toBe("파트너, A");
  });

  it("rejects partial quantities and impossible dates", () => {
    expect(() => parseBidCsv(`${header}\n${row.replace(",12,100,20,12,", ",12,100,20,13,")}`)).toThrow(BidImportError);
    expect(() => parseBidCsv(`${header}\n${row.replace("2026-09-08", "2026-02-30")}`)).toThrow(BidImportError);
  });
});
