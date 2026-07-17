import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import ReactMarkdown from "react-markdown";
import { Sparkles, Send, X, Loader2, Minus, GripVertical, Maximize2, Minimize2 } from "lucide-react";
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
const STORAGE_SIZE = "ccm-fab-size";
const FAB_SIZE = 56;
const EDGE_PAD = 12;

type PanelSize = "compact" | "regular" | "large";
const SIZE_ORDER: PanelSize[] = ["compact", "regular", "large"];

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

/** Read env(safe-area-inset-*) values from CSS custom properties on <html>. */
function readSafeArea() {
  if (typeof window === "undefined") return { top: 0, right: 0, bottom: 0, left: 0 };
  const probe = document.createElement("div");
  probe.style.cssText =
    "position:fixed;top:0;left:0;visibility:hidden;pointer-events:none;" +
    "--sat:env(safe-area-inset-top);--sar:env(safe-area-inset-right);" +
    "--sab:env(safe-area-inset-bottom);--sal:env(safe-area-inset-left);";
  document.body.appendChild(probe);
  const cs = getComputedStyle(probe);
  const parse = (v: string) => (v.endsWith("px") ? parseFloat(v) : 0) || 0;
  const out = {
    top: parse(cs.getPropertyValue("--sat")),
    right: parse(cs.getPropertyValue("--sar")),
    bottom: parse(cs.getPropertyValue("--sab")),
    left: parse(cs.getPropertyValue("--sal")),
  };
  probe.remove();
  return out;
}

export function FloatingAssistant() {
  useDataStore();
  const ask = useServerFn(askAssistant);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [input, setInput] = useState("");
  const [size, setSize] = useState<PanelSize>(() => {
    if (typeof window === "undefined") return "regular";
    try {
      const raw = window.localStorage.getItem(STORAGE_SIZE);
      if (raw && SIZE_ORDER.includes(raw as PanelSize)) return raw as PanelSize;
    } catch { /* noop */ }
    return "regular";
  });
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

  const [pos, setPos] = useState<{ x: number; y: number }>({ x: 24, y: 96 });
  const [dragging, setDragging] = useState(false);
  const [safe, setSafe] = useState({ top: 0, right: 0, bottom: 0, left: 0 });
  const [vp, setVp] = useState({ w: 1024, h: 768 });
  const dragRef = useRef<{ dx: number; dy: number; moved: boolean } | null>(null);
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const isMobile = vp.w < 640;

  function clampWith(x: number, y: number, s = safe, v = vp) {
    const minX = EDGE_PAD + s.left;
    const minY = EDGE_PAD + s.top;
    const maxX = v.w - FAB_SIZE - EDGE_PAD - s.right;
    const maxY = v.h - FAB_SIZE - EDGE_PAD - s.bottom;
    return { x: Math.min(Math.max(minX, x), Math.max(minX, maxX)), y: Math.min(Math.max(minY, y), Math.max(minY, maxY)) };
  }

  function snapToEdge(x: number, y: number, s = safe, v = vp) {
    const mid = (v.w - FAB_SIZE) / 2;
    const targetX = x < mid ? EDGE_PAD + s.left : v.w - FAB_SIZE - EDGE_PAD - s.right;
    return clampWith(targetX, y, s, v);
  }

  // Init + resize / orientation handling.
  useEffect(() => {
    const sync = () => {
      const s = readSafeArea();
      const v = { w: window.innerWidth, h: window.innerHeight };
      setSafe(s);
      setVp(v);
      setPos((prev) => {
        let base = prev;
        try {
          const raw = window.localStorage.getItem(STORAGE_POS);
          if (raw && prev.x === 24 && prev.y === 96) {
            const p = JSON.parse(raw) as { x: number; y: number };
            base = p;
          }
        } catch { /* noop */ }
        // Default: bottom-right if no saved position.
        if (base.x === 24 && base.y === 96) {
          base = { x: v.w - FAB_SIZE - EDGE_PAD - s.right, y: v.h - FAB_SIZE - 96 - s.bottom };
        }
        return snapToEdge(base.x, base.y, s, v);
      });
    };
    sync();
    window.addEventListener("resize", sync);
    window.addEventListener("orientationchange", sync);
    return () => {
      window.removeEventListener("resize", sync);
      window.removeEventListener("orientationchange", sync);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    try { window.localStorage.setItem(STORAGE_MSGS, JSON.stringify(messages.slice(-40))); } catch { /* noop */ }
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open]);

  useEffect(() => {
    try { window.localStorage.setItem(STORAGE_SIZE, size); } catch { /* noop */ }
  }, [size]);

  function onPointerDown(e: React.PointerEvent) {
    const rect = btnRef.current?.getBoundingClientRect();
    if (!rect) return;
    (e.target as Element).setPointerCapture?.(e.pointerId);
    dragRef.current = { dx: e.clientX - rect.left, dy: e.clientY - rect.top, moved: false };
    setDragging(true);
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!dragRef.current) return;
    const next = clampWith(e.clientX - dragRef.current.dx, e.clientY - dragRef.current.dy);
    if (Math.abs(next.x - pos.x) + Math.abs(next.y - pos.y) > 3) dragRef.current.moved = true;
    setPos(next);
  }
  function onPointerUp(e: React.PointerEvent) {
    const d = dragRef.current;
    dragRef.current = null;
    (e.target as Element).releasePointerCapture?.(e.pointerId);
    setDragging(false);
    if (d && !d.moved) {
      setOpen((o) => !o);
      return;
    }
    const snapped = snapToEdge(pos.x, pos.y);
    setPos(snapped);
    try { window.localStorage.setItem(STORAGE_POS, JSON.stringify(snapped)); } catch { /* noop */ }
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

  const panelStyle = useMemo<React.CSSProperties>(() => {
    // Mobile: bottom-sheet spanning full width, adjustable height.
    if (isMobile) {
      const heightPct = size === "compact" ? 0.45 : size === "regular" ? 0.72 : 0.95;
      const height = Math.round((vp.h - safe.top - safe.bottom) * heightPct);
      return {
        left: EDGE_PAD + safe.left,
        right: EDGE_PAD + safe.right,
        bottom: EDGE_PAD + safe.bottom,
        height,
      };
    }
    // Desktop: floating panel anchored near the FAB.
    const width = size === "compact" ? 340 : size === "regular" ? 400 : 480;
    const height = size === "compact" ? 440 : size === "regular" ? 560 : 680;
    const w = Math.min(width, vp.w - 16 - safe.left - safe.right);
    const h = Math.min(height, vp.h - 16 - safe.top - safe.bottom);
    let left = pos.x + FAB_SIZE + 8;
    let top = pos.y - h + FAB_SIZE;
    if (left + w > vp.w - EDGE_PAD - safe.right) left = Math.max(EDGE_PAD + safe.left, pos.x - w - 8);
    if (top < EDGE_PAD + safe.top) top = EDGE_PAD + safe.top;
    if (top + h > vp.h - EDGE_PAD - safe.bottom) top = vp.h - h - EDGE_PAD - safe.bottom;
    return { left, top, width: w, height: h };
  }, [pos, size, vp, safe, isMobile]);

  function cycleSize() {
    setSize((s) => SIZE_ORDER[(SIZE_ORDER.indexOf(s) + 1) % SIZE_ORDER.length]);
  }

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        aria-label={open ? "Close AI assistant" : "Open AI assistant"}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        style={{ left: pos.x, top: pos.y, width: FAB_SIZE, height: FAB_SIZE }}
        className={cn(
          "fixed z-50 grid place-items-center rounded-full text-white shadow-lift touch-none select-none",
          "gradient-mission active:scale-95",
          dragging ? "transition-none cursor-grabbing" : "transition-all duration-200 cursor-grab",
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
          className={cn(
            "fixed z-50 flex flex-col overflow-hidden border border-border bg-card shadow-lift",
            isMobile ? "rounded-2xl" : "rounded-2xl",
          )}
        >
          <header className="flex items-center gap-2 border-b border-border bg-muted/40 px-3 py-2">
            <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full gradient-mission text-white">
              <Sparkles className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold">Grace · Mission Assistant</div>
              <div className="truncate text-[11px] text-muted-foreground">
                {isMobile ? "Tap resize to change height" : "Grounded in live CCM data · drag me anywhere"}
              </div>
            </div>
            <GripVertical className="hidden h-4 w-4 shrink-0 text-muted-foreground sm:inline-block" aria-hidden />
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={cycleSize}
              aria-label={`Resize (${size})`}
              title={`Size: ${size}`}
            >
              {size === "large" ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => setOpen(false)} aria-label="Minimize">
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
            style={{ paddingBottom: isMobile ? `max(0.5rem, ${safe.bottom / 2}px)` : undefined }}
            onSubmit={(e) => { e.preventDefault(); send(input); }}
          >
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about missionaries, prayer, reports…"
              className="h-10 rounded-full text-base sm:h-9 sm:text-sm"
              disabled={busy}
              autoFocus
            />
            <Button type="submit" size="icon" className="h-10 w-10 shrink-0 rounded-full sm:h-9 sm:w-9" disabled={busy || !input.trim()} aria-label="Send">
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      ) : null}
    </>
  );
}
