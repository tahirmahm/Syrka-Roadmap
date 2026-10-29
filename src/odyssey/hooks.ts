"use client";
import { useSyncExternalStore } from "react";
const subscribe = (callback: () => void) => {
  const query = window.matchMedia("(max-width:767px)");
  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
};
export function useMobile() {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia("(max-width:767px)").matches,
    () => false,
  );
}
export function trapFocus(event: React.KeyboardEvent<HTMLElement>) {
  if (event.key !== "Tab") return;
  const items = Array.from(
    event.currentTarget.querySelectorAll<HTMLElement>(
      "button:not([disabled]),a[href],input:not([disabled]),select,textarea",
    ),
  ).filter((x) => x.getClientRects().length > 0);
  if (
    event.shiftKey &&
    (document.activeElement === items[0] ||
      document.activeElement === event.currentTarget)
  ) {
    event.preventDefault();
    items.at(-1)?.focus();
  } else if (!event.shiftKey && document.activeElement === items.at(-1)) {
    event.preventDefault();
    items[0]?.focus();
  }
}
