import { useEffect, useState } from "react";
import { Contrast } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Toggles a `data-contrast="high"` attribute on <html>. CSS overrides in
 * src/styles.css bump text/border contrast, thicken focus rings, and remove
 * low-contrast surfaces. State persists in localStorage and syncs across tabs.
 */
const STORAGE_KEY = "ccm-contrast";

function apply(hc: boolean) {
  document.documentElement.setAttribute("data-contrast", hc ? "high" : "normal");
}

export function HighContrastToggle() {
  const [hc, setHc] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY) === "high";
    setHc(stored);
    apply(stored);
    setMounted(true);
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        const next = e.newValue === "high";
        setHc(next);
        apply(next);
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const toggle = () => {
    const next = !hc;
    setHc(next);
    apply(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next ? "high" : "normal");
    } catch {
      /* ignore */
    }
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggle}
      aria-label={hc ? "Disable high contrast" : "Enable high contrast"}
      aria-pressed={hc}
      title={hc ? "High contrast: on" : "High contrast: off"}
      className="min-h-11 min-w-11 rounded-full focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
    >
      <Contrast className={`h-5 w-5 ${mounted && hc ? "text-primary" : ""}`} aria-hidden />
    </Button>
  );
}
