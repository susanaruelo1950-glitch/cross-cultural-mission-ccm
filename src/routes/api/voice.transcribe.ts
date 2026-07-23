import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/voice/transcribe")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const key = process.env.LOVABLE_API_KEY;
        if (!key) return new Response("Missing LOVABLE_API_KEY", { status: 500 });

        const inbound = await request.formData();
        const file = inbound.get("file");
        if (!(file instanceof Blob)) {
          return new Response("Missing audio file", { status: 400 });
        }

        const upstream = new FormData();
        // Preserve name/extension so the model can infer the container.
        const name = (file as File).name || "recording.webm";
        upstream.append("file", file, name);
        upstream.append("model", "openai/gpt-4o-mini-transcribe");
        // Optional language hint (ISO-639-1). Omit for auto-detect so
        // Tagalog/Cebuano/etc. are recognized without a fixed locale.
        const lang = inbound.get("language");
        if (typeof lang === "string" && /^[a-z]{2}$/.test(lang)) {
          upstream.append("language", lang);
        }

        const res = await fetch("https://ai.gateway.lovable.dev/v1/audio/transcriptions", {
          method: "POST",
          headers: { Authorization: `Bearer ${key}` },
          body: upstream,
        });

        if (!res.ok) {
          const body = await res.text().catch(() => "");
          return new Response(body || `Transcription failed: ${res.status}`, { status: res.status });
        }
        const json = (await res.json()) as { text?: string };
        return new Response(JSON.stringify({ text: json.text ?? "" }), {
          headers: { "content-type": "application/json" },
        });
      },
    },
  },
});
