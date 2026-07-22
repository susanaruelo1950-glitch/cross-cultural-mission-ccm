import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listMissionariesTool from "./tools/list-missionaries";
import getMissionaryTool from "./tools/get-missionary";
import listAreasTool from "./tools/list-areas";
import listMinistryUpdatesTool from "./tools/list-ministry-updates";
import listPrayerRequestsTool from "./tools/list-prayer-requests";
import listAnnouncementsTool from "./tools/list-announcements";

const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "cross-cultural-mission-mcp",
  title: "Cross-Cultural Ministry",
  version: "0.1.0",
  instructions:
    "Read-only access to the Cross-Cultural Ministry directory. Use these tools to look up missionaries, areas, ministry updates, prayer requests, and announcements as the signed-in user. All tool calls respect the app's row-level security.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [
    listMissionariesTool,
    getMissionaryTool,
    listAreasTool,
    listMinistryUpdatesTool,
    listPrayerRequestsTool,
    listAnnouncementsTool,
  ],
});
