import { useQuery } from "@tanstack/react-query";
import { Megaphone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

/**
 * TV-style rolling news banner backed by public.announcements.
 * - Public read via RLS (visible to guests, supporters, admins).
 * - Pauses on hover; respects prefers-reduced-motion.
 * - Loops seamlessly by duplicating items.
 */
export interface NewsItem {
  id: string;
  text: string;
  href?: string;
}

interface DbAnnouncement {
  id: string;
  title: string;
  link_url: string | null;
  published: boolean;
  publish_at: string;
  expires_at: string | null;
}

export function NewsTicker({ items: fallback }: { items?: NewsItem[] } = {}) {
  const { data } = useQuery({
    queryKey: ["announcements", "live"],
    queryFn: async (): Promise<NewsItem[]> => {
      const nowIso = new Date().toISOString();
      const { data, error } = await supabase
        .from("announcements")
        .select("id,title,link_url,published,publish_at,expires_at")
        .eq("published", true)
        .lte("publish_at", nowIso)
        .or(`expires_at.is.null,expires_at.gt.${nowIso}`)
        .order("publish_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data as DbAnnouncement[]).map((a) => ({
        id: a.id,
        text: a.title,
        href: a.link_url ?? undefined,
      }));
    },
    staleTime: 30_000,
  });

  const items = (data && data.length > 0 ? data : fallback) ?? [];
  if (items.length === 0) return null;
  const loop = [...items, ...items];

  return (
    <section
      aria-label="Announcements"
      className="relative flex items-stretch overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent shadow-soft"
    >
      <div className="flex shrink-0 items-center gap-2 bg-gradient-to-br from-primary to-primary/80 px-3 py-2 text-xs font-bold uppercase tracking-[0.14em] text-primary-foreground sm:px-4">
        <Megaphone className="h-4 w-4" aria-hidden />
        <span>Live</span>
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
