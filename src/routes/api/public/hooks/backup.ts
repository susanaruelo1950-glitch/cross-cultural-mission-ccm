import { createFileRoute } from "@tanstack/react-router";

/**
 * Scheduled backup endpoint. Called by pg_cron with the project anon key.
 * Runs the configured automatic backup only when it is actually due.
 */
export const Route = createFileRoute("/api/public/hooks/backup")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const key =
          request.headers.get("apikey") ??
          request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
          "";
        const expected =
          process.env["SUPABASE_ANON_KEY"] ?? process.env["SUPABASE_PUBLISHABLE_KEY"] ?? "";
        if (!expected || key !== expected) {
          return new Response(JSON.stringify({ error: "unauthorized" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          });
        }
        try {
          const { runScheduledBackup } = await import("@/lib/backup-core.server");
          const out = await runScheduledBackup(false);
          return Response.json({ ok: true, ...out });
        } catch (e) {
          console.error("scheduled backup failed", e);
          return new Response(JSON.stringify({ ok: false, error: (e as Error).message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
    },
  },
});
