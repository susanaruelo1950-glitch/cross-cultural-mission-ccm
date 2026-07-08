import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * Turn a monthly ministry report into a short, shareable update using
 * the Lovable AI Gateway. Keep the model call, prompt, and API key
 * server-side.
 */
export const summarizeReport = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        missionaryName: z.string().min(1),
        church: z.string().default(""),
        reportText: z.string().min(1),
        audience: z.enum(["newsletter", "presentation", "prayer-list"]).default("newsletter"),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("LOVABLE_API_KEY is not configured on the server.");

    const { getRequest } = await import("@tanstack/react-start/server");
    const request = getRequest();
    const authHeader = request?.headers?.get("authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      throw new Error("Unauthorized: No authorization header provided");
    }

    const token = authHeader.replace("Bearer ", "");
    if (token.split(".").length !== 3) {
      throw new Error("Unauthorized: Invalid token");
    }

    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY;
    if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
      throw new Error("Authentication is not configured on the server.");
    }

    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims?.sub) {
      throw new Error("Unauthorized: Invalid token");
    }

    const audienceHint = {
      newsletter:
        "Write a warm 3-paragraph church newsletter update in second person (about the missionary). Include 1 praise, 1 prayer request, and end with a short call to action.",
      presentation:
        "Write 5-7 punchy bullet points suitable for a slide deck. Each bullet under 15 words. Start with the biggest praise report.",
      "prayer-list":
        "Write a compact prayer bulletin: 1 short intro sentence, then 3-5 bulleted specific prayer points.",
    }[data.audience];

    const gateway = "https://ai.gateway.lovable.dev/v1/chat/completions";

    const prompt = `You are helping a Filipino church-planting network share ministry updates.
Missionary: ${data.missionaryName}
Church / Ministry: ${data.church || "(not specified)"}
Audience format: ${data.audience}

${audienceHint}

Rules: Be Christ-centered, encouraging, factual, and never invent numbers or events not in the source. Use plain, warm English. Do not add markdown headers.

Source ministry report:
"""
${data.reportText}
"""`;

    const res = await fetch(gateway, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content:
              "You write short, encouraging, factually-grounded mission updates for church supporters.",
          },
          { role: "user", content: prompt },
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
    return { summary: text };
  });
