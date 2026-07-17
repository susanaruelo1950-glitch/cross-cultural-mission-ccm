import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_ministry_updates",
  title: "List ministry updates",
  description: "List recent ministry updates, most recent first. Optionally filter by missionary.",
  inputSchema: {
    missionary_id: z.string().optional().describe("Filter to a single missionary."),
    limit: z.number().int().min(1).max(100).optional().describe("Max rows (default 20)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ missionary_id, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    let q = supabase
      .from("ministry_updates")
      .select("id, missionary_id, title, summary, report_date, created_at")
      .order("report_date", { ascending: false, nullsFirst: false })
      .limit(limit ?? 20);
    if (missionary_id) q = q.eq("missionary_id", missionary_id);
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data) }],
      structuredContent: { updates: data ?? [] },
    };
  },
});
