import { createFileRoute } from "@tanstack/react-router";
import { createHash, timingSafeEqual } from "crypto";

const GATEWAY = "https://connector-gateway.lovable.dev/telegram";
const AI_GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";

function deriveWebhookSecret(apiKey: string): string {
  return createHash("sha256").update(`telegram-webhook:${apiKey}`).digest("base64url");
}

function safeEqual(a: string, b: string): boolean {
  const l = Buffer.from(a);
  const r = Buffer.from(b);
  return l.length === r.length && timingSafeEqual(l, r);
}

async function tg(method: string, body: unknown) {
  const res = await fetch(`${GATEWAY}/${method}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.LOVABLE_API_KEY}`,
      "X-Connection-Api-Key": process.env.TELEGRAM_API_KEY!,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) console.error(`[telegram] ${method} ${res.status}: ${await res.text()}`);
  return res;
}

async function sendMessage(chatId: number, text: string) {
  // Telegram limits messages to 4096 chars
  const chunks: string[] = [];
  let remaining = text;
  while (remaining.length > 4000) {
    const cut = remaining.lastIndexOf("\n", 4000);
    const at = cut > 2000 ? cut : 4000;
    chunks.push(remaining.slice(0, at));
    remaining = remaining.slice(at);
  }
  chunks.push(remaining);
  for (const c of chunks) {
    await tg("sendMessage", { chat_id: chatId, text: c, parse_mode: "Markdown" });
  }
}

async function buildContext(isAdmin: boolean) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const [missionaries, areas, phases, prayers, updates, letters, anns, activity] = await Promise.all([
    supabaseAdmin.from("missionaries" as never).select("id,full_name,church,area_id,status,province,municipality").limit(500),
    supabaseAdmin.from("areas" as never).select("id,name,phase_id,region,province").limit(200),
    supabaseAdmin.from("phases" as never).select("id,name,phase_order").limit(50),
    supabaseAdmin.from("prayer_requests_db").select("title,detail,urgent,answered,missionary_id,created_at").eq("answered", false).order("created_at", { ascending: false }).limit(30),
    supabaseAdmin.from("ministry_updates").select("title,summary,report_date,missionary_id").order("report_date", { ascending: false, nullsFirst: false }).limit(20),
    supabaseAdmin.from("thank_you_letters").select("title,message,letter_date,missionary_id").order("letter_date", { ascending: false, nullsFirst: false }).limit(10),
    supabaseAdmin.from("announcements").select("title,body,publish_at,expires_at,published").eq("published", true).order("publish_at", { ascending: false }).limit(10),
    isAdmin
      ? supabaseAdmin.from("activity_logs" as never).select("action,entity_type,entity_id,user_email,created_at,changes").order("created_at", { ascending: false }).limit(40)
      : Promise.resolve({ data: null }),
  ]);

  const ctx: Record<string, unknown> = {
    generatedAt: new Date().toISOString(),
    counts: {
      missionaries: missionaries.data?.length ?? 0,
      areas: areas.data?.length ?? 0,
      phases: phases.data?.length ?? 0,
      openPrayerRequests: prayers.data?.length ?? 0,
      recentUpdates: updates.data?.length ?? 0,
      recentLetters: letters.data?.length ?? 0,
      announcements: anns.data?.length ?? 0,
    },
    phases: phases.data ?? [],
    areas: areas.data ?? [],
    missionaries: missionaries.data ?? [],
    openPrayerRequests: prayers.data ?? [],
    recentUpdates: updates.data ?? [],
    recentLetters: (letters.data ?? []).map((l) => ({ ...l, message: (l.message ?? "").slice(0, 240) })),
    announcements: anns.data ?? [],
  };
  if (isAdmin) ctx.recentActivity = activity.data ?? [];
  return ctx;
}

const USER_SYSTEM = `You are the Cross-Cultural Mission (CCM) Telegram assistant.
Answer ONLY from the JSON context. If missing, say so.
Be warm, Christ-centered, concise. Prefer short bullet lists. Use Markdown.
Never invent names, numbers, or events.`;

const ADMIN_SYSTEM = `You are the CCM SUPER AGENT — an admin-only monitor and advisor for the Cross-Cultural Mission app.
You have full read access to app data plus recent activity logs.
Your job: help the admin spot issues, redundancies, data quality problems, missing info, stale content, and suggest concrete fixes/improvements.

When answering:
- Identify problems proactively (missing province/municipality, duplicate names, missionaries without areas, stale updates, unanswered urgent prayers, missing letters, empty phases).
- Give actionable next steps ("Open /manage → Kidapawan → …").
- Be concise, structured, use Markdown headings and bullet lists.
- Cite exact names/IDs from the context. Never invent data.
- If the admin asks for status, provide a health summary: totals, gaps, warnings, urgent items.`;

async function askAI(system: string, ctx: unknown, question: string) {
  const messages = [
    { role: "system", content: `${system}\n\nToday: ${new Date().toISOString().slice(0, 10)}\n\nApp context (JSON):\n${JSON.stringify(ctx).slice(0, 60_000)}` },
    { role: "user", content: question },
  ];
  const res = await fetch(AI_GATEWAY, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.LOVABLE_API_KEY}` },
    body: JSON.stringify({ model: "google/gemini-2.5-flash", messages }),
  });
  if (!res.ok) {
    const t = await res.text();
    if (res.status === 429) return "⏳ Rate limit reached — please try again in a moment.";
    if (res.status === 402) return "💳 AI credits exhausted for this workspace. Please add credits.";
    return `⚠️ AI error [${res.status}]: ${t.slice(0, 300)}`;
  }
  const j = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  return j.choices?.[0]?.message?.content?.trim() || "(no reply)";
}

async function ensureUser(chatId: number, username?: string, firstName?: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin.from("telegram_users" as never).select("*").eq("chat_id", chatId).maybeSingle();
  if (!data) {
    await supabaseAdmin.from("telegram_users" as never).insert({ chat_id: chatId, username, first_name: firstName });
    return { chat_id: chatId, is_admin: false } as { chat_id: number; is_admin: boolean };
  }
  await supabaseAdmin.from("telegram_users" as never).update({ last_seen_at: new Date().toISOString(), username, first_name: firstName }).eq("chat_id", chatId);
  return data as { chat_id: number; is_admin: boolean };
}

async function claimAdmin(chatId: number, passcode: string): Promise<boolean> {
  const expected = process.env.TELEGRAM_ADMIN_PASSCODE;
  if (!expected || passcode.trim() !== expected) return false;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  await supabaseAdmin.from("telegram_users" as never).update({ is_admin: true }).eq("chat_id", chatId);
  return true;
}

const HELP_USER = `*CCM Assistant Commands*
/start — welcome
/help — this help
/status — quick app snapshot
/admin <passcode> — unlock Super Agent (admin only)

Or just ask any question about missionaries, areas, prayer requests, updates, letters, or announcements.`;

const HELP_ADMIN = `*CCM Super Agent (Admin)*
You are unlocked. Ask anything about the app — issues, improvements, data quality, redundancies, gaps.

Commands:
/status — full health check
/issues — surface problems and suggested fixes
/improve — improvement suggestions
/user — switch to user assistant mode (this session)
/help — this help`;

export const Route = createFileRoute("/api/public/telegram/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!process.env.TELEGRAM_API_KEY) return new Response("not configured", { status: 500 });

        const expected = deriveWebhookSecret(process.env.TELEGRAM_API_KEY);
        const got = request.headers.get("X-Telegram-Bot-Api-Secret-Token") ?? "";
        if (!safeEqual(got, expected)) return new Response("Unauthorized", { status: 401 });

        const update = (await request.json()) as {
          message?: {
            chat: { id: number };
            from?: { username?: string; first_name?: string };
            text?: string;
          };
        };
        const msg = update.message;
        if (!msg?.chat?.id || !msg.text) return Response.json({ ok: true, ignored: true });

        const chatId = msg.chat.id;
        const text = msg.text.trim();
        const user = await ensureUser(chatId, msg.from?.username, msg.from?.first_name);

        try {
          if (text === "/start") {
            await sendMessage(chatId, `👋 Welcome to *Cross-Cultural Mission*!\n\n${HELP_USER}`);
            return Response.json({ ok: true });
          }
          if (text === "/help") {
            await sendMessage(chatId, user.is_admin ? HELP_ADMIN : HELP_USER);
            return Response.json({ ok: true });
          }
          if (text.startsWith("/admin")) {
            const code = text.slice(6).trim();
            if (!code) {
              await sendMessage(chatId, "Usage: `/admin <passcode>`");
              return Response.json({ ok: true });
            }
            const ok = await claimAdmin(chatId, code);
            await sendMessage(chatId, ok ? `✅ Super Agent unlocked.\n\n${HELP_ADMIN}` : "❌ Invalid passcode.");
            return Response.json({ ok: true });
          }
          if (text === "/whoami") {
            await sendMessage(chatId, `chat_id: \`${chatId}\`\nrole: ${user.is_admin ? "admin (Super Agent)" : "user"}`);
            return Response.json({ ok: true });
          }

          const isAdmin = user.is_admin;
          const ctx = await buildContext(isAdmin);

          let question = text;
          if (text === "/status") question = isAdmin ? "Give me a full health check of the app: totals, urgent prayer requests, stale updates, data gaps, and recent admin activity." : "Give me a quick snapshot: totals of missionaries, areas, phases, open prayer requests, recent updates, and announcements.";
          else if (text === "/issues" && isAdmin) question = "Scan the app data and list current issues: duplicate/near-duplicate missionary names, missing province/municipality, missionaries without an area, urgent unanswered prayers, stale ministry updates (>90 days), empty phases. Provide concrete fixes.";
          else if (text === "/improve" && isAdmin) question = "Suggest concrete improvements to the app data and workflows based on what you see: gaps to fill, content to refresh, and admin actions to take.";

          const reply = await askAI(isAdmin ? ADMIN_SYSTEM : USER_SYSTEM, ctx, question);
          await sendMessage(chatId, reply);
          return Response.json({ ok: true });
        } catch (e) {
          console.error("[telegram] handler error", e);
          await sendMessage(chatId, `⚠️ Something went wrong: ${(e as Error).message}`);
          return Response.json({ ok: true });
        }
      },
    },
  },
});
