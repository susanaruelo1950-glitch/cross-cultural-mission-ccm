import { createFileRoute } from "@tanstack/react-router";

interface SpeakBody {
  text?: string;
  voice?: string;
  instructions?: string;
}

export const Route = createFileRoute("/api/voice/speak")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const key = process.env.LOVABLE_API_KEY;
        if (!key) return new Response("Missing LOVABLE_API_KEY", { status: 500 });

        const body = (await request.json().catch(() => ({}))) as SpeakBody;
        const text = (body.text ?? "").trim();
        if (!text) return new Response("Missing text", { status: 400 });

        // Cap so a single request doesn't blow the model's input limit.
        const input = text.length > 3500 ? text.slice(0, 3500) : text;
        const voice = body.voice || "alloy";

        const res = await fetch("https://ai.gateway.lovable.dev/v1/audio/speech", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${key}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "openai/gpt-4o-mini-tts",
            input,
            voice,
            response_format: "mp3",
            ...(body.instructions ? { instructions: body.instructions } : {}),
          }),
        });

        if (!res.ok) {
          const errBody = await res.text().catch(() => "");
          return new Response(errBody || `TTS failed: ${res.status}`, { status: res.status });
        }

        return new Response(res.body, {
          headers: {
            "content-type": "audio/mpeg",
            "cache-control": "no-store",
          },
        });
      },
    },
  },
});
