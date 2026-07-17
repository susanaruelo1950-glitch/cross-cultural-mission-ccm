import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import ReactMarkdown from "react-markdown";
import { Sparkles, Send, X, Loader2, Minus, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { askAssistant } from "@/lib/ask.functions";
import { allAreas, allMissionaries, allPhases, missionStats, reports } from "@/lib/mission-data";
import { supabase } from "@/integrations/supabase/client";
import { useDataStore } from "@/hooks/use-data-store";

interface Message { role: "user" | "assistant"; content: string }

const STORAGE_POS = "ccm-fab-pos";
const STORAGE_MSGS = "ccm-fab-msgs";

const SUGGESTIONS = [
  "Who are the missionaries in Kidapawan?",
  "Any urgent prayer requests?",
  "Summarize the latest ministry updates",
  "What phases and areas do we have?",
  "Show recent thank-you letters",
];

const WELCOME: Message = {
  role: "assistant",
  content:
    "Hi there! 👋 I'm **Grace**, your CCM mission assistant. I can help you find missionaries, phases, areas, ministry reports, prayer requests, thank-you letters, and announcements. What would you like to know?",
};

async function buildContext() {
  const phases = allPhases().map((p) => ({ id: p.id, name: p.name, order: p.order }));
  const areas = allAreas().map((a) => ({ id: a.id, name: a.name, phaseId: a.phaseId, region: a.region, province: a.province }));
  const missionaries = allMissionaries().map((m) => ({
    id: m.id, name: m.fullName, church: m.church, areaId: m.areaId,
    status: m.status, ministryFocus: m.ministryFocus, province: m.province, municipality: m.municipality,
  }));
  const nameById = new Map(missionaries.map((m) => [m.id, m.name]));

  const [prayers, updates, letters, anns] = await Promise.all([
    supabase.from("prayer_requests_db")
      .select("missionary_id, title, detail, urgent, answered, created_at")
      .eq("answered", false).order("urgent", { ascending: false })
      .order("created_at", { ascending: false }).limit(30),
    supabase.from("ministry_updates")
      .select("missionary_id, title, summary, report_date")
      .order("report_date", { ascending: false, nullsFirst: false }).limit(20),
    supabase.from("thank_you_letters")
      .select("missionary_id, title, message, letter_date")
      .order("letter_date", { ascending: false, nullsFirst: false }).limit(15),
    supabase.from("announcements")
      .select("title, body, publish_at, expires_at, published")
      .eq("published", true).order("publish_at", { ascending: false }).limit(10),
  ]);

  return {
    generatedAt: new Date().toISOString(),
    counts: {
      missionaries: missionStats.totalMissionaries,
      phases: missionStats.totalPhases,
      areas: missionStats.totalAreas,
      churches: missionStats.totalChurches,
    },
    phases, areas, missionaries,
    recentReports: reports.slice(0, 10).map((r) => ({
      title: r.title, date: r.date, salvations: r.salvations, baptisms: r.baptisms, attendance: r.attendance,
    })),
    openPrayerRequests: (prayers.data ?? []).map((p) => ({
      title: p.title, detail: p.detail, urgent: p.urgent,
      missionaryId: p.missionary_id, missionaryName: nameById.get(p.missionary_id), created_at: p.created_at,
    })),
    recentUpdates: (updates.data ?? []).map((u) => ({
      title: u.title, summary: u.summary, report_date: u.report_date,
      missionaryId: u.missionary_id, missionaryName: nameById.get(u.missionary_id),
    })),
    recentLetters: (letters.data ?? []).map((l) => ({
      title: l.title, excerpt: l.message ? l.message.slice(0, 240) : null, letter_date: l.letter_date,
      missionaryId: l.missionary_id, missionaryName: nameById.get(l.missionary_id),
    })),
    announcements: (anns.data ?? []).map((a) => ({
      title: a.title, body: a.body, publish_at: a.publish_at, expires_at: a.expires_at,
    })),
    sources: ["directory", "reports", "prayer_requests", "ministry_updates", "thank_you_letters", "announcements"],
  };
}

export function FloatingAssistant() {
  useDataStore();
  const ask = useServerFn(askAssistant);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>(() => {
    if (typeof window === "undefined") return [WELCOME];
    try {
      const raw = window.localStorage.getItem(STORAGE_MSGS);
      if (raw) {
        const parsed = JSON.parse(raw) as Message[];
        if (Array.isArray(parsed) && parsed.length) return parsed;
      }
    } catch { /* noop */ }
    return [WELCOME];
  });

  // Position: bottom-right by default, persisted, draggable.
  const [pos, setPos] = useState<{ x: number; y: number }>({ x: 24, y: 96 });
  const dragRef = useRef<{ dx: number; dy: number; moved: boolean } | null>(null);
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // Initialize position after mount (avoid SSR window access).
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_POS);
      if (raw) {
        const p = JSON.parse(raw) as { x: number; y: number };
        setPos(clampPos(p.x, p.y));
        return;
      }
    } catch { /* noop */ }
    setPos({ x: window.innerWidth - 80, y: window.innerHeight - 180 });
  }, []);

  useEffect(() => {
    try { window.localStorage.setItem(STORAGE_MSGS, JSON.stringify(messages.slice(-40))); } catch { /* noop */ }
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open]);

  function clampPos(x: number, y: number) {
    if (typeof window === "undefined") return { x, y };
    const size = 56;
    const maxX = window.innerWidth - size - 8;
    const maxY = window.innerHeight - size - 8;
    return { x: Math.min(Math.max(8, x), maxX), y: Math.min(Math.max(8, y), maxY) };
  }

  function onPointerDown(e: React.PointerEvent) {
    const rect = btnRef.current?.getBoundingClientRect();
    if (!rect) return;
    (e.target as Element).setPointerCapture?.(e.pointerId);
    dragRef.current = { dx: e.clientX - rect.left, dy: e.clientY - rect.top, moved: false };
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!dragRef.current) return;
    const next = clampPos(e.clientX - dragRef.current.dx, e.clientY - dragRef.current.dy);
    if (Math.abs(next.x - pos.x) + Math.abs(next.y - pos.y) > 3) dragRef.current.moved = true;
    setPos(next);
  }
  function onPointerUp(e: React.PointerEvent) {
    const d = dragRef.current;
    dragRef.current = null;
    (e.target as Element).releasePointerCapture?.(e.pointerId);
    if (d && !d.moved) {
      setOpen((o) => !o);
    } else {
      try { window.localStorage.setItem(STORAGE_POS, JSON.stringify(pos)); } catch { /* noop */ }
    }
  }

  async function send(text: string) {
    const q = text.trim();
    if (!q || busy) return;
    setInput("");
    const next: Message[] = [...messages, { role: "user", content: q }];
    setMessages(next);
    setBusy(true);
    try {
      const context = await buildContext();
      const { reply } = await ask({
        data: {
          question: q,
          history: next.slice(0, -1).map((m) => ({ role: m.role, content: m.content })).slice(-12),
          context,
        },
      });
      setMessages((m) => [...m, { role: "assistant", content: reply || "(no reply)" }]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "AI request failed";
      toast.error(msg);
      setMessages((m) => [...m, { role: "assistant", content: `⚠️ ${msg}` }]);
    } finally {
      setBusy(false);
    }
  }

  // Panel anchored near the FAB, but clamped inside viewport.
  const panelStyle = useMemo(() => {
    if (typeof window === "undefined") return { left: 24, top: 96 };
    const width = Math.min(400, window.innerWidth - 24);
    const height = Math.min(560, window.innerHeight - 120);
    let left = pos.x + 64;
    let top = pos.y - height + 56;
    if (left + width > window.innerWidth - 8) left = Math.max(8, pos.x - width - 8);
    if (top < 8) top = 8;
    if (top + height > window.innerHeight - 8) top = window.innerHeight - height - 8;
    return { left, top, width, height };
  }, [pos, open]);

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        aria-label={open ? "Close AI assistant" : "Open AI assistant"}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        style={{ left: pos.x, top: pos.y }}
        className={cn(
          "fixed z-50 grid h-14 w-14 place-items-center rounded-full text-white shadow-lift touch-none select-none",
          "gradient-mission active:scale-95 transition-transform",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
        )}
      >
        {open ? <X className="h-6 w-6" /> : <Sparkles className="h-6 w-6" />}
        <span className="sr-only">AI assistant</span>
      </button>

      {open ? (
        <div
          role="dialog"
          aria-label="AI Mission Assistant"
          style={panelStyle}
          className="fixed z-50 flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-lift"
        >
          <header className="flex items-center gap-2 border-b border-border bg-muted/40 px-3 py-2">
            <div className="grid h-8 w-8 place-items-center rounded-full gradient-mission text-white">
              <Sparkles className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold">Grace · Mission Assistant</div>
              <div className="truncate text-[11px] text-muted-foreground">
                Grounded in live CCM data · drag me anywhere
              </div>
            </div>
            <GripVertical className="h-4 w-4 text-muted-foreground" aria-hidden />
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setOpen(false)} aria-label="Minimize">
              <Minus className="h-4 w-4" />
            </Button>
          </header>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-3">
            {messages.map((m, i) => (
              <div key={i} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
                <div
                  className={cn(
                    "max-w-[85%] rounded-2xl px-3 py-2 text-sm shadow-soft",
                    m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted",
                  )}
                >
                  {m.role === "assistant" ? (
                    <div className="prose prose-sm max-w-none dark:prose-invert prose-p:my-1 prose-ul:my-1">
                      <ReactMarkdown>{m.content}</ReactMarkdown>
                    </div>
                  ) : (
                    <p className="whitespace-pre-wrap">{m.content}</p>
                  )}
                </div>
              </div>
            ))}
            {busy ? (
              <div className="flex justify-start">
                <div className="rounded-2xl bg-muted px-3 py-2 text-sm">
                  <Loader2 className="inline h-3.5 w-3.5 animate-spin" /> Thinking…
                </div>
              </div>
            ) : null}
          </div>

          {messages.length <= 1 ? (
            <div className="flex flex-wrap gap-1.5 border-t border-border px-3 py-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => send(s)}
                  disabled={busy}
                  className="rounded-full border border-border bg-background px-2.5 py-1 text-[11px] font-medium hover:bg-accent disabled:opacity-50"
                >
                  {s}
                </button>
              ))}
            </div>
          ) : null}

          <form
            className="flex items-center gap-2 border-t border-border bg-background p-2"
            onSubmit={(e) => { e.preventDefault(); send(input); }}
          >
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about missionaries, prayer, reports…"
              className="h-9 rounded-full"
              disabled={busy}
              autoFocus
            />
            <Button type="submit" size="icon" className="h-9 w-9 shrink-0 rounded-full" disabled={busy || !input.trim()} aria-label="Send">
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      ) : null}
    </>
  );
}
