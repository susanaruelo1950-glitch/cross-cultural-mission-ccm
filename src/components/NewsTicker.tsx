import { Megaphone } from "lucide-react";

/**
 * TV-style rolling news banner for site-wide announcements. Pauses on hover,
 * respects prefers-reduced-motion. Duplicate the items so the loop is seamless.
 */
export interface NewsItem {
  id: string;
  text: string;
  href?: string;
}

export function NewsTicker({ items }: { items: NewsItem[] }) {
  if (items.length === 0) return null;
  const loop = [...items, ...items];
  return (
    <section
      aria-label="Announcements"
      className="relative flex items-stretch overflow-hidden rounded-2xl border border-primary/30 bg-primary/5 shadow-soft"
    >
      <div className="flex shrink-0 items-center gap-2 bg-primary px-3 py-2 text-xs font-bold uppercase tracking-wide text-primary-foreground sm:px-4">
        <Megaphone className="h-4 w-4" aria-hidden />
        <span>News</span>
      </div>
      <div className="relative flex-1 overflow-hidden">
        <div
          className="marquee-track flex min-w-max items-center gap-10 py-2 pl-6 text-sm font-medium text-foreground/90"
          role="marquee"
          aria-live="off"
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
        {/* Gradient fade edges */}
        <div className="pointer-events-none absolute inset-y-0 left-0 w-6 bg-gradient-to-r from-primary/5 to-transparent" aria-hidden />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-6 bg-gradient-to-l from-primary/5 to-transparent" aria-hidden />
      </div>
    </section>
  );
}
