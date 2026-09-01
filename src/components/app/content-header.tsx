import Link from "next/link";

type ContentHeaderProps = {
  eyebrow: string;
  title: string;
  description: string;
  backHref?: string;
  action?: React.ReactNode;
};

export function ContentHeader({ eyebrow, title, description, backHref, action }: ContentHeaderProps) {
  return (
    <header className="content-header">
      <div>
        <span className="eyebrow">
          {backHref ? <Link href={backHref}>{eyebrow}</Link> : eyebrow}
        </span>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action ? <div className="content-header-action">{action}</div> : null}
    </header>
  );
}
