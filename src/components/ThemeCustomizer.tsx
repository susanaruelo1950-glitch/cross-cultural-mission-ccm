import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Palette, RotateCcw, Check, AlertTriangle, Wand2, Cloud, CloudOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import {
  PALETTE_PRESETS,
  FONT_PRESETS,
  PALETTE_STORAGE_KEY,
  FONT_STORAGE_KEY,
  CUSTOM_PALETTE_STORAGE_KEY,
  findPalette,
  findFont,
  applyPalette,
  applyFont,
  applyCustomPalette,
  readCustomPalette,
  writeCustomPalette,
  normalizeHex,
  isHex,
  contrastRatio,
  wcagLevel,
  suggestAccessible,
  currentThemeBackgrounds,
  type CustomPalette,
  type FontPreset,
} from "@/lib/theme-presets";

type RemoteThemePrefs = {
  palette?: string | null;
  font?: string | null;
  custom?: CustomPalette | null;
};


const DEFAULT_CUSTOM: CustomPalette = {
  primary: "#4a5d4e",
  secondary: "#c4654a",
  accent: "#e8a87c",
};

/**
 * Personalize colors + fonts. Supports curated palettes, a full hex color
 * picker with WCAG contrast checks, and 15 professional font pairs.
 */
export function ThemeCustomizer() {
  const [paletteId, setPaletteId] = useState<string | null>(null);
  const [fontId, setFontId] = useState<string | null>(null);
  const [custom, setCustom] = useState<CustomPalette | null>(null);
  const [mounted, setMounted] = useState(false);
  const [tick, setTick] = useState(0); // re-eval contrast on theme change
  const [userId, setUserId] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  // Refs used by the remote-save effect and realtime handlers.
  const skipNextRemoteSaveRef = useRef(true);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);


  useEffect(() => {
    const sp = window.localStorage.getItem(PALETTE_STORAGE_KEY);
    const sf = window.localStorage.getItem(FONT_STORAGE_KEY);
    const sc = readCustomPalette();
    setPaletteId(sp);
    setFontId(sf);
    setCustom(sc);
    // Custom takes precedence over preset.
    if (sc) applyCustomPalette(sc);
    else applyPalette(findPalette(sp));
    applyFont(findFont(sf));
    setMounted(true);

    const observer = new MutationObserver(() => {
      const cur = readCustomPalette();
      if (cur) applyCustomPalette(cur);
      else applyPalette(findPalette(window.localStorage.getItem(PALETTE_STORAGE_KEY)));
      setTick((t) => t + 1);
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    const onStorage = (e: StorageEvent) => {
      if (e.key === PALETTE_STORAGE_KEY) {
        setPaletteId(e.newValue);
        if (!readCustomPalette()) applyPalette(findPalette(e.newValue));
      }
      if (e.key === FONT_STORAGE_KEY) {
        setFontId(e.newValue);
        applyFont(findFont(e.newValue));
      }
      if (e.key === CUSTOM_PALETTE_STORAGE_KEY) {
        const next = readCustomPalette();
        setCustom(next);
        if (next) applyCustomPalette(next);
        else applyPalette(findPalette(window.localStorage.getItem(PALETTE_STORAGE_KEY)));
      }
    };
    window.addEventListener("storage", onStorage);
    return () => {
      observer.disconnect();
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  // ------------------------------------------------------------------
  // Profile sync: for signed-in users, mirror choices to profiles.theme_prefs
  // and hydrate from the profile so the same theme follows them across
  // devices and tabs. Falls back to localStorage when signed out.
  // ------------------------------------------------------------------
  const applyRemote = useCallback((prefs: RemoteThemePrefs | null | undefined) => {
    if (!prefs) return;
    skipNextRemoteSaveRef.current = true; // prevent echo-save
    if (prefs.custom && prefs.custom.primary && prefs.custom.secondary && prefs.custom.accent) {
      setCustom(prefs.custom);
      applyCustomPalette(prefs.custom);
      writeCustomPalette(prefs.custom);
      setPaletteId(prefs.palette ?? null);
      try {
        if (prefs.palette) window.localStorage.setItem(PALETTE_STORAGE_KEY, prefs.palette);
      } catch { /* ignore */ }
    } else {
      setCustom(null);
      writeCustomPalette(null);
      setPaletteId(prefs.palette ?? null);
      applyPalette(findPalette(prefs.palette ?? null));
      try {
        if (prefs.palette) window.localStorage.setItem(PALETTE_STORAGE_KEY, prefs.palette);
        else window.localStorage.removeItem(PALETTE_STORAGE_KEY);
      } catch { /* ignore */ }
    }
    setFontId(prefs.font ?? null);
    applyFont(findFont(prefs.font ?? null));
    try {
      if (prefs.font) window.localStorage.setItem(FONT_STORAGE_KEY, prefs.font);
      else window.localStorage.removeItem(FONT_STORAGE_KEY);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    let active = true;
    async function hydrate(uid: string) {
      const { data, error } = await supabase
        .from("profiles")
        .select("theme_prefs")
        .eq("id", uid)
        .maybeSingle();
      if (!active) return;
      if (error) {
        // profile row may not exist yet; leave localStorage in effect.
        return;
      }
      const prefs = (data?.theme_prefs ?? null) as RemoteThemePrefs | null;
      if (prefs) applyRemote(prefs);
      else skipNextRemoteSaveRef.current = true;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!active) return;
      const uid = session?.user?.id ?? null;
      setUserId(uid);
      if (uid) void hydrate(uid);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      const uid = session?.user?.id ?? null;
      setUserId((prev) => (prev === uid ? prev : uid));
      if (event === "SIGNED_IN" && uid) void hydrate(uid);
      if (event === "SIGNED_OUT") skipNextRemoteSaveRef.current = true;
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [applyRemote]);

  // Realtime — a profile update on another device flows in here.
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`theme-prefs:${userId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "profiles", filter: `id=eq.${userId}` },
        (payload) => {
          const next = (payload.new as { theme_prefs?: RemoteThemePrefs })?.theme_prefs ?? null;
          if (next) applyRemote(next);
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, applyRemote]);

  // Debounced save whenever local selection changes and a user is signed in.
  useEffect(() => {
    if (!mounted || !userId) return;
    if (skipNextRemoteSaveRef.current) {
      skipNextRemoteSaveRef.current = false;
      return;
    }
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    setSyncStatus("saving");
    saveTimerRef.current = setTimeout(async () => {
      const payload: RemoteThemePrefs = {
        palette: paletteId,
        font: fontId,
        custom: custom ?? null,
      };
      const { error } = await supabase
        .from("profiles")
        .update({ theme_prefs: payload })
        .eq("id", userId);
      setSyncStatus(error ? "error" : "saved");
      if (!error) setTimeout(() => setSyncStatus("idle"), 1500);
    }, 400);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [paletteId, fontId, custom, userId, mounted]);


  const choosePalette = (id: string) => {
    setPaletteId(id);
    // Selecting a preset clears any custom override so preset takes effect.
    setCustom(null);
    writeCustomPalette(null);
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

  const updateCustom = (next: CustomPalette) => {
    setCustom(next);
    applyCustomPalette(next);
    writeCustomPalette(next);
  };

  const reset = () => {
    setPaletteId(null);
    setFontId(null);
    setCustom(null);
    applyPalette(null);
    applyFont(null);
    writeCustomPalette(null);
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
        className="w-[24rem] max-w-[calc(100vw-1.5rem)] max-h-[85vh] overflow-y-auto p-4"
      >
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <h3 className="font-display text-base font-semibold">Personalize</h3>
            <p className="truncate text-xs text-muted-foreground">
              {userId
                ? "Synced to your profile — follows you on every device."
                : "Sign in to sync across devices."}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <SyncPill userId={userId} status={syncStatus} />
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
        </div>


        <Tabs defaultValue={custom ? "custom" : "palettes"}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="palettes">Palettes</TabsTrigger>
            <TabsTrigger value="custom">Custom</TabsTrigger>
            <TabsTrigger value="fonts">Fonts</TabsTrigger>
          </TabsList>

          {/* ----------------------------------------------------------- */}
          <TabsContent value="palettes" className="mt-3">
            <div className="grid grid-cols-2 gap-2">
              {PALETTE_PRESETS.map((p) => {
                const active = mounted && !custom && paletteId === p.id;
                const isDefault =
                  !mounted || (paletteId === null && !custom && p.id === "mission-warm");
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => choosePalette(p.id)}
                    aria-pressed={active}
                    className={`relative flex flex-col gap-1.5 rounded-lg border p-2 text-left transition-colors hover:bg-accent ${
                      active || isDefault
                        ? "border-primary ring-1 ring-primary"
                        : "border-border"
                    }`}
                  >
                    <div className="flex h-6 overflow-hidden rounded-md">
                      {p.swatches.map((c, i) => (
                        <span key={i} className="flex-1" style={{ backgroundColor: c }} />
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
          </TabsContent>

          {/* ----------------------------------------------------------- */}
          <TabsContent value="custom" className="mt-3 space-y-3">
            <CustomPicker
              value={custom ?? DEFAULT_CUSTOM}
              onChange={updateCustom}
              onClear={() => {
                setCustom(null);
                writeCustomPalette(null);
                applyPalette(findPalette(paletteId));
              }}
              hasCustom={!!custom}
              tick={tick}
            />
          </TabsContent>

          {/* ----------------------------------------------------------- */}
          <TabsContent value="fonts" className="mt-3">
            <FontPicker fonts={FONT_PRESETS} activeId={mounted ? fontId : null} onChoose={chooseFont} />
          </TabsContent>
        </Tabs>
      </PopoverContent>
    </Popover>
  );
}

// ---------------------------------------------------------------------------
// Custom hex color picker w/ WCAG contrast checks
// ---------------------------------------------------------------------------
function CustomPicker({
  value,
  onChange,
  onClear,
  hasCustom,
  tick,
}: {
  value: CustomPalette;
  onChange: (next: CustomPalette) => void;
  onClear: () => void;
  hasCustom: boolean;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  tick: number;
}) {
  const setKey = (k: keyof CustomPalette, hex: string) => {
    const n = normalizeHex(hex);
    if (!n) return;
    onChange({ ...value, [k]: n });
  };

  const bg = useMemo(() => currentThemeBackgrounds(), [tick]);
  const checks = [
    { label: "Primary button", fg: pickReadable(value.primary), bg: value.primary, sourceKey: "primary" as const },
    { label: "Secondary button", fg: pickReadable(value.secondary), bg: value.secondary, sourceKey: "secondary" as const },
    { label: "Accent chip", fg: pickReadable(value.accent), bg: value.accent, sourceKey: "accent" as const },
    { label: "Primary link on page", fg: value.primary, bg: bg.bg, sourceKey: "primary" as const },
    { label: "Secondary link on page", fg: value.secondary, bg: bg.bg, sourceKey: "secondary" as const },
  ];

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Pick any hex color. Foregrounds and rings auto-adjust; accessibility
        checks below warn on low contrast and suggest safer shades.
      </p>

      {(["primary", "secondary", "accent"] as const).map((k) => (
        <ColorRow key={k} label={cap(k)} hex={value[k]} onChange={(v) => setKey(k, v)} />
      ))}

      <div className="rounded-lg border border-border bg-card p-2.5">
        <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
          Contrast checks (WCAG AA)
        </div>
        <div className="space-y-1.5">
          {checks.map((c) => {
            const ratio = contrastRatio(c.fg, c.bg);
            const level = wcagLevel(ratio, false);
            const passes = level !== "Fail";
            const suggestion = passes ? null : suggestAccessible(c.bg, c.bg === value.primary || c.bg === value.secondary || c.bg === value.accent ? c.bg : bg.bg, 4.5);
            return (
              <div key={c.label} className="flex items-center justify-between gap-2 text-[11px]">
                <div className="flex min-w-0 items-center gap-2">
                  <span
                    className="inline-flex h-6 min-w-[52px] items-center justify-center rounded px-1.5 font-medium"
                    style={{ backgroundColor: c.bg, color: c.fg }}
                  >
                    Aa
                  </span>
                  <span className="truncate">{c.label}</span>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <span
                    className={`rounded px-1.5 py-0.5 font-mono text-[10px] ${
                      passes
                        ? "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200"
                        : "bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-200"
                    }`}
                  >
                    {ratio.toFixed(2)}:1 {level}
                  </span>
                  {!passes && suggestion && (
                    <button
                      type="button"
                      title={`Use ${suggestion}`}
                      onClick={() => {
                        // Adjust the source key that failed against the page bg.
                        const suggested = suggestAccessible(value[c.sourceKey], bg.bg, 4.5);
                        onChange({ ...value, [c.sourceKey]: suggested });
                      }}
                      className="inline-flex items-center gap-1 rounded border border-border bg-background px-1.5 py-0.5 text-[10px] hover:bg-accent"
                    >
                      <Wand2 className="h-3 w-3" aria-hidden />
                      Fix
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex items-center justify-between gap-2">
        <div className="text-[11px] text-muted-foreground">
          {hasCustom ? "Custom colors active." : "Preview only — click Apply to save."}
        </div>
        <div className="flex gap-2">
          {hasCustom && (
            <Button variant="ghost" size="sm" onClick={onClear} className="h-8 text-xs">
              Clear custom
            </Button>
          )}
          <Button
            size="sm"
            onClick={() => onChange(value)}
            className="h-8 text-xs"
          >
            Apply everywhere
          </Button>
        </div>
      </div>
    </div>
  );
}

function ColorRow({
  label,
  hex,
  onChange,
}: {
  label: string;
  hex: string;
  onChange: (hex: string) => void;
}) {
  const [text, setText] = useState(hex);
  useEffect(() => setText(hex), [hex]);
  return (
    <div className="flex items-center gap-2">
      <label className="w-20 text-xs font-medium">{label}</label>
      <input
        type="color"
        value={hex}
        onChange={(e) => onChange(e.target.value)}
        aria-label={`${label} color`}
        className="h-9 w-9 shrink-0 cursor-pointer rounded-md border border-border bg-transparent p-0.5"
      />
      <Input
        value={text}
        onChange={(e) => {
          const v = e.target.value;
          setText(v);
          if (isHex(normalizeHex(v) ?? "")) onChange(normalizeHex(v)!);
        }}
        placeholder="#RRGGBB"
        className="h-9 flex-1 font-mono text-xs"
        maxLength={7}
      />
    </div>
  );
}

function pickReadable(hex: string): string {
  // Same logic as pickForeground but inlined to avoid an extra import path.
  const white = contrastRatio(hex, "#ffffff");
  const black = contrastRatio(hex, "#111111");
  return white >= black ? "#ffffff" : "#111111";
}

function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ---------------------------------------------------------------------------
// Fonts (grouped by category)
// ---------------------------------------------------------------------------
function FontPicker({
  fonts,
  activeId,
  onChoose,
}: {
  fonts: FontPreset[];
  activeId: string | null;
  onChoose: (id: string) => void;
}) {
  const groups = useMemo(() => {
    const map = new Map<string, FontPreset[]>();
    fonts.forEach((f) => {
      const list = map.get(f.category) ?? [];
      list.push(f);
      map.set(f.category, list);
    });
    return Array.from(map.entries());
  }, [fonts]);

  return (
    <div className="space-y-3">
      {groups.map(([cat, list]) => (
        <div key={cat}>
          <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            {cat}
          </div>
          <div className="space-y-1.5">
            {list.map((f) => {
              const active = activeId === f.id || (activeId === null && f.id === "playfair-inter");
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => onChoose(f.id)}
                  aria-pressed={active}
                  className={`flex w-full items-center justify-between gap-3 rounded-lg border p-2.5 text-left transition-colors hover:bg-accent ${
                    active ? "border-primary ring-1 ring-primary" : "border-border"
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
        </div>
      ))}
    </div>
  );
}

function SyncPill({
  userId,
  status,
}: {
  userId: string | null;
  status: "idle" | "saving" | "saved" | "error";
}) {
  if (!userId) {
    return (
      <span
        title="Signed out — using this device only"
        className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/40 px-2 py-0.5 text-[10px] text-muted-foreground"
      >
        <CloudOff className="h-3 w-3" aria-hidden />
        Local
      </span>
    );
  }
  const label =
    status === "saving" ? "Saving…" : status === "error" ? "Retry" : status === "saved" ? "Synced" : "Synced";
  const tone =
    status === "error"
      ? "border-red-300 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300"
      : "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300";
  return (
    <span
      title={status === "error" ? "Sync failed — will retry on next change" : "Saved to your profile"}
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] ${tone}`}
    >
      <Cloud className="h-3 w-3" aria-hidden />
      {label}
    </span>
  );
}
