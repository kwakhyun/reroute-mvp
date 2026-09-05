"use client";

import { useEffect, useRef, useState } from "react";

export function TableScroll({ label, children }: { label: string; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [overflow, setOverflow] = useState(false);
  useEffect(() => {
    const region = ref.current;
    if (!region) return;
    const update = () => setOverflow(region.scrollWidth > region.clientWidth + 1);
    const observer = new ResizeObserver(update);
    observer.observe(region);
    if (region.firstElementChild) observer.observe(region.firstElementChild);
    update();
    return () => observer.disconnect();
  }, []);

  return <>
    {overflow ? <p className="table-scroll-hint">표를 좌우로 스크롤해 전체 항목을 확인하세요.</p> : null}
    <div ref={ref} aria-label={label} className="table-scroll" role="region" tabIndex={overflow ? 0 : undefined}>
      {children}
    </div>
  </>;
}
