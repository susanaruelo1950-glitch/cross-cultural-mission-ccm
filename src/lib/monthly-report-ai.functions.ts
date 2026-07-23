import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const MissionaryStatus = z.object({
  fullName: z.string(),
  church: z.string().optional().nullable(),
  areaName: z.string().optional().nullable(),
  hasUpdate: z.boolean(),
  hasLetter: z.boolean(),
  hasReceipt: z.boolean(),
  receivedAmount: z.number(),
  updateTitles: z.array(z.string()).default([]),
  letterTitles: z.array(z.string()).default([]),
  receiptTitles: z.array(z.string()).default([]),
});

const Input = z.object({
  monthLabel: z.string().min(1),
  totals: z.object({
    total: z.number(),
    complete: z.number(),
    withUpd: z.number(),
    withLet: z.number(),
    withRec: z.number(),
    totalReceived: z.number(),
  }),
  rows: z.array(MissionaryStatus),
  newMissionaries: z.array(z.object({ fullName: z.string(), church: z.string().optional().nullable() })).default([]),
  announcements: z.array(z.object({ title: z.string(), body: z.string().optional().nullable() })).default([]),
  supervisorName: z.string().optional().default(""),
  senderName: z.string().optional().default(""),
  tone: z.enum(["formal", "concise", "pastoral"]).default("formal"),
});

const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";

export const generateMonthlySummary = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => Input.parse(raw))
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("LOVABLE_API_KEY is not configured on the server.");

    const submitted = data.rows.filter((r) => r.hasUpdate || r.hasLetter || r.hasReceipt);
    const pending = data.rows.filter((r) => !(r.hasUpdate && r.hasLetter && r.hasReceipt));

    const brief = `MONTH: ${data.monthLabel}
SUPERVISOR: ${data.supervisorName || "(unspecified)"}
FROM: ${data.senderName || "(unspecified)"}
TONE: ${data.tone}

TOTALS:
- Missionaries: ${data.totals.total}
- Fully submitted: ${data.totals.complete}
- Ministry updates filed: ${data.totals.withUpd}
- Thank-you letters filed: ${data.totals.withLet}
- Support receipts filed: ${data.totals.withRec}
- Total support received (PHP): ${data.totals.totalReceived.toLocaleString()}

SUBMITTED (${submitted.length}):
${submitted.map((r) => `- ${r.fullName}${r.areaName ? ` (${r.areaName})` : ""} — update:${r.hasUpdate ? "Y" : "N"} letter:${r.hasLetter ? "Y" : "N"} receipt:${r.hasReceipt ? "Y" : "N"} received:PHP ${r.receivedAmount.toLocaleString()}`).join("\n") || "(none)"}

PENDING (${pending.length}):
${pending.map((r) => {
  const missing = [!r.hasUpdate && "update", !r.hasLetter && "letter", !r.hasReceipt && "receipt"].filter(Boolean).join(", ");
  return `- ${r.fullName}${r.areaName ? ` (${r.areaName})` : ""} — missing: ${missing}`;
}).join("\n") || "(none)"}

NEW MISSIONARIES ADDED THIS MONTH (${data.newMissionaries.length}):
${data.newMissionaries.map((n) => `- ${n.fullName}${n.church ? ` — ${n.church}` : ""}`).join("\n") || "(none)"}

ANNOUNCEMENTS / APPROVALS (${data.announcements.length}):
${data.announcements.map((a) => `- ${a.title}${a.body ? `: ${a.body.slice(0, 200)}` : ""}`).join("\n") || "(none)"}`;

    const system = `You are an executive assistant for the Cross-Cultural Ministry (CCM), preparing a formal monthly report for a ministry supervisor / head.

Write a polished, submission-ready report in clean plain text (no markdown symbols like # or **). Use these sections exactly, each as an ALL-CAPS heading on its own line:

SUBJECT
EXECUTIVE SUMMARY
COMPLIANCE OVERVIEW
FINANCIAL SUMMARY
FIELD HIGHLIGHTS
PENDING & FOLLOW-UP
NEW MISSIONARIES
ANNOUNCEMENTS & APPROVALS
RECOMMENDATIONS
CLOSING

Rules:
- Address the supervisor by name if given; otherwise use "Dear Supervisor,".
- Sign off with the sender's name if given; otherwise "— CCM Administration".
- Be factual. Do NOT invent numbers, names, testimonies, or events. Use only the data below.
- Use crisp, professional English. Short paragraphs. Use bulleted lists (with "•") only inside sections where a list is clearly clearer than prose.
- Format currency as "PHP 12,345".
- Compute and mention the submission compliance rate (fully_submitted / total, as a percentage).
- Keep the report roughly 400–700 words unless the data is very sparse.`;

    const res = await fetch(GATEWAY, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: system },
          { role: "user", content: `Please draft the monthly report using ONLY this data:\n\n${brief}` },
        ],
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      if (res.status === 429) throw new Error("Rate limit reached — please try again in a moment.");
      if (res.status === 402) throw new Error("AI credits exhausted for this workspace. Add credits in Lovable settings.");
      throw new Error(`AI Gateway error [${res.status}]: ${body}`);
    }

    const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const report = json.choices?.[0]?.message?.content?.trim() ?? "";
    return { report };
  });
