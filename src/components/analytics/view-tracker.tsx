"use client";

import { useEffect } from "react";

type EventName = "dashboard_viewed" | "bids_opened" | "recalculation_opened" | "confirmation_opened";

export function trackEvent(name: EventName, projectId: string, properties: Record<string, string | number | boolean | null> = {}) {
  void fetch("/api/analytics/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, projectId, properties }),
    keepalive: true,
  });
}

export function ViewTracker({ projectId, event = "dashboard_viewed" }: { projectId: string; event?: EventName }) {
  useEffect(() => {
    trackEvent(event, projectId);
  }, [event, projectId]);
  return null;
}
