export type BidImportPreview = {
  existingBidCount: number;
  incomingBidCount: number;
  partnerCount: number;
  assetGroupCount: number;
  invalidatedDraftCount: number;
  combinationCount: number | null;
  combinationLimit: number;
  canImport: boolean;
  criteriaPassed: boolean | null;
  message: string;
  token: string;
  rows: Array<{ assetGroupName: string; partnerName: string; cashRecovery: number; quantity: number }>;
};

export type BidImportActionState =
  | { status: "idle" }
  | { status: "preview"; preview: BidImportPreview }
  | { status: "success"; message: string }
  | { status: "error"; message: string };

export const initialBidImportActionState: BidImportActionState = { status: "idle" };
