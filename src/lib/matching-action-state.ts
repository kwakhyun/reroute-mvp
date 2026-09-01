export type MatchingActionState = {
  status: "idle" | "success" | "error";
  message?: string;
};

export const initialMatchingActionState: MatchingActionState = { status: "idle" };
