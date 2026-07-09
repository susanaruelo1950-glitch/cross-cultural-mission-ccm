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
      announcements: z.array(z.string()).default([]),
    })
    .default({
      generatedAt: new Date().toISOString(),
      counts: {},
      phases: [],
      areas: [],
      missionaries: [],
      recentReports: [],
      openPrayerRequests: [],
      announcements: [],
    }),
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

    const system = `You are the Cross-Cultural Mission (CCM) in-app assistant.
You help supporters, coordinators, and admins understand the ministry.
Answer ONLY using facts in the JSON context below. If the answer is not in
the context, say so honestly and suggest which page (Missionaries, Prayer,
Reports, Documents, Admin) the user should visit next.

Rules:
- Be Christ-centered, warm, concise, and factual.
- Never invent missionaries, churches, provinces, phases, counts, or events.
- When you cite a missionary or area, use the exact name from the context.
- When asked about numbers ("how many"), use the counts field first, then verify against arrays.
- Prefer short bullet lists over paragraphs. Use markdown.
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
