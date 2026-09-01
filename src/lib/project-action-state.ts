export type ProjectActionState = { status: "idle" | "error"; message?: string };
export const initialProjectActionState: ProjectActionState = { status: "idle" };
