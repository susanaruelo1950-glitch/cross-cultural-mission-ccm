import { useEffect, useRef, useState } from "react";
import { Bell, HeartHandshake, FileText, Mail } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
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

const STORE_KEY = "gc.notifications.v2";
const MAX = 30;

interface Notif {
  id: string;
  table: "prayer_requests_db" | "ministry_updates" | "thank_you_letters";
  event: "INSERT" | "UPDATE" | "DELETE";
  title: string;
  href: string;
  at: string;
  read: boolean;
}

const META: Record<Notif["table"], { label: string; Icon: typeof Bell; toneClass: string }> = {
  prayer_requests_db: { label: "Prayer request", Icon: HeartHandshake, toneClass: "text-rose-600" },
  ministry_updates: { label: "Ministry update", Icon: FileText, toneClass: "text-emerald-600" },
  thank_you_letters: { label: "Thank-you letter", Icon: Mail, toneClass: "text-primary" },
};

function fallbackHref(table: Notif["table"]): string {
  if (table === "prayer_requests_db") return "/pray";
  return "/missionaries";
}

function currentMonthKey(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function inCurrentMonth(iso: string): boolean {
  return typeof iso === "string" && iso.slice(0, 7) === currentMonthKey();
}
function loadStore(): Notif[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORE_KEY);
    const list = raw ? (JSON.parse(raw) as Notif[]) : [];
    // Auto-reset: drop anything from a prior month so notifications can't
    // pile up indefinitely — the bell starts fresh at the top of each month.
    return list.filter((n) => inCurrentMonth(n.at));
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
 * ministry updates, and thank-you letters and surfaces them as a clickable
 * dropdown with an unread badge. Clicking a notification navigates to the
 * relevant page.
 */
export function NotificationBell() {
  const [items, setItems] = useState<Notif[]>([]);
  const [open, setOpen] = useState(false);
  const mountedAt = useRef<number>(Date.now());
  const navigate = useNavigate();

  useEffect(() => {
    setItems(loadStore());
    // Re-prune once an hour so a long-lived tab that crosses midnight into a
    // new month drops the previous month's notifications automatically.
    const pruneTimer = setInterval(() => setItems(loadStore()), 60 * 60 * 1000);

    function onChange(e: Event) {
      const detail = (e as CustomEvent<RealtimeChangeDetail>).detail;
      if (!detail) return;
      if (!(detail.table in META)) return;
      if (detail.event !== "INSERT") return;
      if (Date.now() - mountedAt.current < 1500) return;
      const row = detail.new as Record<string, unknown> | null;
      const title =
        (row?.title as string) ??
        (row?.subject as string) ??
        (row?.detail as string) ??
        "New item";
      const missionaryId = (row?.missionary_id as string | undefined) ?? undefined;
      const table = detail.table as Notif["table"];
      const href = missionaryId ? `/missionaries/${missionaryId}` : fallbackHref(table);
      const notif: Notif = {
        id: `${table}-${(row?.id as string) ?? Date.now()}`,
        table,
        event: detail.event,
        title: String(title).slice(0, 120),
        href,
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
      toast(`${meta.label} added`, {
        description: notif.title,
        duration: 4000,
        action: {
          label: "View",
          onClick: () => navigate({ to: href }).catch(() => { window.location.href = href; }),
        },
      });
    }
    window.addEventListener("gc-realtime-change", onChange);
    function onStorage(e: StorageEvent) {
      if (e.key === STORE_KEY) setItems(loadStore());
    }
    window.addEventListener("storage", onStorage);
    return () => {
      clearInterval(pruneTimer);
      window.removeEventListener("gc-realtime-change", onChange);
      window.removeEventListener("storage", onStorage);
    };
  }, [navigate]);

  const unread = items.filter((i) => !i.read).length;

  function markAllRead() {
    setItems((prev) => {
      const next = prev.map((i) => ({ ...i, read: true }));
      saveStore(next);
      return next;
    });
  }

  function handleOpen(n: Notif) {
    setOpen(false);
    setItems((prev) => {
      const next = prev.map((i) => (i.id === n.id ? { ...i, read: true } : i));
      saveStore(next);
      return next;
    });
    navigate({ to: n.href }).catch(() => { window.location.href = n.href; });
  }

  return (
    <DropdownMenu open={open} onOpenChange={(o) => { setOpen(o); if (o) markAllRead(); }}>
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
                <button
                  key={n.id}
                  type="button"
                  onClick={() => handleOpen(n)}
                  className={cn(
                    "flex w-full items-start gap-2 px-3 py-2 text-left text-sm hover:bg-muted/70 focus-visible:bg-muted focus-visible:outline-none",
                    !n.read && "bg-primary/5",
                  )}
                >
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
                </button>
              );
            })
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

