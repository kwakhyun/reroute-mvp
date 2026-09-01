"use client";

import {
  Briefcase,
  CaretDown,
  CurrencyKrw,
  Gavel,
  ListChecks,
  Monitor,
  SignOut,
  Truck,
  UserCircle,
  UsersThree,
  X,
} from "@phosphor-icons/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { logoutAction } from "@/app/actions/auth";

const navigation = [
  { label: "프로젝트", segment: null, icon: Briefcase, match: "/projects$" },
  { label: "자산", segment: "assets", icon: Monitor, match: "/assets" },
  { label: "매칭", segment: "matching", icon: UsersThree, match: "/matching" },
  { label: "입찰", segment: "bids", icon: Gavel, match: "/bids" },
  { label: "수거", segment: "pickups", icon: Truck, match: "/pickups" },
  { label: "정산", segment: "settlements", icon: CurrencyKrw, match: "/settlements" },
] as const;

type SidebarProps = {
  user: { name: string; role: "VIEWER" | "MANAGER" | "APPROVER"; team: string };
};

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [mobile, setMobile] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const sidebarRef = useRef<HTMLElement>(null);
  const wasOpenRef = useRef(false);
  const matchedProjectId = pathname.match(/^\/projects\/([^/]+)/)?.[1] ?? null;
  const projectId = matchedProjectId === "new" ? null : matchedProjectId;

  useEffect(() => {
    const query = window.matchMedia("(max-width: 900px)");
    const sync = () => setMobile(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (!mobile) return;
    if (open) {
      wasOpenRef.current = true;
      closeButtonRef.current?.focus();
      return;
    }
    if (wasOpenRef.current) {
      menuButtonRef.current?.focus();
      wasOpenRef.current = false;
    }
  }, [mobile, open]);

  useEffect(() => {
    if (!mobile || !open) return;
    const backgroundElements = [
      document.getElementById("main-content"),
      document.querySelector<HTMLElement>(".mobile-app-bar"),
      document.querySelector<HTMLElement>(".skip-link"),
    ].filter((element): element is HTMLElement => Boolean(element));
    for (const element of backgroundElements) {
      element.inert = true;
      element.setAttribute("aria-hidden", "true");
    }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const keepFocusInside = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = [...(sidebarRef.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), summary, input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ) ?? [])].filter((element) => !element.inert && element.getAttribute("aria-hidden") !== "true");
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && (document.activeElement === first || !sidebarRef.current?.contains(document.activeElement))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !sidebarRef.current?.contains(document.activeElement))) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", keepFocusInside);
    return () => {
      document.removeEventListener("keydown", keepFocusInside);
      for (const element of backgroundElements) {
        element.inert = false;
        element.removeAttribute("aria-hidden");
      }
      document.body.style.overflow = previousOverflow;
    };
  }, [mobile, open]);

  return (
    <>
      <div className="mobile-app-bar">
        <button aria-controls="primary-sidebar" aria-expanded={open} aria-label="메뉴 열기" className="mobile-menu-button" onClick={() => setOpen(true)} ref={menuButtonRef} type="button">
          <ListChecks aria-hidden="true" size={24} />
        </button>
        <span className="mobile-wordmark">REROUTE</span>
      </div>
      {open ? <button aria-hidden="true" className="sidebar-scrim" onClick={() => setOpen(false)} tabIndex={-1} type="button" /> : null}
      <aside
        aria-hidden={mobile && !open ? true : undefined}
        aria-label="주요 메뉴"
        aria-modal={mobile && open ? true : undefined}
        className={`sidebar${open ? " sidebar-open" : ""}`}
        id="primary-sidebar"
        inert={mobile && !open}
        ref={sidebarRef}
        role={mobile && open ? "dialog" : undefined}
      >
        <div className="sidebar-brand">
          <Link href="/projects" onClick={() => setOpen(false)}>
            <strong>REROUTE</strong>
            <span>PORTFOLIO CONCEPT</span>
          </Link>
          <button aria-label="메뉴 닫기" className="sidebar-close" onClick={() => setOpen(false)} ref={closeButtonRef} type="button">
            <X aria-hidden="true" size={22} />
          </button>
        </div>

        <nav className="sidebar-nav">
          {navigation.map((item) => {
            const href = item.segment && projectId ? `/projects/${projectId}/${item.segment}` : "/projects";
            const active = item.match.endsWith("$") ? pathname === "/projects" : pathname.endsWith(item.match);
            const Icon = item.icon;
            if (item.segment && !projectId) {
              return (
                <span aria-disabled="true" className="sidebar-link sidebar-link-disabled" key={item.label}>
                  <Icon aria-hidden="true" size={28} weight="regular" />
                  <span>{item.label}</span>
                </span>
              );
            }
            return (
              <Link
                aria-current={active ? "page" : undefined}
                className={`sidebar-link${active ? " sidebar-link-active" : ""}`}
                href={href}
                key={item.label}
                onClick={() => setOpen(false)}
              >
                <Icon aria-hidden="true" size={28} weight="regular" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="sidebar-account">
          <UserCircle aria-hidden="true" size={42} weight="thin" />
          <div>
            <strong>{user.name}</strong>
            <span>{user.team}</span>
          </div>
          <details className="account-menu">
            <summary aria-label="계정 메뉴 열기">
              <CaretDown aria-hidden="true" size={16} />
            </summary>
            <div className="account-popover">
              <span>권한은 프로젝트 조직별로 적용됩니다.</span>
              <form action={logoutAction}>
                <button type="submit">
                  <SignOut aria-hidden="true" size={18} />
                  로그아웃
                </button>
              </form>
            </div>
          </details>
        </div>
      </aside>
    </>
  );
}
