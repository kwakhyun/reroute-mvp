export type OperationActionState = { status: "idle" | "success" | "error"; message?: string };
export const initialOperationActionState: OperationActionState = { status: "idle" };
