import { useEffect } from "react";

/**
 * Re-scrolls to `location.hash` whenever the given dependency changes
 * (e.g. once async data loads and the anchor element mounts).
 * Browsers only auto-scroll once on load; if the anchor renders later,
 * the scroll never happens without this.
 */
export function useHashScroll(dep: unknown) {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = window.location.hash.replace(/^#/, "");
    if (!hash) return;
    // Give the DOM a tick to paint the newly-rendered anchor.
    const t = window.setTimeout(() => {
      const el = document.getElementById(hash);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
    return () => window.clearTimeout(t);
  }, [dep]);
}
