import { redirect } from "next/navigation";
import { AppShell } from "@/components/app/app-shell";
import { getCurrentUser } from "@/server/auth/session";
import { getDefaultProjectNavigation } from "@/server/services/dashboard";

export default async function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const defaultProject = await getDefaultProjectNavigation();

  return <AppShell defaultProject={defaultProject} user={user}>{children}</AppShell>;
}
