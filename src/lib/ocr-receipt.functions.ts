import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const OcrInput = z.object({
  // data URL (data:image/...;base64,...) — the browser produces this.
  imageDataUrl: z
    .string()
    .min(20)
    .refine((s) => s.startsWith("data:image/"), "Must be a data:image/... URL"),
});

export interface ReceiptOcrResult {
  date: string | null; // ISO YYYY-MM-DD
  amount: number | null;
  currency: string | null; // e.g. PHP, USD
  title: string | null; // short auto-suggested title
  confidence: "high" | "medium" | "low" | null;
  raw: string | null;
}

const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";

const SYSTEM = `You extract structured data from a photo of a financial support receipt (bank transfer slip, GCash / PayMaya screenshot, ATM receipt, remittance receipt, or handwritten receipt). Read every visible date, amount, and currency. Return STRICT JSON only — no prose, no code fences.

Schema:
{
  "date": "YYYY-MM-DD" or null,        // the transaction/receipt date, not "printed on"
  "amount": number or null,             // the primary transaction amount, no currency symbol, no commas
  "currency": "PHP"|"USD"|"EUR"|... or null,
  "title": string or null,              // 3-8 words, e.g. "GCash transfer — July 2026"
  "confidence": "high"|"medium"|"low",
  "raw": string                          // 1-3 lines of key text you actually read
}

Rules:
- If several amounts are visible, pick the transaction total (not fees or balance).
- Convert dates like "22/07/2026", "Jul 22, 2026", "22 Jul 2026" to ISO. Assume the current year only when a year is missing.
- Default currency to "PHP" for Philippine banks / GCash / PayMaya when the symbol is absent.
- If unreadable, set that field to null. Never invent values.`;

export const ocrReceipt = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => OcrInput.parse(input))
  .handler(async ({ data }): Promise<ReceiptOcrResult> => {
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
                text: "Extract the date, amount, currency, and a short title from this receipt image. Return JSON only.",
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

    // Strip accidental code fences and pull the first JSON object.
    const cleaned = text.replace(/^```(?:json)?/i, "").replace(/```$/g, "").trim();
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    const jsonSlice = start >= 0 && end > start ? cleaned.slice(start, end + 1) : cleaned;

    let parsed: Record<string, unknown> = {};
    try {
      parsed = JSON.parse(jsonSlice) as Record<string, unknown>;
    } catch {
      return { date: null, amount: null, currency: null, title: null, confidence: "low", raw: text || null };
    }

    const dateRaw = typeof parsed.date === "string" ? parsed.date : null;
    const date = dateRaw && /^\d{4}-\d{2}-\d{2}$/.test(dateRaw) ? dateRaw : null;

    let amount: number | null = null;
    if (typeof parsed.amount === "number" && Number.isFinite(parsed.amount)) {
      amount = parsed.amount;
    } else if (typeof parsed.amount === "string") {
      const n = Number(parsed.amount.replace(/[,\s]/g, ""));
      if (Number.isFinite(n)) amount = n;
    }

    const currency =
      typeof parsed.currency === "string" && parsed.currency.trim()
        ? parsed.currency.trim().toUpperCase().slice(0, 5)
        : null;

    const title =
      typeof parsed.title === "string" && parsed.title.trim() ? parsed.title.trim().slice(0, 120) : null;

    const conf = parsed.confidence;
    const confidence: ReceiptOcrResult["confidence"] =
      conf === "high" || conf === "medium" || conf === "low" ? conf : null;

    const raw = typeof parsed.raw === "string" ? parsed.raw.slice(0, 500) : null;

    return { date, amount, currency, title, confidence, raw };
  });
