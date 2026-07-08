import { useQuery } from "@tanstack/react-query";
import { BookOpen } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Verse {
  reference: string;
  text: string;
}

const FALLBACK: Verse[] = [
  { reference: "Matthew 28:19", text: "Therefore go and make disciples of all nations." },
  { reference: "Isaiah 6:8", text: "Here am I. Send me!" },
  { reference: "Acts 1:8", text: "You will be my witnesses… to the ends of the earth." },
  { reference: "Mark 16:15", text: "Go into all the world and preach the gospel to all creation." },
];

function dayOfYear(d: Date) {
  const start = Date.UTC(d.getUTCFullYear(), 0, 0);
  return Math.floor((d.getTime() - start) / 86400000);
}

/**
 * Rotating Scripture of the Day. Reads from `public.scriptures` (admin-managed)
 * with a bundled fallback so the header never blanks.
 */
export function ScriptureOfTheDay({ compact = false }: { compact?: boolean }) {
  const { data } = useQuery({
    queryKey: ["scriptures", "active"],
    queryFn: async (): Promise<Verse[]> => {
      const { data, error } = await supabase
        .from("scriptures")
        .select("reference, text")
        .eq("active", true)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });
      if (error || !data || data.length === 0) return FALLBACK;
      return data as Verse[];
    },
    staleTime: 60 * 60 * 1000,
  });

  const verses = data ?? FALLBACK;
  const verse = verses[dayOfYear(new Date()) % verses.length];

  if (compact) {
    return (
      <div className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
        <BookOpen className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
        <span className="truncate italic">"{verse.text}"</span>
        <span className="shrink-0 text-[10px] uppercase tracking-wide">— {verse.reference}</span>
      </div>
    );
  }
  return (
    <div
      role="region"
      aria-label="Scripture of the day"
      className="flex items-start gap-3 rounded-2xl border border-primary/10 bg-primary/5 p-3 sm:p-4"
    >
      <div className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
        <BookOpen className="h-4 w-4" aria-hidden />
      </div>
      <div className="min-w-0">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-primary">
          Scripture of the Day
        </div>
        <blockquote className="mt-0.5 font-display text-sm italic text-foreground/90 sm:text-base">
          "{verse.text}"
        </blockquote>
        <div className="mt-1 text-xs font-medium text-muted-foreground">— {verse.reference}</div>
      </div>
    </div>
  );
}
