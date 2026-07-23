import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import ReactMarkdown from "react-markdown";
import {
  Sparkles, Send, X, Loader2, Minus, GripVertical, Maximize2, Minimize2,
  History, Plus, Search, Trash2, ArrowLeft, Pin, PinOff, Share2, Tag as TagIcon,
  Mic, MicOff, Volume2, VolumeX, Play, Square,
} from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { askAssistant } from "@/lib/ask.functions";
import { allAreas, allMissionaries, allPhases, missionStats, reports } from "@/lib/mission-data";
import { supabase } from "@/integrations/supabase/client";
import { useDataStore } from "@/hooks/use-data-store";

interface Message { role: "user" | "assistant"; content: string }
interface Conversation {
  id: string;
  title: string;
  updatedAt: number;
  messages: Message[];
  pinned?: boolean;
  tags?: string[];
}

const STORAGE_POS = "ccm-fab-pos";
const STORAGE_MSGS = "ccm-fab-msgs"; // legacy — migrated on load
const STORAGE_SIZE = "ccm-fab-size";
const STORAGE_CONVOS = "ccm-fab-convos";
const STORAGE_ACTIVE = "ccm-fab-active";
const STORAGE_VOICE = "ccm-fab-voice";
const STORAGE_AUTOSPEAK = "ccm-fab-autospeak";
const STORAGE_RATE = "ccm-fab-rate";
const STORAGE_VOLUME = "ccm-fab-volume";

function vibrate(pattern: number | number[]) {
  try {
    if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
      navigator.vibrate(pattern);
    }
  } catch { /* noop */ }
}
const FAB_SIZE = 56;
const EDGE_PAD = 12;

type PanelSize = "compact" | "regular" | "large";
const SIZE_ORDER: PanelSize[] = ["compact", "regular", "large"];

const VOICES: Array<{ id: string; label: string; hint: string }> = [
  { id: "alloy", label: "Alloy", hint: "Warm, balanced (default)" },
  { id: "shimmer", label: "Shimmer", hint: "Bright, friendly" },
  { id: "nova", label: "Nova", hint: "Clear, upbeat" },
  { id: "coral", label: "Coral", hint: "Gentle, expressive" },
  { id: "sage", label: "Sage", hint: "Calm, thoughtful" },
  { id: "fable", label: "Fable", hint: "Storyteller, British" },
  { id: "echo", label: "Echo", hint: "Neutral, steady" },
  { id: "onyx", label: "Onyx", hint: "Deep, authoritative" },
  { id: "ash", label: "Ash", hint: "Soft, reflective" },
  { id: "ballad", label: "Ballad", hint: "Lyrical, gentle" },
  { id: "verse", label: "Verse", hint: "Expressive, dynamic" },
];

/** Strip markdown so the model reads clean prose aloud. */
function forSpeech(md: string): string {
  return md
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[#>*_~`]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

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

function newId() {
  return `c_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function titleFrom(messages: Message[]): string {
  const firstUser = messages.find((m) => m.role === "user");
  if (firstUser) return firstUser.content.trim().slice(0, 60);
  return "New conversation";
}

function makeConversation(messages: Message[] = [WELCOME]): Conversation {
  return { id: newId(), title: titleFrom(messages), updatedAt: Date.now(), messages };
}

function loadConversations(): { convos: Conversation[]; activeId: string } {
  if (typeof window === "undefined") {
    const c = makeConversation();
    return { convos: [c], activeId: c.id };
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_CONVOS);
    if (raw) {
      const parsed = JSON.parse(raw) as Conversation[];
      if (Array.isArray(parsed) && parsed.length) {
        const activeRaw = window.localStorage.getItem(STORAGE_ACTIVE) ?? "";
        const activeId = parsed.some((c) => c.id === activeRaw) ? activeRaw : parsed[0].id;
        return { convos: parsed, activeId };
      }
    }
    // Migrate legacy single-thread
    const legacy = window.localStorage.getItem(STORAGE_MSGS);
    if (legacy) {
      const msgs = JSON.parse(legacy) as Message[];
      if (Array.isArray(msgs) && msgs.length) {
        const c = makeConversation(msgs);
        return { convos: [c], activeId: c.id };
      }
    }
  } catch { /* noop */ }
  const c = makeConversation();
  return { convos: [c], activeId: c.id };
}

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

function formatWhen(ts: number) {
  const d = new Date(ts);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  const diffDays = Math.floor((now.getTime() - ts) / 86400000);
  if (diffDays < 7) return d.toLocaleDateString([], { weekday: "short" });
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

function encodeShare(c: Conversation): string {
  const payload = JSON.stringify({ t: c.title, m: c.messages, g: c.tags ?? [] });
  const b64 = btoa(unescape(encodeURIComponent(payload)));
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function decodeShare(s: string): { title: string; messages: Message[]; tags: string[] } | null {
  try {
    const b64 = s.replace(/-/g, "+").replace(/_/g, "/");
    const pad = b64.length % 4 === 0 ? "" : "=".repeat(4 - (b64.length % 4));
    const json = decodeURIComponent(escape(atob(b64 + pad)));
    const p = JSON.parse(json) as { t?: string; m?: Message[]; g?: string[] };
    if (!p || !Array.isArray(p.m)) return null;
    return { title: typeof p.t === "string" ? p.t : "Shared conversation", messages: p.m, tags: Array.isArray(p.g) ? p.g : [] };
  } catch {
    return null;
  }
}

export function FloatingAssistant() {
  useDataStore();
  const ask = useServerFn(askAssistant);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [input, setInput] = useState("");
  const [view, setView] = useState<"chat" | "history">("chat");
  const [search, setSearch] = useState("");
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [size, setSize] = useState<PanelSize>(() => {
    if (typeof window === "undefined") return "regular";
    try {
      const raw = window.localStorage.getItem(STORAGE_SIZE);
      if (raw && SIZE_ORDER.includes(raw as PanelSize)) return raw as PanelSize;
    } catch { /* noop */ }
    return "regular";
  });
  const [voice, setVoice] = useState<string>(() => {
    if (typeof window === "undefined") return "alloy";
    try {
      const raw = window.localStorage.getItem(STORAGE_VOICE);
      if (raw && VOICES.some((v) => v.id === raw)) return raw;
    } catch { /* noop */ }
    return "alloy";
  });
  const [autoSpeak, setAutoSpeak] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try { return window.localStorage.getItem(STORAGE_AUTOSPEAK) === "1"; } catch { return false; }
  });
  const [rate, setRate] = useState<number>(() => {
    if (typeof window === "undefined") return 1;
    try {
      const raw = window.localStorage.getItem(STORAGE_RATE);
      const n = raw ? parseFloat(raw) : NaN;
      if (!Number.isNaN(n) && n >= 0.5 && n <= 2) return n;
    } catch { /* noop */ }
    return 1;
  });
  const [volume, setVolume] = useState<number>(() => {
    if (typeof window === "undefined") return 1;
    try {
      const raw = window.localStorage.getItem(STORAGE_VOLUME);
      const n = raw ? parseFloat(raw) : NaN;
      if (!Number.isNaN(n) && n >= 0 && n <= 1) return n;
    } catch { /* noop */ }
    return 1;
  });
  const [voiceSettingsOpen, setVoiceSettingsOpen] = useState(false);
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [speakingIdx, setSpeakingIdx] = useState<number | null>(null);
  const [captionText, setCaptionText] = useState<string>("");
  const [captionProgress, setCaptionProgress] = useState<number>(0);
  const [micLevel, setMicLevel] = useState<number>(0);
  const [waveform, setWaveform] = useState<number[]>([]);
  const [interimTranscript, setInterimTranscript] = useState<string>("");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lastSpokenRef = useRef<string | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);

  const initial = useMemo(loadConversations, []);
  const [conversations, setConversations] = useState<Conversation[]>(initial.convos);
  const [activeId, setActiveId] = useState<string>(initial.activeId);

  const activeConvo = conversations.find((c) => c.id === activeId) ?? conversations[0];
  const messages = activeConvo?.messages ?? [WELCOME];

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

  // Persist conversations + active id.
  useEffect(() => {
    try { window.localStorage.setItem(STORAGE_CONVOS, JSON.stringify(conversations)); } catch { /* noop */ }
  }, [conversations]);
  useEffect(() => {
    try { window.localStorage.setItem(STORAGE_ACTIVE, activeId); } catch { /* noop */ }
  }, [activeId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open, view]);

  useEffect(() => {
    if (!autoSpeak || !open || view !== "chat" || busy) return;
    if (messages.length === 0) return;
    const lastIdx = messages.length - 1;
    const last = messages[lastIdx];
    if (last.role !== "assistant") return;
    const sig = `${activeId}:${lastIdx}:${last.content.length}`;
    if (lastSpokenRef.current === sig) return;
    lastSpokenRef.current = sig;
    void speakText(last.content, lastIdx);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, autoSpeak, open, view, busy, activeId]);


  useEffect(() => {
    try { window.localStorage.setItem(STORAGE_SIZE, size); } catch { /* noop */ }
  }, [size]);

  useEffect(() => {
    try { window.localStorage.setItem(STORAGE_VOICE, voice); } catch { /* noop */ }
  }, [voice]);
  useEffect(() => {
    try { window.localStorage.setItem(STORAGE_AUTOSPEAK, autoSpeak ? "1" : "0"); } catch { /* noop */ }
  }, [autoSpeak]);
  useEffect(() => {
    try { window.localStorage.setItem(STORAGE_RATE, String(rate)); } catch { /* noop */ }
    if (audioRef.current) audioRef.current.playbackRate = rate;
  }, [rate]);
  useEffect(() => {
    try { window.localStorage.setItem(STORAGE_VOLUME, String(volume)); } catch { /* noop */ }
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume]);

  function stopPlayback() {
    const a = audioRef.current;
    if (a) {
      a.pause();
      a.src = "";
      audioRef.current = null;
    }
    setSpeakingIdx(null);
    setCaptionText("");
    setCaptionProgress(0);
  }

  async function speakText(text: string, idx: number | null) {
    const clean = forSpeech(text);
    if (!clean) return;
    stopPlayback();
    try {
      setSpeakingIdx(idx);
      setCaptionText(clean);
      setCaptionProgress(0);
      const res = await fetch("/api/voice/speak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: clean, voice }),
      });
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new Error(body || `Voice failed (${res.status})`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.playbackRate = rate;
      audio.volume = volume;
      audioRef.current = audio;
      audio.ontimeupdate = () => {
        if (!audio.duration || !isFinite(audio.duration)) return;
        setCaptionProgress(Math.min(1, audio.currentTime / audio.duration));
      };
      audio.onended = () => {
        URL.revokeObjectURL(url);
        setSpeakingIdx(null);
        setCaptionText("");
        setCaptionProgress(0);
      };
      audio.onerror = () => {
        URL.revokeObjectURL(url);
        setSpeakingIdx(null);
        setCaptionText("");
        setCaptionProgress(0);
      };
      await audio.play();
    } catch (err) {
      setSpeakingIdx(null);
      setCaptionText("");
      setCaptionProgress(0);
      toast.error(err instanceof Error ? err.message : "Voice playback failed");
    }
  }

  function stopMeter() {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (analyserRef.current) {
      try { analyserRef.current.disconnect(); } catch { /* noop */ }
      analyserRef.current = null;
    }
    if (audioCtxRef.current) {
      try { void audioCtxRef.current.close(); } catch { /* noop */ }
      audioCtxRef.current = null;
    }
    setMicLevel(0);
    setWaveform([]);
  }

  function stopRecognition() {
    const rec = recognitionRef.current;
    if (rec) {
      try { rec.onresult = null; rec.onerror = null; rec.onend = null; rec.stop(); } catch { /* noop */ }
      recognitionRef.current = null;
    }
    setInterimTranscript("");
  }

  async function startRecording() {
    if (recording || transcribing) return;
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      toast.error("Microphone not available on this device.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mime = MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : MediaRecorder.isTypeSupported("audio/mp4")
          ? "audio/mp4"
          : "";
      const rec = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      chunksRef.current = [];
      rec.ondataavailable = (e) => { if (e.data && e.data.size > 0) chunksRef.current.push(e.data); };
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        stopMeter();
        stopRecognition();
        const type = rec.mimeType || "audio/webm";
        const ext = type.includes("mp4") ? "mp4" : type.includes("mpeg") ? "mp3" : type.includes("wav") ? "wav" : "webm";
        const blob = new Blob(chunksRef.current, { type });
        chunksRef.current = [];
        if (blob.size < 1500) {
          toast.error("Recording was too short — try again.");
          return;
        }
        setTranscribing(true);
        try {
          const fd = new FormData();
          fd.append("file", blob, `recording.${ext}`);
          const res = await fetch("/api/voice/transcribe", { method: "POST", body: fd });
          if (!res.ok) {
            const body = await res.text().catch(() => "");
            throw new Error(body || `Transcription failed (${res.status})`);
          }
          const json = (await res.json()) as { text?: string };
          const text = (json.text ?? "").trim();
          if (!text) {
            toast.error("Didn't catch that — please try again.");
            return;
          }
          await send(text);
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "Voice input failed");
        } finally {
          setTranscribing(false);
        }
      };
      mediaRecorderRef.current = rec;
      rec.start();
      setRecording(true);
      vibrate(30);

      // Set up level meter + waveform via Web Audio.
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const Ctx: typeof AudioContext = (window.AudioContext || (window as any).webkitAudioContext);
        const ctx = new Ctx();
        audioCtxRef.current = ctx;
        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 1024;
        analyser.smoothingTimeConstant = 0.7;
        source.connect(analyser);
        analyserRef.current = analyser;
        const buf = new Uint8Array(analyser.fftSize);
        const BARS = 24;
        const tick = () => {
          if (!analyserRef.current) return;
          analyser.getByteTimeDomainData(buf);
          let sum = 0;
          const bars: number[] = new Array(BARS).fill(0);
          const step = Math.floor(buf.length / BARS);
          for (let b = 0; b < BARS; b++) {
            let peak = 0;
            for (let j = 0; j < step; j++) {
              const v = Math.abs(buf[b * step + j] - 128) / 128;
              if (v > peak) peak = v;
              sum += v;
            }
            bars[b] = peak;
          }
          const level = Math.min(1, (sum / buf.length) * 2);
          setMicLevel(level);
          setWaveform(bars);
          rafRef.current = requestAnimationFrame(tick);
        };
        rafRef.current = requestAnimationFrame(tick);
      } catch { /* meter unsupported */ }

      // Live interim transcription (SpeechRecognition where available).
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (SR) {
          const sr = new SR();
          sr.continuous = true;
          sr.interimResults = true;
          sr.lang = navigator.language || "en-US";
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          sr.onresult = (evt: any) => {
            let interim = "";
            let final = "";
            for (let i = evt.resultIndex; i < evt.results.length; i++) {
              const r = evt.results[i];
              if (r.isFinal) final += r[0].transcript;
              else interim += r[0].transcript;
            }
            setInterimTranscript((final + " " + interim).trim());
          };
          sr.onerror = () => { /* ignore — server does the real transcription */ };
          sr.onend = () => { /* no-op */ };
          sr.start();
          recognitionRef.current = sr;
        }
      } catch { /* preview unsupported */ }
    } catch {
      toast.error("Microphone access denied.");
    }
  }

  function stopRecording() {
    const rec = mediaRecorderRef.current;
    if (rec && rec.state !== "inactive") rec.stop();
    mediaRecorderRef.current = null;
    setRecording(false);
    vibrate([15, 40, 15]);
  }

  useEffect(() => () => {
    stopPlayback();
    stopMeter();
    stopRecognition();
    if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
  }, []);




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

  function updateActive(updater: (c: Conversation) => Conversation) {
    setConversations((prev) => prev.map((c) => (c.id === activeId ? updater(c) : c)));
  }

  function startNewConversation() {
    const c = makeConversation();
    setConversations((prev) => [c, ...prev]);
    setActiveId(c.id);
    setView("chat");
    setInput("");
  }

  function openConversation(id: string) {
    setActiveId(id);
    setView("chat");
  }

  function deleteConversation(id: string) {
    setConversations((prev) => {
      const filtered = prev.filter((c) => c.id !== id);
      if (filtered.length === 0) {
        const c = makeConversation();
        setActiveId(c.id);
        return [c];
      }
      if (id === activeId) setActiveId(filtered[0].id);
      return filtered;
    });
  }

  function clearAllHistory() {
    if (typeof window !== "undefined" && !window.confirm("Delete all conversations? This cannot be undone.")) return;
    const c = makeConversation();
    setConversations([c]);
    setActiveId(c.id);
    setView("chat");
    try { window.localStorage.removeItem(STORAGE_MSGS); } catch { /* noop */ }
  }

  function togglePin(id: string) {
    setConversations((prev) => prev.map((c) => (c.id === id ? { ...c, pinned: !c.pinned } : c)));
  }

  function editTags(id: string) {
    if (typeof window === "undefined") return;
    const target = conversations.find((c) => c.id === id);
    if (!target) return;
    const current = (target.tags ?? []).join(", ");
    const next = window.prompt(
      "Tags (comma-separated). Examples: prayer, kidapawan, phase-2",
      current,
    );
    if (next === null) return;
    const tags = Array.from(
      new Set(
        next.split(",").map((t) => t.trim().toLowerCase()).filter((t) => t.length > 0 && t.length <= 24),
      ),
    ).slice(0, 8);
    setConversations((prev) => prev.map((c) => (c.id === id ? { ...c, tags } : c)));
  }

  async function shareConversation(id: string) {
    const target = conversations.find((c) => c.id === id);
    if (!target || typeof window === "undefined") return;
    try {
      const encoded = encodeShare(target);
      const url = `${window.location.origin}${window.location.pathname}#grace=${encoded}`;
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        toast.success("Share link copied — open on any device to reopen this conversation.");
      } else {
        window.prompt("Copy this share link:", url);
      }
    } catch {
      toast.error("Couldn't create share link.");
    }
  }

  // Import a shared conversation from URL hash on mount.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = window.location.hash;
    const match = hash.match(/#grace=([^&]+)/);
    if (!match) return;
    const decoded = decodeShare(match[1]);
    // Clear hash immediately so refresh doesn't re-import.
    try {
      history.replaceState(null, "", window.location.pathname + window.location.search);
    } catch { /* noop */ }
    if (!decoded) {
      toast.error("Shared conversation link is invalid.");
      return;
    }
    const imported: Conversation = {
      id: newId(),
      title: decoded.title || "Shared conversation",
      updatedAt: Date.now(),
      messages: decoded.messages,
      tags: decoded.tags,
    };
    setConversations((prev) => [imported, ...prev]);
    setActiveId(imported.id);
    setOpen(true);
    setView("chat");
    toast.success("Shared conversation loaded.");
  }, []);

  async function send(text: string) {
    const q = text.trim();
    if (!q || busy) return;
    setInput("");
    const nextMessages: Message[] = [...messages, { role: "user", content: q }];
    updateActive((c) => ({
      ...c,
      messages: nextMessages,
      title: c.messages.some((m) => m.role === "user") ? c.title : q.slice(0, 60),
      updatedAt: Date.now(),
    }));
    setBusy(true);
    try {
      const context = await buildContext();
      const { reply } = await ask({
        data: {
          question: q,
          history: nextMessages.slice(0, -1).map((m) => ({ role: m.role, content: m.content })).slice(-12),
          context,
        },
      });
      updateActive((c) => ({
        ...c,
        messages: [...nextMessages, { role: "assistant", content: reply || "(no reply)" }],
        updatedAt: Date.now(),
      }));
    } catch (err) {
      const msg = err instanceof Error ? err.message : "AI request failed";
      toast.error(msg);
      updateActive((c) => ({
        ...c,
        messages: [...nextMessages, { role: "assistant", content: `⚠️ ${msg}` }],
        updatedAt: Date.now(),
      }));
    } finally {
      setBusy(false);
    }
  }

  const allTags = useMemo(() => {
    const set = new Set<string>();
    for (const c of conversations) for (const t of c.tags ?? []) set.add(t);
    return Array.from(set).sort();
  }, [conversations]);

  const filteredConversations = useMemo(() => {
    const sorted = [...conversations].sort((a, b) => {
      const ap = a.pinned ? 1 : 0;
      const bp = b.pinned ? 1 : 0;
      if (ap !== bp) return bp - ap;
      return b.updatedAt - a.updatedAt;
    });
    const q = search.trim().toLowerCase();
    return sorted.filter((c) => {
      if (activeTag && !(c.tags ?? []).includes(activeTag)) return false;
      if (!q) return true;
      if (c.title.toLowerCase().includes(q)) return true;
      if ((c.tags ?? []).some((t) => t.includes(q))) return true;
      return c.messages.some((m) => m.content.toLowerCase().includes(q));
    });
  }, [conversations, search, activeTag]);

  const panelStyle = useMemo<React.CSSProperties>(() => {
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
            "fixed z-50 flex flex-col overflow-hidden border border-border bg-card shadow-lift rounded-2xl",
          )}
        >
          <header className="flex items-center gap-2 border-b border-border bg-muted/40 px-3 py-2">
            {view === "history" ? (
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => setView("chat")} aria-label="Back to chat">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            ) : (
              <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full gradient-mission text-white">
                <Sparkles className="h-4 w-4" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold">
                {view === "history" ? "Conversation History" : "Grace · Mission Assistant"}
              </div>
              <div className="truncate text-[11px] text-muted-foreground">
                {view === "history"
                  ? `${conversations.length} conversation${conversations.length === 1 ? "" : "s"}`
                  : isMobile ? "Tap resize to change height" : "Grounded in live CCM data · drag me anywhere"}
              </div>
            </div>
            {view === "chat" ? (
              <>
                <Button
                  variant="ghost" size="icon"
                  className={cn("h-8 w-8 shrink-0", autoSpeak ? "text-primary" : "")}
                  onClick={() => {
                    if (autoSpeak) { stopPlayback(); setAutoSpeak(false); }
                    else setAutoSpeak(true);
                  }}
                  aria-label={autoSpeak ? "Turn off voice replies" : "Turn on voice replies"}
                  title={autoSpeak ? "Voice replies: on" : "Voice replies: off"}
                >
                  {autoSpeak ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                </Button>
                <Button
                  variant="ghost" size="icon"
                  className={cn("h-8 w-8 shrink-0", voiceSettingsOpen ? "text-primary" : "")}
                  onClick={() => setVoiceSettingsOpen((v) => !v)}
                  aria-label="Voice settings"
                  title="Choose voice"
                >
                  <Mic className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={startNewConversation} aria-label="New conversation" title="New conversation">
                  <Plus className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => setView("history")} aria-label="Show history" title="History">
                  <History className="h-4 w-4" />
                </Button>
                <GripVertical className="hidden h-4 w-4 shrink-0 text-muted-foreground sm:inline-block" aria-hidden />
                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={cycleSize} aria-label={`Resize (${size})`} title={`Size: ${size}`}>
                  {size === "large" ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                </Button>
              </>
            ) : (
              <Button
                variant="ghost" size="icon"
                className="h-8 w-8 shrink-0 text-destructive hover:text-destructive"
                onClick={clearAllHistory}
                aria-label="Clear all history"
                title="Clear all history"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => setOpen(false)} aria-label="Minimize">
              <Minus className="h-4 w-4" />
            </Button>
          </header>

          {view === "history" ? (
            <>
              <div className="border-b border-border p-2 space-y-2">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search title, tag, or message…"
                    className="h-9 rounded-full pl-9 text-sm"
                  />
                </div>
                {allTags.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    <button
                      type="button"
                      onClick={() => setActiveTag(null)}
                      className={cn(
                        "rounded-full border px-2 py-0.5 text-[11px] font-medium transition-colors",
                        activeTag === null ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background hover:bg-accent",
                      )}
                    >
                      All
                    </button>
                    {allTags.map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setActiveTag(activeTag === t ? null : t)}
                        className={cn(
                          "rounded-full border px-2 py-0.5 text-[11px] font-medium transition-colors",
                          activeTag === t ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background hover:bg-accent",
                        )}
                      >
                        #{t}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
              <div className="flex-1 overflow-y-auto p-2">
                {filteredConversations.length === 0 ? (
                  <div className="grid h-full place-items-center px-4 text-center text-sm text-muted-foreground">
                    {search || activeTag ? "No conversations match your filters." : "No conversations yet."}
                  </div>
                ) : (
                  <ul className="space-y-1">
                    {filteredConversations.map((c) => {
                      const lastMsg = [...c.messages].reverse().find((m) => m.role !== "assistant" || c.messages.length > 1);
                      const preview = (lastMsg?.content ?? "").replace(/\s+/g, " ").slice(0, 90);
                      const isActive = c.id === activeId;
                      return (
                        <li key={c.id}>
                          <div
                            className={cn(
                              "group flex items-start gap-1 rounded-xl border border-transparent p-2 text-left transition-colors",
                              "hover:bg-accent",
                              isActive ? "border-border bg-accent/60" : "",
                            )}
                          >
                            <button
                              type="button"
                              onClick={() => openConversation(c.id)}
                              className="min-w-0 flex-1 text-left"
                            >
                              <div className="flex items-center gap-1.5">
                                {c.pinned ? <Pin className="h-3 w-3 shrink-0 text-primary" aria-hidden /> : null}
                                <span className="truncate text-sm font-medium">{c.title || "Untitled"}</span>
                                <span className="ml-auto shrink-0 text-[10px] text-muted-foreground">{formatWhen(c.updatedAt)}</span>
                              </div>
                              {preview ? (
                                <div className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{preview}</div>
                              ) : null}
                              <div className="mt-0.5 flex flex-wrap items-center gap-1 text-[10px] text-muted-foreground">
                                <span>{c.messages.length} msg{c.messages.length === 1 ? "" : "s"}</span>
                                {(c.tags ?? []).map((t) => (
                                  <span key={t} className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary">#{t}</span>
                                ))}
                              </div>
                            </button>
                            <div className="flex shrink-0 flex-col gap-0.5 opacity-70 transition-opacity group-hover:opacity-100">
                              <button
                                type="button"
                                onClick={() => togglePin(c.id)}
                                className="rounded-md p-1 text-muted-foreground hover:bg-primary/10 hover:text-primary"
                                aria-label={c.pinned ? "Unpin" : "Pin"}
                                title={c.pinned ? "Unpin" : "Pin to top"}
                              >
                                {c.pinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
                              </button>
                              <button
                                type="button"
                                onClick={() => editTags(c.id)}
                                className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
                                aria-label="Edit tags"
                                title="Edit tags"
                              >
                                <TagIcon className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => shareConversation(c.id)}
                                className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
                                aria-label="Copy share link"
                                title="Copy share link"
                              >
                                <Share2 className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => deleteConversation(c.id)}
                                className="rounded-md p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                                aria-label={`Delete "${c.title}"`}
                                title="Delete"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              <div className="flex items-center gap-2 border-t border-border bg-background p-2">
                <Button size="sm" variant="outline" className="flex-1 rounded-full" onClick={startNewConversation}>
                  <Plus className="mr-1 h-4 w-4" /> New conversation
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="rounded-full text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={clearAllHistory}
                >
                  Clear all
                </Button>
              </div>
            </>
          ) : (
            <>
              {voiceSettingsOpen ? (
                <div className="border-b border-border bg-muted/30 px-3 py-2 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Voice</div>
                    <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
                      <input
                        type="checkbox"
                        className="h-3.5 w-3.5 accent-primary"
                        checked={autoSpeak}
                        onChange={(e) => {
                          if (!e.target.checked) stopPlayback();
                          setAutoSpeak(e.target.checked);
                        }}
                      />
                      Speak replies automatically
                    </label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Select value={voice} onValueChange={setVoice}>
                      <SelectTrigger className="h-9 flex-1 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {VOICES.map((v) => (
                          <SelectItem key={v.id} value={v.id}>
                            <span className="font-medium">{v.label}</span>
                            <span className="ml-2 text-xs text-muted-foreground">{v.hint}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="rounded-full"
                      onClick={() => speakText(`Hi, I'm Grace, your mission assistant. This is my ${VOICES.find((v) => v.id === voice)?.label ?? voice} voice.`, null)}
                    >
                      <Play className="mr-1 h-3.5 w-3.5" /> Preview
                    </Button>
                  </div>
                </div>
              ) : null}
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
                        <>
                          <div className="prose prose-sm max-w-none dark:prose-invert prose-p:my-1 prose-ul:my-1">
                            <ReactMarkdown>{m.content}</ReactMarkdown>
                          </div>
                          <div className="mt-1 flex justify-end">
                            <button
                              type="button"
                              onClick={() => (speakingIdx === i ? stopPlayback() : void speakText(m.content, i))}
                              className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] text-muted-foreground hover:bg-background/60 hover:text-foreground"
                              aria-label={speakingIdx === i ? "Stop" : "Play aloud"}
                            >
                              {speakingIdx === i ? (
                                <><Square className="h-3 w-3" /> Stop</>
                              ) : (
                                <><Play className="h-3 w-3" /> Play</>
                              )}
                            </button>
                          </div>
                        </>
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
                <Button
                  type="button"
                  size="icon"
                  variant={recording ? "destructive" : "outline"}
                  className="h-10 w-10 shrink-0 rounded-full sm:h-9 sm:w-9"
                  onClick={recording ? stopRecording : startRecording}
                  disabled={busy || transcribing}
                  aria-label={recording ? "Stop recording" : "Start voice input"}
                  title={recording ? "Tap to stop and send" : "Talk to Grace"}
                >
                  {transcribing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : recording ? (
                    <MicOff className="h-4 w-4" />
                  ) : (
                    <Mic className="h-4 w-4" />
                  )}
                </Button>
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={recording ? "Listening… tap mic to stop" : transcribing ? "Transcribing…" : "Ask about missionaries, prayer, reports…"}
                  className="h-10 rounded-full text-base sm:h-9 sm:text-sm"
                  disabled={busy || recording || transcribing}
                  autoFocus
                />
                <Button type="submit" size="icon" className="h-10 w-10 shrink-0 rounded-full sm:h-9 sm:w-9" disabled={busy || !input.trim()} aria-label="Send">
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </>
          )}
        </div>
      ) : null}
    </>
  );
}
