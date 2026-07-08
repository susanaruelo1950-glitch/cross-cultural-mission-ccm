import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Heart, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Props {
  missionaryId: string;
  compact?: boolean;
}

/**
 * "I prayed for this pastor" button — persists a row in prayer_events on every tap.
 * Reads the aggregate count from the prayer_counts view and updates in real time.
 * Uses localStorage to give logged-out users a soft de-dupe (one tap per session).
 */
export function PrayerCounter({ missionaryId, compact }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const storageKey = `gc.prayed.${missionaryId}`;
  const [justPrayed, setJustPrayed] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setJustPrayed(!!window.localStorage.getItem(storageKey));
  }, [storageKey]);

  const { data: count = 0, isLoading } = useQuery({
    queryKey: ["prayer_count", missionaryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("prayer_counts")
        .select("total")
        .eq("missionary_id", missionaryId)
        .maybeSingle();
      if (error) throw error;
      return Number(data?.total ?? 0);
    },
  });

  const pray = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("prayer_events").insert({
        missionary_id: missionaryId,
        user_id: user?.id ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setJustPrayed(true);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(storageKey, new Date().toISOString());
      }
      qc.invalidateQueries({ queryKey: ["prayer_count", missionaryId] });
      toast.success("Thank you for praying 🙏");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (compact) {
    return (
      <Button
        variant={justPrayed ? "secondary" : "default"}
        size="sm"
        className="rounded-full"
        onClick={() => pray.mutate()}
        disabled={pray.isPending}
        aria-label={`Pray for this missionary. ${count} prayer${count === 1 ? "" : "s"} so far.`}
      >
        <Heart className={cn("h-3.5 w-3.5", justPrayed && "fill-current")} />
        {isLoading ? "…" : count}
      </Button>
    );
  }

  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-primary/20 bg-primary/5 p-4 sm:flex-row sm:justify-between">
      <div>
        <div className="text-xs font-semibold uppercase tracking-wider text-primary">
          Prayer support
        </div>
        <div className="mt-0.5 font-display text-2xl font-semibold">
          {isLoading ? "…" : count.toLocaleString()}{" "}
          <span className="text-sm font-normal text-muted-foreground">
            {count === 1 ? "prayer" : "prayers"} lifted up
          </span>
        </div>
      </div>
      <Button
        onClick={() => pray.mutate()}
        disabled={pray.isPending}
        className="rounded-full"
        aria-label="Record that I prayed for this missionary"
      >
        {pray.isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Heart className={cn("h-4 w-4", justPrayed && "fill-current")} />
        )}
        {justPrayed ? "I prayed again" : "I prayed for this pastor"}
      </Button>
    </div>
  );
}
