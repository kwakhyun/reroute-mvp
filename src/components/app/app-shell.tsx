import { Sidebar } from "./sidebar";

type AppShellProps = {
  user: {
    id: string;
    name: string;
    email: string;
    role: "VIEWER" | "MANAGER" | "APPROVER";
    team: string;
  };
  children: React.ReactNode;
};

export function AppShell({ user, children }: AppShellProps) {
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">본문으로 건너뛰기</a>
      <Sidebar user={user} />
      <main className="app-content" id="main-content">
        {children}
      </main>
    </div>
  );
}
