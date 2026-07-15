import { useEffect, useState } from "react";
import { Palette, RotateCcw, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  PALETTE_PRESETS,
  FONT_PRESETS,
  PALETTE_STORAGE_KEY,
  FONT_STORAGE_KEY,
  findPalette,
  findFont,
  applyPalette,
  applyFont,
} from "@/lib/theme-presets";

/**
 * Lets any user pick a color palette + font pair. Choices persist in
 * localStorage and are re-applied on every route/tab (see anti-FOUC script
 * in `src/routes/__root.tsx`), so the entire app instantly reflects them.
 */
export function ThemeCustomizer() {
  const [paletteId, setPaletteId] = useState<string | null>(null);
  const [fontId, setFontId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const savedPalette = window.localStorage.getItem(PALETTE_STORAGE_KEY);
    const savedFont = window.localStorage.getItem(FONT_STORAGE_KEY);
    setPaletteId(savedPalette);
    setFontId(savedFont);
    applyPalette(findPalette(savedPalette));
    applyFont(findFont(savedFont));
    setMounted(true);

    // Re-apply palette on dark/light toggle (variables differ per mode).
    const observer = new MutationObserver(() => {
      const currentPalette = window.localStorage.getItem(PALETTE_STORAGE_KEY);
      applyPalette(findPalette(currentPalette));
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    // Sync across tabs.
    const onStorage = (e: StorageEvent) => {
      if (e.key === PALETTE_STORAGE_KEY) {
        setPaletteId(e.newValue);
        applyPalette(findPalette(e.newValue));
      }
      if (e.key === FONT_STORAGE_KEY) {
        setFontId(e.newValue);
        applyFont(findFont(e.newValue));
      }
    };
    window.addEventListener("storage", onStorage);
    return () => {
      observer.disconnect();
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const choosePalette = (id: string) => {
    setPaletteId(id);
    applyPalette(findPalette(id));
    try {
      window.localStorage.setItem(PALETTE_STORAGE_KEY, id);
    } catch {
      /* ignore */
    }
  };

  const chooseFont = (id: string) => {
    setFontId(id);
    applyFont(findFont(id));
    try {
      window.localStorage.setItem(FONT_STORAGE_KEY, id);
    } catch {
      /* ignore */
    }
  };

  const reset = () => {
    setPaletteId(null);
    setFontId(null);
    applyPalette(null);
    applyFont(null);
    try {
      window.localStorage.removeItem(PALETTE_STORAGE_KEY);
      window.localStorage.removeItem(FONT_STORAGE_KEY);
    } catch {
      /* ignore */
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Customize colors and fonts"
          title="Customize theme"
          className="rounded-full"
        >
          <Palette className="h-5 w-5" aria-hidden />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-[22rem] max-w-[calc(100vw-1.5rem)] max-h-[80vh] overflow-y-auto p-4"
      >
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h3 className="font-display text-base font-semibold">Personalize</h3>
            <p className="text-xs text-muted-foreground">
              Pick colors and fonts. Applies everywhere.
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={reset}
            className="h-8 gap-1 text-xs"
            title="Reset to defaults"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden />
            Reset
          </Button>
        </div>

        <section className="mb-4">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Color palette
          </div>
          <div className="grid grid-cols-2 gap-2">
            {PALETTE_PRESETS.map((p) => {
              const active = mounted && paletteId === p.id;
              const isDefault = !mounted || (paletteId === null && p.id === "mission-warm");
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => choosePalette(p.id)}
                  aria-pressed={active}
                  className={`relative flex flex-col gap-1.5 rounded-lg border p-2 text-left transition-colors hover:bg-accent ${
                    active || isDefault ? "border-primary ring-1 ring-primary" : "border-border"
                  }`}
                >
                  <div className="flex h-6 overflow-hidden rounded-md">
                    {p.swatches.map((c, i) => (
                      <span
                        key={i}
                        className="flex-1"
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                  <div className="text-xs font-medium leading-tight">{p.name}</div>
                  <div className="text-[10px] leading-tight text-muted-foreground">
                    {p.description}
                  </div>
                  {active && (
                    <Check
                      className="absolute right-1.5 top-1.5 h-3.5 w-3.5 text-primary"
                      aria-hidden
                    />
                  )}
                </button>
              );
            })}
          </div>
        </section>

        <section>
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Typography
          </div>
          <div className="space-y-1.5">
            {FONT_PRESETS.map((f) => {
              const active = mounted && fontId === f.id;
              const isDefault = !mounted || (fontId === null && f.id === "playfair-inter");
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => chooseFont(f.id)}
                  aria-pressed={active}
                  className={`flex w-full items-center justify-between gap-3 rounded-lg border p-2.5 text-left transition-colors hover:bg-accent ${
                    active || isDefault ? "border-primary ring-1 ring-primary" : "border-border"
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div
                      className="truncate text-base font-semibold leading-tight"
                      style={{ fontFamily: `"${f.displayName}", serif` }}
                    >
                      {f.displayName}
                    </div>
                    <div
                      className="truncate text-xs text-muted-foreground"
                      style={{ fontFamily: `"${f.sansName}", sans-serif` }}
                    >
                      Body — {f.sansName}
                    </div>
                  </div>
                  {active && <Check className="h-4 w-4 text-primary" aria-hidden />}
                </button>
              );
            })}
          </div>
        </section>
      </PopoverContent>
    </Popover>
  );
}
