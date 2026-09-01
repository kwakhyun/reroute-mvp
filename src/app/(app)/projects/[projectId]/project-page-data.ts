import { notFound } from "next/navigation";
import { AuthorizationError } from "@/server/auth/errors";

export async function projectPageData<T>(request: Promise<T>) {
  try {
    return await request;
  } catch (error) {
    if (error instanceof AuthorizationError) notFound();
    throw error;
  }
}
