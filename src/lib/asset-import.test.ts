import { describe, expect, it } from "vitest";
import { AssetImportError, parseAssetCsv } from "./asset-import";

const header = "name,category,quantity,conditionGrade,conditionLabel,minimumRecovery,imagePath";

describe("parseAssetCsv", () => {
  it("parses quoted commas and numeric values", () => {
    expect(parseAssetCsv(`${header}\n\"회의용 의자, 검정\",CHAIR,12,B,양호,50,/assets/meeting-chair.png`)).toEqual([
      expect.objectContaining({ name: "회의용 의자, 검정", quantity: 12, minimumRecovery: 50 }),
    ]);
  });

  it("rejects malformed headers and unsafe image paths", () => {
    expect(() => parseAssetCsv(`name,quantity\n의자,1`)).toThrow(AssetImportError);
    expect(() => parseAssetCsv(`${header}\n의자,CHAIR,1,B,양호,0,https://example.com/a.png`)).toThrow("이미지 경로");
  });

  it("rejects a plausible path that is not in the shipped catalog", () => {
    expect(() => parseAssetCsv(`${header}\n의자,CHAIR,1,B,양호,0,/assets/missing.png`)).toThrow("이미지 경로");
  });
});
