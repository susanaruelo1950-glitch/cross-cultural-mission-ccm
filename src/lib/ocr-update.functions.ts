import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const OcrInput = z.object({
  imageDataUrl: z
    .string()
    .min(20)
    .refine((s) => s.startsWith("data:image/"), "Must be a data:image/... URL"),
  filenameHint: z.string().max(300).optional(),
});

export type OcrFieldConfidence = "high" | "medium" | "low" | null;

export interface UpdateOcrResult {
  date: string | null; // ISO YYYY-MM-DD
  title: string | null; // suggested heading, e.g. "Month of January 2026"
  summary: string | null; // one-line caption
  body: string | null; // longer notes / detected text
  confidence: "high" | "medium" | "low" | null;
  fieldConfidence: {
    date: OcrFieldConfidence;
    title: OcrFieldConfidence;
    summary: OcrFieldConfidence;
    body: OcrFieldConfidence;
  };
  raw: string | null;
}

const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";

const SYSTEM = `You extract structured data from a photo of a Filipino church-planting ministry activity so it can prefill a monthly ministry-update form. Read every visible date, banner, sign, caption, or handwritten note in the photo. Return STRICT JSON only — no prose, no code fences.

Schema:
{
  "date": "YYYY-MM-DD" or null,
  "title": string or null,
  "summary": string or null,
  "body": string or null,
  "confidence": "high"|"medium"|"low",
  "fieldConfidence": {
    "date": "high"|"medium"|"low"|null,
    "title": "high"|"medium"|"low"|null,
    "summary": "high"|"medium"|"low"|null,
    "body": "high"|"medium"|"low"|null
  },
  "raw": string
}

Rules:
- Prefer a date visible in the photo itself (banner, tarpaulin, sign, timestamp). If none is visible, use the filename hint if given. Convert dates like "22/07/2026", "Jul 22, 2026", "22 Jul 2026" to ISO. Assume the current year only when a year is missing.
- ALWAYS produce a "title" of the exact form: "Month of <FullMonthName> <Year>" derived from the detected date (e.g. "Month of January 2026"). If no date is detected, set title to null.
- "summary": one short caption (max ~120 chars) describing what the photo shows (e.g. "Sunday worship at Kidapawan outreach").
- "body": a slightly longer 1-3 sentence description of the activity, plus any visible text transcribed. Keep it factual — never invent people, places, or numbers.
- Rate fieldConfidence honestly: "high" only when clearly read, "low" when guessed. If a field is unreadable or unknown, set both its value AND its fieldConfidence to null.`;

export const ocrMinistryUpdate = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => OcrInput.parse(input))
  .handler(async ({ data }): Promise<UpdateOcrResult> => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("LOVABLE_API_KEY is not configured on the server.");

    const userText = data.filenameHint
      ? `Filename hint (may contain a date): ${data.filenameHint}\n\nExtract date, a monthly title of the form "Month of <Month> <Year>", a short summary, and a longer body from this ministry activity photo. Return JSON only.`
      : `Extract date, a monthly title of the form "Month of <Month> <Year>", a short summary, and a longer body from this ministry activity photo. Return JSON only.`;

    const res = await fetch(GATEWAY, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM },
          {
            role: "user",
            content: [
              { type: "text", text: userText },
              { type: "image_url", image_url: { url: data.imageDataUrl } },
            ],
          },
        ],
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      if (res.status === 429) throw new Error("Rate limit reached — please try again in a moment.");
      if (res.status === 402)
        throw new Error("AI credits exhausted for this workspace. Add credits in Lovable settings.");
      throw new Error(`AI Gateway error [${res.status}]: ${body}`);
    }

    const json = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const text = json.choices?.[0]?.message?.content?.trim() ?? "";

    const cleaned = text.replace(/^```(?:json)?/i, "").replace(/```$/g, "").trim();
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    const jsonSlice = start >= 0 && end > start ? cleaned.slice(start, end + 1) : cleaned;

    let parsed: Record<string, unknown> = {};
    try {
      parsed = JSON.parse(jsonSlice) as Record<string, unknown>;
    } catch {
      return {
        date: null,
        title: null,
        summary: null,
        body: null,
        confidence: "low",
        fieldConfidence: { date: null, title: null, summary: null, body: null },
        raw: text || null,
      };
    }

    const dateRaw = typeof parsed.date === "string" ? parsed.date : null;
    const date = dateRaw && /^\d{4}-\d{2}-\d{2}$/.test(dateRaw) ? dateRaw : null;

    const str = (v: unknown, max: number) =>
      typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null;

    // Always derive the title from the detected date so it matches "Month of <Month> <Year>".
    let title = str(parsed.title, 200);
    if (date) {
      const d = new Date(`${date}T00:00:00Z`);
      if (!Number.isNaN(d.getTime())) {
        const monthName = d.toLocaleDateString("en-US", { month: "long", timeZone: "UTC" });
        title = `Month of ${monthName} ${d.getUTCFullYear()}`;
      }
    }

    const summary = str(parsed.summary, 280);
    const body = str(parsed.body, 5000);

    const asConf = (v: unknown): OcrFieldConfidence =>
      v === "high" || v === "medium" || v === "low" ? v : null;

    const confidence: UpdateOcrResult["confidence"] = asConf(parsed.confidence);

    const fcRaw =
      parsed.fieldConfidence && typeof parsed.fieldConfidence === "object"
        ? (parsed.fieldConfidence as Record<string, unknown>)
        : {};
    const fieldConfidence: UpdateOcrResult["fieldConfidence"] = {
      date: date == null ? null : asConf(fcRaw.date) ?? confidence,
      title: title == null ? null : asConf(fcRaw.title) ?? asConf(fcRaw.date) ?? confidence,
      summary: summary == null ? null : asConf(fcRaw.summary) ?? confidence,
      body: body == null ? null : asConf(fcRaw.body) ?? confidence,
    };

    const raw = str(parsed.raw, 500);

    return { date, title, summary, body, confidence, fieldConfidence, raw };
  });
