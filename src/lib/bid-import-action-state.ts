export type BidImportActionState =
  | { status: "idle" }
  | { status: "success"; message: string }
  | { status: "error"; message: string };

export const initialBidImportActionState: BidImportActionState = { status: "idle" };
