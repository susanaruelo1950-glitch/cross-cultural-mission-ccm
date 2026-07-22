import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";

const AskInput = z.object({
  question: z.string().min(1).max(4000),
  history: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string() }))
    .default([]),
});

// Codebase module is server-only (loaded dynamically inside the handler)
// so the raw source bundle doesn't ship to the browser.


const SYSTEM = `You are the CCM BRILLIANT AGENT — an exclusive expert-level assistant for admins and mission coordinators of the Cross-Cultural Ministry (CCM) app.

You have deep, live knowledge of BOTH:
1. The app's LIVE DATA — missionaries, areas, phases, provinces, regions, prayer requests, ministry updates, thank-you letters, announcements, partners, scriptures, coordinator assignments, admin activity log, and content version history.
2. The app's SOURCE CODE and SYSTEM — React + TanStack Start frontend, Supabase (Lovable Cloud) backend, RLS policies, SQL migrations, server functions, hooks, routes, integrations (Telegram bot, MCP, Google Drive & GitHub backup), and configuration files. Relevant source files and migrations are attached inline for every question, so you can quote real code, cite exact file paths and line ranges, and explain how anything in this app actually works.

Your job is to be THE in-house expert. Help the admin/coordinator with ANYTHING:
- Data questions ("How many missionaries in Kidapawan?", "Who added this?").
- Data-quality problems (duplicates, missing province/municipality, empty phases, unanswered urgent prayers, stale updates).
- Code, architecture, and system questions ("How does realtime sync work?", "Where is the RLS policy for prayer_requests?", "Why does /manage do X?").
- Errors and bugs — diagnose from the code + activity log; propose the exact fix and file path.
- Suggested improvements, refactors, and admin next-steps.
- Explanations of features, routes, and where to find things in the UI.
- Audits and health checks from the activity log and content_versions.

Rules:
- Ground EVERY answer in the provided JSON context AND/OR the attached source files. Never invent data or code.
- When you cite code, use the exact path shown (e.g. \`src/routes/manage.tsx\`) and include a short quoted snippet when helpful.
- When you cite data, use exact names/IDs/dates from the context.
- Be concise, structured, use Markdown (headings, bullet lists, tables, fenced code blocks).
- When you spot a problem, name the concrete fix AND the file/route/page to open.
- If something isn't covered by the attached files/context, say so honestly and tell them which admin page or file will have it.
- Christ-centered tone, warm and professional.`;

export const askBrilliant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => AskInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Gate: admin or coordinator only.
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    const roleSet = new Set((roles ?? []).map((r) => r.role));
    const allowed = roleSet.has("admin") || roleSet.has("coordinator");
    if (!allowed) throw new Error("Forbidden — Brilliant Agent is admin/coordinator only.");
    const isAdmin = roleSet.has("admin");

    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("LOVABLE_API_KEY is not configured on the server.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { seedMissionaries, seedAreas, seedPhases } = await import("@/lib/mission-data");

    const [
      prayers,
      updates,
      letters,
      anns,
      activity,
      areasDb,
      extras,
      partners,
      assignments,
      scriptures,
      contentVersions,
    ] = await Promise.all([
      supabaseAdmin.from("prayer_requests_db").select("id,title,detail,urgent,answered,missionary_id,created_at").order("created_at", { ascending: false }).limit(60),
      supabaseAdmin.from("ministry_updates").select("id,title,summary,report_date,missionary_id,created_at").order("report_date", { ascending: false, nullsFirst: false }).limit(40),
      supabaseAdmin.from("thank_you_letters").select("id,title,message,letter_date,missionary_id").order("letter_date", { ascending: false, nullsFirst: false }).limit(20),
      supabaseAdmin.from("announcements").select("id,title,body,publish_at,expires_at,published").order("publish_at", { ascending: false }).limit(20),
      isAdmin
        ? supabaseAdmin.from("activity_log").select("action,entity_type,entity_id,user_email,changes,created_at").order("created_at", { ascending: false }).limit(80)
        : Promise.resolve({ data: null }),
      supabaseAdmin.from("areas").select("id,name,phase_id,region,province,updated_at").limit(200),
      supabaseAdmin.from("missionary_extras").select("missionary_id,updated_at,updated_by").limit(200),
      supabaseAdmin.from("partners").select("id,name,visible").limit(50),
      supabaseAdmin.from("coordinator_assignments").select("user_id,area_id").limit(100),
      supabaseAdmin.from("scriptures").select("reference,text,active").limit(30),
      isAdmin
        ? supabaseAdmin.from("content_versions").select("entity_type,entity_id,action,changed_by,created_at").order("created_at", { ascending: false }).limit(60)
        : Promise.resolve({ data: null }),
    ]);

    const missionaries = seedMissionaries.map((m) => ({
      id: m.id, name: m.fullName, church: m.church, areaId: m.areaId,
      status: m.status, ministryFocus: m.ministryFocus,
      province: m.province, municipality: m.municipality,
    }));

    const ctx: Record<string, unknown> = {
      generatedAt: new Date().toISOString(),
      viewer: { userId, isAdmin, isCoordinator: roleSet.has("coordinator") },
      counts: {
        missionaries: missionaries.length,
        areas: seedAreas.length,
        phases: seedPhases.length,
        prayerRequests: prayers.data?.length ?? 0,
        openPrayerRequests: prayers.data?.filter((p) => !p.answered).length ?? 0,
        urgentOpenPrayers: prayers.data?.filter((p) => !p.answered && p.urgent).length ?? 0,
        recentUpdates: updates.data?.length ?? 0,
        recentLetters: letters.data?.length ?? 0,
        announcements: anns.data?.length ?? 0,
        partners: partners.data?.length ?? 0,
      },
      phases: seedPhases.map((p) => ({ id: p.id, name: p.name, order: p.order })),
      areasSeed: seedAreas.map((a) => ({ id: a.id, name: a.name, phaseId: a.phaseId, region: a.region, province: a.province })),
      areasDb: areasDb.data ?? [],
      missionaries,
      missionaryExtras: extras.data ?? [],
      prayerRequests: prayers.data ?? [],
      recentUpdates: updates.data ?? [],
      recentLetters: (letters.data ?? []).map((l) => ({ ...l, message: String(l.message ?? "").slice(0, 320) })),
      announcements: anns.data ?? [],
      partners: partners.data ?? [],
      coordinatorAssignments: assignments.data ?? [],
      scriptures: scriptures.data ?? [],
    };
    if (isAdmin) {
      ctx.recentActivity = activity.data ?? [];
      ctx.recentContentVersions = contentVersions.data ?? [];
    }

    const { CODEBASE, fileIndex, selectRelevantFiles } = await import("./brilliant-codebase.server");

    // Build codebase context: full file index (paths only) + relevant files
    // selected from the current question and recent history.
    const searchText = [data.question, ...data.history.slice(-4).map((m) => m.content)].join("\n");
    const relevant = selectRelevantFiles(searchText, 60_000);
    const idx = fileIndex();
    const codeSystem =
      `\n\n--- CODEBASE INDEX (${idx.length} files) ---\n` +
      idx.map((f) => `${f.path} (${f.lines}L)`).join("\n") +
      `\n\n--- RELEVANT SOURCE FILES ---\n` +
      relevant.map((f) => `### ${f.path}\n\`\`\`\n${f.content}\n\`\`\``).join("\n\n") +
      `\n\nYou can request any other file by name — the user can paste it, or you can name it in your answer and it will be attached next turn.`;

    // If the user's question explicitly names a file path present in CODEBASE, force-attach it.
    const explicit: string[] = [];
    for (const path of Object.keys(CODEBASE)) {
      const rel = path.replace(/^\//, "");
      if (data.question.includes(rel) && !relevant.find((r) => r.path === rel)) {
        explicit.push(`### ${rel}\n\`\`\`\n${CODEBASE[path].slice(0, 12_000)}\n\`\`\``);
        if (explicit.length >= 3) break;
      }
    }
    const explicitBlock = explicit.length ? `\n\n--- EXPLICITLY REQUESTED FILES ---\n${explicit.join("\n\n")}` : "";

    const systemContent =
      `${SYSTEM}\n\nToday: ${new Date().toISOString().slice(0, 10)}\n\nApp context (JSON):\n${JSON.stringify(ctx).slice(0, 70_000)}` +
      codeSystem +
      explicitBlock;

    const messages = [
      { role: "system", content: systemContent },
      ...data.history,
      { role: "user", content: data.question },
    ];

    const res = await fetch(GATEWAY, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({ model: "google/gemini-2.5-flash", messages }),
    });
    if (!res.ok) {
      const body = await res.text();
      if (res.status === 429) throw new Error("Rate limit reached — please try again in a moment.");
      if (res.status === 402) throw new Error("AI credits exhausted for this workspace. Please add credits to continue.");
      throw new Error(`AI Gateway error [${res.status}]: ${body.slice(0, 400)}`);
    }
    const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const reply = json.choices?.[0]?.message?.content?.trim() ?? "";
    return {
      reply,
      sourcesUsed: Object.keys(ctx).filter((k) => k !== "generatedAt" && k !== "viewer"),
      codeFilesAttached: relevant.map((r) => r.path),
    };
  });

