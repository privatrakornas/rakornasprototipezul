import { defineTool } from "@lovable.dev/mcp-js";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "get_exam_statistics",
  title: "Get exam statistics",
  description:
    "Get aggregate CPNS CAT statistics: number of sessions by status, pass rate against the TWK 65 / TIU 80 / TKP 166 thresholds, and average scores.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("exam_sessions")
      .select("status, twk_score, tiu_score, tkp_score, total_score, duration_minutes")
      .is("deleted_at", null);

    if (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }

    const sessions = data ?? [];
    const finished = sessions.filter((s) => s.status === "finished");
    const avg = (values: number[]) =>
      values.length ? Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10 : 0;

    const passed = finished.filter(
      (s) => s.twk_score >= 65 && s.tiu_score >= 80 && s.tkp_score >= 166,
    ).length;

    const stats = {
      total_sessions: sessions.length,
      by_status: sessions.reduce<Record<string, number>>((acc, s) => {
        acc[s.status] = (acc[s.status] ?? 0) + 1;
        return acc;
      }, {}),
      finished_count: finished.length,
      passed_count: passed,
      pass_rate_percent: finished.length
        ? Math.round((passed / finished.length) * 1000) / 10
        : 0,
      average_twk: avg(finished.map((s) => s.twk_score)),
      average_tiu: avg(finished.map((s) => s.tiu_score)),
      average_tkp: avg(finished.map((s) => s.tkp_score)),
      average_total: avg(finished.map((s) => s.total_score)),
      average_duration_minutes: avg(finished.map((s) => s.duration_minutes ?? 0)),
    };

    return {
      content: [{ type: "text", text: JSON.stringify(stats, null, 2) }],
      structuredContent: stats,
    };
  },
});
