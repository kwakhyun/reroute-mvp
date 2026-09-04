"use client";

import {
  Briefcase,
  CaretDown,
  CircleNotch,
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
import Link, { useLinkStatus } from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { logoutAction } from "@/app/actions/auth";
import { RerouteMark } from "@/components/brand/reroute-mark";

const navigation = [
  { label: "프로젝트", segment: null, icon: Briefcase, match: "/projects$" },
  { label: "자산", segment: "assets", icon: Monitor, match: "/assets" },
  { label: "매칭", segment: "matching", icon: UsersThree, match: "/matching" },
  { label: "입찰", segment: "bids", icon: Gavel, match: "/bids" },
  { label: "수거", segment: "pickups", icon: Truck, match: "/pickups" },
  { label: "정산", segment: "settlements", icon: CurrencyKrw, match: "/settlements" },
] as const;

type SidebarProps = {
  defaultProject: { id: string; name: string } | null;
  user: { name: string; role: "VIEWER" | "MANAGER" | "APPROVER"; team: string };
};

function SidebarLinkContent({ icon, label }: { icon: React.ReactNode; label: string }) {
  const { pending } = useLinkStatus();

  return (
    <>
      <span aria-busy={pending} className={`sidebar-link-icon${pending ? " sidebar-link-icon-pending" : ""}`}>
        <span className="sidebar-link-symbol">{icon}</span>
        <CircleNotch aria-hidden="true" className="sidebar-link-spinner" size={25} weight="bold" />
      </span>
      <span>{label}</span>
      <span aria-live="polite" className="sr-only">{pending ? `${label} 화면을 불러오는 중입니다.` : ""}</span>
    </>
  );
}

export function Sidebar({ defaultProject, user }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mobile, setMobile] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const sidebarRef = useRef<HTMLElement>(null);
  const wasOpenRef = useRef(false);
  const prefetchedRoutesRef = useRef(new Set<string>());
  const matchedProjectId = pathname.match(/^\/projects\/([^/]+)/)?.[1] ?? null;
  const routeProjectId = matchedProjectId === "new" ? null : matchedProjectId;
  const projectId = routeProjectId ?? defaultProject?.id ?? null;

  const prefetchRoute = useCallback((href: string) => {
    if (href === pathname || prefetchedRoutesRef.current.has(href)) return;
    prefetchedRoutesRef.current.add(href);
    router.prefetch(href);
  }, [pathname, router]);

  useEffect(() => {
    prefetchedRoutesRef.current.clear();
  }, [pathname]);

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
        <span className="mobile-brand">
          <RerouteMark className="mobile-brand-mark" />
          <span className="mobile-wordmark">REROUTE</span>
        </span>
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
            <RerouteMark className="sidebar-brand-mark" />
            <span className="sidebar-brand-copy">
              <strong>REROUTE</strong>
              <span>풀스택 MVP</span>
            </span>
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
                <span
                  aria-disabled="true"
                  className="sidebar-link sidebar-link-disabled"
                  key={item.label}
                  title="먼저 프로젝트를 만들어 주세요."
                >
                  <Icon aria-hidden="true" size={28} weight="regular" />
                  <span>{item.label}</span>
                </span>
              );
            }
            return (
              <Link
                aria-label={item.segment && !routeProjectId && defaultProject ? `${defaultProject.name} 프로젝트의 ${item.label}` : undefined}
                aria-current={active ? "page" : undefined}
                className={`sidebar-link${active ? " sidebar-link-active" : ""}`}
                href={href}
                key={item.label}
                onClick={() => setOpen(false)}
                onFocus={() => prefetchRoute(href)}
                onPointerEnter={() => prefetchRoute(href)}
                onTouchStart={() => prefetchRoute(href)}
                prefetch={false}
              >
                <SidebarLinkContent
                  icon={<Icon aria-hidden="true" size={28} weight="regular" />}
                  label={item.label}
                />
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
