import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_areas",
  title: "List areas",
  description: "List ministry areas, optionally filtered by phase.",
  inputSchema: {
    phase_id: z.string().optional().describe("Filter by phase id."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ phase_id }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    let q = supabase.from("areas").select("*").order("name", { ascending: true });
    if (phase_id) q = q.eq("phase_id", phase_id);
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data) }],
      structuredContent: { areas: data ?? [] },
    };
  },
});
