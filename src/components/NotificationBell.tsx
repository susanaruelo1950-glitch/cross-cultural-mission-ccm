import { useEffect, useRef, useState } from "react";
import { Bell, HeartHandshake, FileText, Mail } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { RealtimeChangeDetail } from "@/hooks/use-global-realtime";

const STORE_KEY = "gc.notifications.v1";
const MAX = 30;

interface Notif {
  id: string;
  table: "prayer_requests_db" | "ministry_updates" | "thank_you_letters";
  event: "INSERT" | "UPDATE" | "DELETE";
  title: string;
  at: string;
  read: boolean;
}

const META: Record<Notif["table"], { label: string; Icon: typeof Bell; toneClass: string }> = {
  prayer_requests_db: { label: "Prayer request", Icon: HeartHandshake, toneClass: "text-rose-600" },
  ministry_updates: { label: "Ministry update", Icon: FileText, toneClass: "text-emerald-600" },
  thank_you_letters: { label: "Thank-you letter", Icon: Mail, toneClass: "text-primary" },
};

function loadStore(): Notif[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORE_KEY);
    return raw ? (JSON.parse(raw) as Notif[]) : [];
  } catch {
    return [];
  }
}
function saveStore(list: Notif[]) {
  try {
    window.localStorage.setItem(STORE_KEY, JSON.stringify(list.slice(0, MAX)));
  } catch { /* quota */ }
}

/**
 * In-app notification bell. Listens for realtime changes on prayer requests,
 * ministry updates, and thank-you letters and surfaces them as a dropdown
 * with an unread badge. Fires a toast on new inserts.
 */
export function NotificationBell() {
  const [items, setItems] = useState<Notif[]>([]);
  const mountedAt = useRef<number>(Date.now());

  useEffect(() => {
    setItems(loadStore());
    function onChange(e: Event) {
      const detail = (e as CustomEvent<RealtimeChangeDetail>).detail;
      if (!detail) return;
      if (!(detail.table in META)) return;
      if (detail.event !== "INSERT") return;
      // Ignore backlog / historical items that landed during the initial
      // subscription burst — only real new inserts create notifications.
      if (Date.now() - mountedAt.current < 1500) return;
      const row = detail.new as Record<string, unknown> | null;
      const title =
        (row?.title as string) ??
        (row?.subject as string) ??
        (row?.detail as string) ??
        "New item";
      const notif: Notif = {
        id: `${detail.table}-${(row?.id as string) ?? Date.now()}`,
        table: detail.table as Notif["table"],
        event: detail.event,
        title: String(title).slice(0, 120),
        at: new Date().toISOString(),
        read: false,
      };
      setItems((prev) => {
        if (prev.some((p) => p.id === notif.id)) return prev;
        const next = [notif, ...prev].slice(0, MAX);
        saveStore(next);
        return next;
      });
      const meta = META[notif.table];
      toast(`${meta.label} added`, { description: notif.title, duration: 4000 });
    }
    window.addEventListener("gc-realtime-change", onChange);
    return () => window.removeEventListener("gc-realtime-change", onChange);
  }, []);

  const unread = items.filter((i) => !i.read).length;

  function markAllRead() {
    setItems((prev) => {
      const next = prev.map((i) => ({ ...i, read: true }));
      saveStore(next);
      return next;
    });
  }

  return (
    <DropdownMenu onOpenChange={(open) => { if (open) markAllRead(); }}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Notifications" className="relative rounded-full">
          <Bell className="h-4 w-4" />
          {unread > 0 ? (
            <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-[16px] place-items-center rounded-full bg-primary px-1 text-[10px] font-bold leading-none text-primary-foreground">
              {unread > 9 ? "9+" : unread}
            </span>
          ) : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <DropdownMenuLabel className="flex items-center justify-between px-3 py-2">
          <span className="text-sm font-semibold">Notifications</span>
          {items.length > 0 ? (
            <button
              className="text-xs text-muted-foreground hover:text-foreground"
              onClick={() => { setItems([]); saveStore([]); }}
            >
              Clear
            </button>
          ) : null}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <div className="max-h-96 overflow-y-auto">
          {items.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              You're all caught up.
            </div>
          ) : (
            items.map((n) => {
              const { label, Icon, toneClass } = META[n.table];
              return (
                <div key={n.id} className={cn("flex items-start gap-2 px-3 py-2 text-sm", !n.read && "bg-primary/5")}>
                  <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", toneClass)} aria-hidden />
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                      {label}
                    </div>
                    <div className="truncate">{n.title}</div>
                    <div className="text-[10px] text-muted-foreground">
                      {formatDistanceToNow(new Date(n.at), { addSuffix: true })}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
