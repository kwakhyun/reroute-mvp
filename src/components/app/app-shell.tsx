import shellStyles from "@/styles/shell.module.css";
import workspaceStyles from "@/styles/workspace.module.css";
import tablesStyles from "@/styles/tables.module.css";
import formsStyles from "@/styles/forms.module.css";
import { Sidebar } from "./sidebar";

type AppShellProps = {
  defaultProject: { id: string; name: string } | null;
  user: {
    id: string;
    name: string;
    email: string;
    role: "VIEWER" | "MANAGER" | "APPROVER";
    team: string;
  };
  children: React.ReactNode;
};

export function AppShell({ defaultProject, user, children }: AppShellProps) {
  return (
    <div className={`${shellStyles.root} ${workspaceStyles.root} ${tablesStyles.root} ${formsStyles.root} app-shell`}>
      <a className="skip-link" href="#main-content">본문으로 건너뛰기</a>
      <Sidebar defaultProject={defaultProject} user={user} />
      <main className="app-content" id="main-content">
        {children}
      </main>
    </div>
  );
}
