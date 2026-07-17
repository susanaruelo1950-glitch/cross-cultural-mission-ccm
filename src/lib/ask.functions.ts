import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";

const AskInput = z.object({
  question: z.string().min(1).max(2000),
  history: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string() }))
    .default([]),
  /** Compact snapshot of app data assembled on the client. Keep it under ~30KB. */
  context: z
    .object({
      generatedAt: z.string(),
      counts: z.record(z.string(), z.number()).default({}),
      phases: z.array(z.any()).default([]),
      areas: z.array(z.any()).default([]),
      missionaries: z.array(z.any()).default([]),
      recentReports: z.array(z.any()).default([]),
      openPrayerRequests: z.array(z.any()).default([]),
      recentUpdates: z.array(z.any()).default([]),
      recentLetters: z.array(z.any()).default([]),
      announcements: z.array(z.any()).default([]),
      sources: z.array(z.string()).default([]),
    })
    .partial()
    .default({}),
});


/**
 * Grounded chat over the current in-app directory. The client hands us a
 * compact snapshot (phases, areas, missionary summaries, latest reports,
 * open prayer requests, announcements) and the model must only answer using
 * that data. Anything not in the snapshot → say so.
 */
export const askAssistant = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => AskInput.parse(input))
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("LOVABLE_API_KEY is not configured on the server.");

    const system = `You are "Grace", the friendly in-app assistant for Cross-Cultural Mission (CCM).
You help visitors, supporters, coordinators, and admins understand the ministry —
missionaries, phases, areas, locations, ministry reports, thank-you letters,
prayer requests, announcements, and support info. Answer ONLY using facts in
the JSON context below. If something is not in the context, say so honestly and
point to the right page (Missionaries, Prayer, Reports, Documents, Support).

Personality & voice:
- Warm, Christ-centered, professional, and human — like a helpful ministry coordinator.
- Speak naturally in the first person ("I can see…", "Here's what I found…").
- Concise. Prefer short intros followed by tidy markdown lists or small tables.
- Use headings/bold for structure when giving multi-part answers.
- Never invent names, churches, provinces, phases, counts, or events.
- Use exact names from context when citing a missionary/area.
- For "how many" questions, trust the counts field first, then verify with arrays.
- End longer answers with a brief, useful next step ("Would you like…?").
- Today's date: ${new Date().toISOString().slice(0, 10)}.

App context (JSON):
${JSON.stringify(data.context).slice(0, 30_000)}`;

    const messages: Array<{ role: string; content: string }> = [
      { role: "system", content: system },
      ...data.history,
      { role: "user", content: data.question },
    ];

    const res = await fetch(GATEWAY, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({ model: "google/gemini-2.5-flash", messages }),
    });

    if (!res.ok) {
      const body = await res.text();
      if (res.status === 429) throw new Error("Rate limit reached — please try again in a moment.");
      if (res.status === 402)
        throw new Error("AI credits exhausted for this workspace. Please add credits to continue.");
      throw new Error(`AI Gateway error [${res.status}]: ${body}`);
    }

    const json = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const reply = json.choices?.[0]?.message?.content?.trim() ?? "";
    return { reply };
  });
