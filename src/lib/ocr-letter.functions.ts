import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const OcrInput = z.object({
  imageDataUrl: z
    .string()
    .min(20)
    .refine((s) => s.startsWith("data:image/"), "Must be a data:image/... URL"),
});

export type OcrFieldConfidence = "high" | "medium" | "low" | null;

export interface LetterOcrResult {
  date: string | null; // ISO YYYY-MM-DD
  recipient: string | null; // "Dear ___" — partner/supporter name
  title: string | null; // short suggested title
  message: string | null; // extracted body / summary
  amounts: string | null; // any monetary figures detected, joined
  confidence: "high" | "medium" | "low" | null;
  fieldConfidence: {
    date: OcrFieldConfidence;
    recipient: OcrFieldConfidence;
    title: OcrFieldConfidence;
    message: OcrFieldConfidence;
    amounts: OcrFieldConfidence;
  };
  raw: string | null;
}

const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";

const SYSTEM = `You extract structured data from a photo of a handwritten or typed thank-you letter that a missionary sends to a partner or supporter. Read every visible salutation, date, monetary figure, and body text. Return STRICT JSON only — no prose, no code fences.

Schema:
{
  "date": "YYYY-MM-DD" or null,
  "recipient": string or null,
  "title": string or null,
  "message": string or null,
  "amounts": string or null,
  "confidence": "high"|"medium"|"low",
  "fieldConfidence": {
    "date": "high"|"medium"|"low"|null,
    "recipient": "high"|"medium"|"low"|null,
    "title": "high"|"medium"|"low"|null,
    "message": "high"|"medium"|"low"|null,
    "amounts": "high"|"medium"|"low"|null
  },
  "raw": string
}

Rules:
- Convert dates like "22/07/2026", "Jul 22, 2026", "22 Jul 2026" to ISO. Assume the current year only when a year is missing.
- If handwriting is unclear, still try to transcribe the message but lower its fieldConfidence.
- If a field is unreadable, set both its value AND its fieldConfidence to null.
- Rate fieldConfidence honestly: "high" only when clearly read, "low" when guessed. Never invent names, dates, or amounts.`;

export const ocrLetter = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => OcrInput.parse(input))
  .handler(async ({ data }): Promise<LetterOcrResult> => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("LOVABLE_API_KEY is not configured on the server.");

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
              {
                type: "text",
                text: "Extract the date, recipient, a short title, the body message, and any monetary amounts from this thank-you letter image. Return JSON only.",
              },
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
        recipient: null,
        title: null,
        message: null,
        amounts: null,
        confidence: "low",
        fieldConfidence: {
          date: null,
          recipient: null,
          title: null,
          message: null,
          amounts: null,
        },
        raw: text || null,
      };
    }

    const dateRaw = typeof parsed.date === "string" ? parsed.date : null;
    const date = dateRaw && /^\d{4}-\d{2}-\d{2}$/.test(dateRaw) ? dateRaw : null;

    const str = (v: unknown, max: number) =>
      typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null;

    const recipient = str(parsed.recipient, 160);
    const title = str(parsed.title, 200);
    const message = str(parsed.message, 5000);
    const amounts = str(parsed.amounts, 300);

    const asConf = (v: unknown): OcrFieldConfidence =>
      v === "high" || v === "medium" || v === "low" ? v : null;

    const conf = parsed.confidence;
    const confidence: LetterOcrResult["confidence"] = asConf(conf);

    const fcRaw =
      parsed.fieldConfidence && typeof parsed.fieldConfidence === "object"
        ? (parsed.fieldConfidence as Record<string, unknown>)
        : {};
    const fieldConfidence: LetterOcrResult["fieldConfidence"] = {
      date: date == null ? null : asConf(fcRaw.date) ?? confidence,
      recipient: recipient == null ? null : asConf(fcRaw.recipient) ?? confidence,
      title: title == null ? null : asConf(fcRaw.title) ?? confidence,
      message: message == null ? null : asConf(fcRaw.message) ?? confidence,
      amounts: amounts == null ? null : asConf(fcRaw.amounts) ?? confidence,
    };

    const raw = str(parsed.raw, 500);

    return { date, recipient, title, message, amounts, confidence, fieldConfidence, raw };
  });
