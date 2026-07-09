import { useEffect, useState } from "react";
import { Radio, WifiOff, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useRealtimeStatus, type RealtimeChangeDetail } from "@/hooks/use-global-realtime";

const LABELS: Record<string, string> = {
  ministry_updates: "Ministry update",
  thank_you_letters: "Thank-you letter",
  prayer_requests_db: "Prayer request",
  scriptures: "Scripture",
  coordinator_assignments: "Coordinator",
  missionary_photos: "Missionary photo",
  areas: "Area",
  phases: "Phase",
  regions: "Region",
  provinces: "Province",
  missionary_area_map: "Missionary assignment",
};

/**
 * Small header badge showing realtime status. Toasts when remote changes
 * arrive so admins can trust the state they're editing.
 */
export function LiveUpdatesIndicator() {
  const status = useRealtimeStatus();
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    function onChange(e: Event) {
      const detail = (e as CustomEvent<RealtimeChangeDetail>).detail;
      if (!detail) return;
      setPulse(true);
      setTimeout(() => setPulse(false), 800);
      const label = LABELS[detail.table] ?? detail.table;
      const verb =
        detail.event === "INSERT" ? "added" : detail.event === "UPDATE" ? "updated" : "deleted";
      toast(`${label} ${verb}`, {
        description: "A teammate just made a change. The page has been refreshed.",
        duration: 3000,
      });
    }
    window.addEventListener("gc-realtime-change", onChange);
    return () => window.removeEventListener("gc-realtime-change", onChange);
  }, []);

  const label =
    status === "live" ? "Live" : status === "connecting" ? "Connecting…" : "Offline";
  const Icon = status === "offline" ? WifiOff : status === "connecting" ? RefreshCw : Radio;

  return (
    <span
      title={`Realtime: ${label}`}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium",
        status === "live" &&
          "border-emerald-500/40 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200",
        status === "connecting" &&
          "border-amber-500/40 bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200",
        status === "offline" &&
          "border-red-500/40 bg-red-50 text-red-800 dark:bg-red-950/40 dark:text-red-200",
        pulse && "ring-2 ring-primary/50",
      )}
    >
      <Icon
        className={cn(
          "h-3 w-3",
          status === "connecting" && "animate-spin",
          status === "live" && pulse && "animate-pulse",
        )}
        aria-hidden
      />
      {label}
    </span>
  );
}
