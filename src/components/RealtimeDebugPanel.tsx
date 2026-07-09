import { useSyncExternalStore } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, AlertCircle, CheckCircle2, RotateCw } from "lucide-react";
import { useRealtimeStatus } from "@/hooks/use-global-realtime";
import { getSyncLog, subscribeSyncLog, type SyncLogEntry } from "@/lib/mission-data";

function useSyncLog(): SyncLogEntry[] {
  return useSyncExternalStore(subscribeSyncLog, getSyncLog, () => []);
}

function StatusIcon({ status }: { status: SyncLogEntry["status"] }) {
  if (status === "ok") return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />;
  if (status === "retry") return <RotateCw className="h-3.5 w-3.5 text-amber-600" />;
  return <AlertCircle className="h-3.5 w-3.5 text-destructive" />;
}

export function RealtimeDebugPanel() {
  const status = useRealtimeStatus();
  const log = useSyncLog();
  return (
    <Card className="card-soft p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          <h2 className="font-display text-xl font-semibold">Realtime sync — debug</h2>
        </div>
        <Badge
          variant={status === "live" ? "default" : "secondary"}
          className={
            status === "live"
              ? "rounded-full bg-emerald-600"
              : status === "offline"
              ? "rounded-full bg-destructive text-destructive-foreground"
              : "rounded-full"
          }
        >
          {status === "live" ? "Connected" : status === "offline" ? "Offline" : "Connecting…"}
        </Badge>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Last {log.length} cloud writes from this device — retries and failures
        appear here so we can spot flaky networks or blocked writes fast.
      </p>
      <div className="mt-4 max-h-72 overflow-auto rounded-lg border border-border">
        {log.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground">
            No writes yet this session.
          </div>
        ) : (
          <ul className="divide-y divide-border text-sm">
            {log.map((e, i) => (
              <li key={i} className="flex items-start gap-3 px-3 py-2">
                <StatusIcon status={e.status} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{e.kind}</span>
                    <span className="truncate text-xs text-muted-foreground">{e.id}</span>
                    {typeof e.attempt === "number" ? (
                      <Badge variant="outline" className="rounded-full text-[10px]">
                        attempt {e.attempt}
                      </Badge>
                    ) : null}
                  </div>
                  {e.reason ? (
                    <div className="truncate text-xs text-destructive">{e.reason}</div>
                  ) : null}
                </div>
                <time className="shrink-0 text-xs text-muted-foreground">
                  {new Date(e.at).toLocaleTimeString()}
                </time>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}
