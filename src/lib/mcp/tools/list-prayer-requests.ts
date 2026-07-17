import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_prayer_requests",
  title: "List prayer requests",
  description: "List open prayer requests, urgent ones first.",
  inputSchema: {
    include_answered: z.boolean().optional().describe("Include answered requests (default false)."),
    limit: z.number().int().min(1).max(100).optional().describe("Max rows (default 30)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ include_answered, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    let q = supabase
      .from("prayer_requests_db")
      .select("id, missionary_id, title, detail, urgent, answered, created_at")
      .order("urgent", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(limit ?? 30);
    if (!include_answered) q = q.eq("answered", false);
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data) }],
      structuredContent: { prayers: data ?? [] },
    };
  },
});
