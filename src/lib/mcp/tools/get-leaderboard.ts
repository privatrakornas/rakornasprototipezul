import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "get_leaderboard",
  title: "Get leaderboard",
  description:
    "Get the CPNS CAT exam leaderboard: participant names, TWK/TIU/TKP scores, total score and duration, ranked best-first.",
  inputSchema: {
    limit: z
      .number()
      .int()
      .describe("How many entries to return (1-100, default 20)")
      .optional(),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const pageLimit = Math.min(Math.max(Math.trunc(limit ?? 20), 1), 100);
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase.rpc("get_leaderboard", {
      page_limit: pageLimit,
      page_offset: 0,
    });

    if (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }

    const rows = (data ?? []).map((row, index) => ({
      rank: index + 1,
      name: row.name,
      twk: row.twk_score,
      tiu: row.tiu_score,
      tkp: row.tkp_score,
      total: row.total_score,
      duration_minutes: row.duration_minutes,
      passed: row.twk_score >= 65 && row.tiu_score >= 80 && row.tkp_score >= 166,
      finished_at: row.finished_at,
    }));

    return {
      content: [{ type: "text", text: JSON.stringify(rows, null, 2) }],
      structuredContent: { entries: rows },
    };
  },
});
