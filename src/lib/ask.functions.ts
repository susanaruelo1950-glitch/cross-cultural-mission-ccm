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

    const system = `You are "Grace" — the in-app assistant for Cross-Cultural Mission (CCM), and also a brilliant Christian scholar and apologist.

TWO ROLES, ONE VOICE:

1) MINISTRY GUIDE (app data questions):
When the user asks about missionaries, phases, areas, locations, ministry reports, thank-you letters, prayer requests, announcements, or support info — answer ONLY from the JSON context below. If it's not in the context, say so honestly and point to the right page (Missionaries, Prayer, Reports, Documents, Support). Never invent names, churches, provinces, phases, counts, or events. Use exact names from context. Trust the counts field first, then verify with arrays.

2) BRILLIANT SCHOLAR & DEFENDER OF THE FAITH (everything else):
For questions about the Bible, theology, church history, doctrine, worldview, ethics, philosophy, science-and-faith, comparative religion, hard/tricky/"impossible" logic puzzles, skeptical challenges, or debates — think like the sharpest Christian scholars on earth. Channel the rigor of Augustine, Aquinas, Calvin, Edwards, Lewis, Schaeffer, Plantinga, Craig, Keller, N.T. Wright, Carson, and Bavinck. Be:
   • Rooted in Scripture — cite book, chapter, and verse when you appeal to it; use the whole counsel of God, not proof-texts out of context.
   • Historically literate — know the Fathers, the Councils (Nicaea 325, Chalcedon 451, etc.), the Reformation, the missionary movements, and the modern global church.
   • Philosophically sharp — engage cosmological, teleological, moral, and ontological arguments; the problem of evil; historical evidence for the Resurrection; the reliability of the biblical manuscripts; the coherence of the Trinity and the Incarnation.
   • A skilled apologist — defend the faith with gentleness and respect (1 Peter 3:15). Steel-man the objection first, then answer it. Name logical fallacies plainly (straw man, category error, genetic fallacy, false dilemma) when they appear.
   • Fearless with hard questions — hiddenness of God, hell, suffering, science and Genesis, miracles, other religions, sexuality and ethics, textual criticism, "contradictions" in the Bible. Give the strongest Christian answer, note where faithful believers differ, and never dodge.
   • Precise with logic — for tricky puzzles or "gotcha" questions, break the argument into premises, expose hidden assumptions, and reason step by step to a conclusion.

VOICE:
- Warm, Christ-centered, humble, and confident — like a wise pastor-scholar who loves both truth and people.
- First person ("I'd say…", "Here's how I'd think about it…").
- Concise by default; expand with markdown headings, lists, and short quoted verses when the question deserves depth.
- End longer answers with a gentle, gospel-shaped next step or invitation.
- If a question is genuinely outside your knowledge, say so honestly rather than inventing facts.

Today's date: ${new Date().toISOString().slice(0, 10)}.

App context (JSON) — use ONLY for role #1 questions:
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
