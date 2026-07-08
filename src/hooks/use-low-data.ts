import { useSyncExternalStore, useEffect, useState } from "react";

const KEY = "ccm.low-data.v1";
const EVENT = "ccm-low-data-changed";

function readInitial(): boolean {
  if (typeof window === "undefined") return false;
  const stored = window.localStorage.getItem(KEY);
  if (stored === "1") return true;
  if (stored === "0") return false;
  // Auto-enable on Save-Data or slow effective type.
  const conn = (navigator as unknown as { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
  if (conn?.saveData) return true;
  if (conn?.effectiveType && /(^|-)2g$/i.test(conn.effectiveType)) return true;
  return false;
}

function subscribe(cb: () => void) {
  if (typeof window === "undefined") return () => {};
  const handler = () => cb();
  window.addEventListener(EVENT, handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(EVENT, handler);
    window.removeEventListener("storage", handler);
  };
}

/**
 * Low-data mode: defers image and photo fetches on slow connections. Persists
 * per-device in localStorage; auto-detects `navigator.connection.saveData` /
 * 2g effective type on first load.
 */
export function useLowData() {
  const value = useSyncExternalStore(
    subscribe,
    () => (typeof window === "undefined" ? "0" : window.localStorage.getItem(KEY) ?? (readInitial() ? "1" : "0")),
    () => "0",
  );
  const enabled = value === "1";
  function setEnabled(next: boolean) {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(KEY, next ? "1" : "0");
    window.dispatchEvent(new Event(EVENT));
  }
  return { lowData: enabled, setLowData: setEnabled };
}

/**
 * Lightweight IntersectionObserver hook — returns true once the element has
 * scrolled into (or near) the viewport. Used together with `useLowData` to
 * defer photo requests until a card is actually visible.
 */
export function useInView<T extends Element>(rootMargin = "200px") {
  const [ref, setRef] = useState<T | null>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    if (!ref || inView) return;
    if (typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setInView(true);
            io.disconnect();
            break;
          }
        }
      },
      { rootMargin },
    );
    io.observe(ref);
    return () => io.disconnect();
  }, [ref, inView, rootMargin]);
  return { ref: setRef, inView };
}
