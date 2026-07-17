import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_missionaries",
  title: "List missionaries",
  description:
    "List missionaries in the Cross-Cultural Mission directory. Optionally filter by area, province, or a name search string.",
  inputSchema: {
    search: z.string().optional().describe("Case-insensitive name/church search."),
    area_id: z.string().optional().describe("Filter by area id."),
    province: z.string().optional().describe("Filter by province name."),
    limit: z.number().int().min(1).max(200).optional().describe("Max rows (default 50)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ search, area_id, province, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    let q = supabase
      .from("missionaries")
      .select("id, full_name, church, area_id, province, municipality, status, ministry_focus")
      .order("full_name", { ascending: true })
      .limit(limit ?? 50);
    if (area_id) q = q.eq("area_id", area_id);
    if (province) q = q.ilike("province", province);
    if (search) q = q.or(`full_name.ilike.%${search}%,church.ilike.%${search}%`);
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data) }],
      structuredContent: { missionaries: data ?? [] },
    };
  },
});
