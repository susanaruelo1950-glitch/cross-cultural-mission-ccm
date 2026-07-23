import { useEffect, useState } from "react";

/**
 * Shared, cross-route hide-on-scroll state.
 *
 * The value is kept in a module-level store so every consumer of
 * `useHideOnScroll` sees the same collapsed/expanded state as the user
 * navigates between routes — the header doesn't "pop back" open on every
 * page transition.
 *
 * Scroll handling is rAF-throttled with a small delta threshold and a
 * short idle debounce so it stays smooth on low-end phones (one state
 * update per animation frame at most, and no updates for micro-scrolls).
 */

let hidden = false;
const listeners = new Set<(v: boolean) => void>();

function setHidden(next: boolean) {
  if (next === hidden) return;
  hidden = next;
  listeners.forEach((l) => l(hidden));
}

let installed = false;
let installedThreshold = 80;

function install(threshold: number) {
  if (installed || typeof window === "undefined") return;
  installed = true;
  installedThreshold = threshold;

  let lastY = window.scrollY;
  let ticking = false;
  let idleTimer: ReturnType<typeof setTimeout> | null = null;

  const compute = () => {
    const y = window.scrollY;
    const delta = y - lastY;
    if (y < installedThreshold) {
      setHidden(false);
    } else if (delta > 6) {
      setHidden(true);
    } else if (delta < -6) {
      setHidden(false);
    }
    lastY = y;
    ticking = false;
  };

  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(compute);
    // Debounced idle re-check: if the user stops mid-scroll near the top,
    // make sure we settle to the correct state without extra work.
    if (idleTimer) clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
      if (window.scrollY < installedThreshold) setHidden(false);
    }, 150);
  };

  window.addEventListener("scroll", onScroll, { passive: true });
}

export function useHideOnScroll(threshold = 80) {
  const [value, setValue] = useState(hidden);

  useEffect(() => {
    install(threshold);
    // Allow later callers to tighten the threshold, but keep the smallest
    // one so the header reappears reliably near the top.
    installedThreshold = Math.min(installedThreshold, threshold);
    listeners.add(setValue);
    setValue(hidden);
    return () => {
      listeners.delete(setValue);
    };
  }, [threshold]);

  return value;
}
