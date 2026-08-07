import { auth, defineMcp } from "@lovable.dev/mcp-js";
import getLeaderboardTool from "./tools/get-leaderboard";
import getExamStatisticsTool from "./tools/get-exam-statistics";
import listExamSessionsTool from "./tools/list-exam-sessions";
import listExamPackagesTool from "./tools/list-exam-packages";

const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "cpns-cat-simulator",
  title: "CPNS CAT Simulator",
  version: "0.1.0",
  instructions:
    "Read-only tools for the CPNS CAT Simulator. Use `get_leaderboard` for rankings, `get_exam_statistics` for aggregate pass rates and averages, `list_exam_sessions` to inspect individual participant sessions, and `list_exam_packages` to see available question packages. Passing thresholds are TWK >= 65, TIU >= 80, TKP >= 166.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [
    getLeaderboardTool,
    getExamStatisticsTool,
    listExamSessionsTool,
    listExamPackagesTool,
  ],
});
