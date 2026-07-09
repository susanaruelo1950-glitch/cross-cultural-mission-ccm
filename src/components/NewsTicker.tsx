import { useMemo, useSyncExternalStore } from "react";
import { useQuery } from "@tanstack/react-query";
import { Megaphone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

/**
 * TV-style rolling news banner backed by public.announcements.
 * - Public read via RLS (visible to guests, supporters, admins).
 * - Announcements are grouped by `layer` so admins can publish tiered
 *   headlines (primary, events, prayer, ...). The dashboard renders one
 *   scrolling row per selected layer; viewers can hide layers locally.
 */
export interface NewsItem {
  id: string;
  text: string;
  href?: string;
  layer?: string;
}

interface DbAnnouncement {
  id: string;
  title: string;
  link_url: string | null;
  published: boolean;
  publish_at: string;
  expires_at: string | null;
  layer: string;
}

const HIDDEN_KEY = "ccm.newsTicker.hiddenLayers.v1";
const HIDDEN_EVENT = "ccm-newsticker-hidden-changed";

function readHidden(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(HIDDEN_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as string[]);
  } catch { return new Set(); }
}
function writeHidden(set: Set<string>) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(HIDDEN_KEY, JSON.stringify([...set]));
  window.dispatchEvent(new CustomEvent(HIDDEN_EVENT));
}

function useHiddenLayers() {
  const value = useSyncExternalStore(
    (cb) => {
      if (typeof window === "undefined") return () => {};
      window.addEventListener(HIDDEN_EVENT, cb);
      window.addEventListener("storage", cb);
      return () => {
        window.removeEventListener(HIDDEN_EVENT, cb);
        window.removeEventListener("storage", cb);
      };
    },
    () => (typeof window === "undefined" ? "" : window.localStorage.getItem(HIDDEN_KEY) ?? ""),
    () => "",
  );
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  void value;
  return {
    hidden: readHidden(),
    toggle: (layer: string) => {
      const next = readHidden();
      if (next.has(layer)) next.delete(layer);
      else next.add(layer);
      writeHidden(next);
    },
  };
}

/** One horizontally scrolling row of items. */
function TickerRow({ items, layerLabel }: { items: NewsItem[]; layerLabel?: string }) {
  const loop = [...items, ...items];
  return (
    <section
      aria-label={layerLabel ? `Announcements — ${layerLabel}` : "Announcements"}
      className="relative flex items-stretch overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent shadow-soft"
    >
      <div className="flex shrink-0 items-center gap-2 bg-gradient-to-br from-primary to-primary/80 px-3 py-2 text-xs font-bold uppercase tracking-[0.14em] text-primary-foreground sm:px-4">
        <Megaphone className="h-4 w-4" aria-hidden />
        <span>{layerLabel ?? "Live"}</span>
      </div>
      <div className="relative flex-1 overflow-hidden">
        <div
          className="marquee-track flex min-w-max items-center gap-10 py-2.5 pl-6 font-display text-sm font-semibold tracking-tight text-foreground/90 sm:text-base"
          role="marquee"
          aria-live="off"
          dir="ltr"
        >
          {loop.map((item, i) => (
            <span key={`${item.id}-${i}`} className="inline-flex items-center gap-2 whitespace-nowrap">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden />
              {item.href ? (
                <a href={item.href} className="hover:underline">{item.text}</a>
              ) : (
                item.text
              )}
            </span>
          ))}
        </div>
        <div className="pointer-events-none absolute inset-y-0 left-0 w-6 bg-gradient-to-r from-primary/10 to-transparent" aria-hidden />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-6 bg-gradient-to-l from-primary/10 to-transparent" aria-hidden />
      </div>
    </section>
  );
}

export function NewsTicker({
  items: fallback,
  layer,
  showLayerToggle = true,
}: {
  items?: NewsItem[];
  /** Only show announcements from this layer. Omit to show every published layer, each as its own row. */
  layer?: string;
  /** Render small pill toggles above the ticker to hide individual layers. */
  showLayerToggle?: boolean;
} = {}) {
  const { data } = useQuery({
    queryKey: ["announcements", "live", layer ?? "__all__"],
    queryFn: async (): Promise<NewsItem[]> => {
      const nowIso = new Date().toISOString();
      let q = supabase
        .from("announcements")
        .select("id,title,link_url,published,publish_at,expires_at,layer")
        .eq("published", true)
        .lte("publish_at", nowIso)
        .or(`expires_at.is.null,expires_at.gt.${nowIso}`)
        .order("publish_at", { ascending: false })
        .limit(60);
      if (layer) q = q.eq("layer", layer);
      const { data, error } = await q;
      if (error) throw error;
      return (data as DbAnnouncement[]).map((a) => ({
        id: a.id, text: a.title, href: a.link_url ?? undefined, layer: a.layer,
      }));
    },
    staleTime: 30_000,
  });

  const items = (data && data.length > 0 ? data : fallback) ?? [];
  const { hidden, toggle } = useHiddenLayers();

  // Group by layer to render one row per tier.
  const grouped = useMemo(() => {
    const m = new Map<string, NewsItem[]>();
    for (const it of items) {
      const l = it.layer ?? "primary";
      if (!m.has(l)) m.set(l, []);
      m.get(l)!.push(it);
    }
    return [...m.entries()].sort(([a], [b]) => (a === "primary" ? -1 : b === "primary" ? 1 : a.localeCompare(b)));
  }, [items]);

  if (grouped.length === 0) return null;

  // Preview mode: single-row fallback (no grouping / toggles).
  if (fallback && !data) {
    return <TickerRow items={items} />;
  }

  const visible = grouped.filter(([l]) => !hidden.has(l));

  return (
    <div className="space-y-2">
      {visible.map(([l, list]) => (
        <TickerRow key={l} items={list} layerLabel={l === "primary" ? "Live" : l} />
      ))}
      {showLayerToggle && grouped.length > 1 ? (
        <div className="flex flex-wrap gap-1.5 pl-1 text-[11px]">
          <span className="text-muted-foreground">Layers:</span>
          {grouped.map(([l]) => {
            const on = !hidden.has(l);
            return (
              <button
                key={l}
                type="button"
                onClick={() => toggle(l)}
                className={`rounded-full border px-2 py-0.5 font-medium capitalize transition ${
                  on
                    ? "border-primary/50 bg-primary/10 text-primary"
                    : "border-border bg-muted text-muted-foreground line-through"
                }`}
                aria-pressed={on}
              >
                {l === "primary" ? "Live" : l}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
