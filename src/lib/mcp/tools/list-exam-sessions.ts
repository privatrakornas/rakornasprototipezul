import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_exam_sessions",
  title: "List exam sessions",
  description:
    "List CPNS CAT exam sessions with participant name, status, progress and scores. Optionally filter by status or search by participant name.",
  inputSchema: {
    status: z
      .string()
      .describe("Filter by session status, e.g. ongoing, finished, aborted.")
      .optional(),
    search: z.string().describe("Case-insensitive participant name search.").optional(),
    limit: z.number().int().describe("How many sessions to return (1-100, default 25).").optional(),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ status, search, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const take = Math.min(Math.max(Math.trunc(limit ?? 25), 1), 100);
    const supabase = supabaseForUser(ctx);

    let query = supabase
      .from("exam_sessions")
      .select(
        "id, name, status, answered_count, total_questions, twk_score, tiu_score, tkp_score, total_score, duration_minutes, disqualification_reason, started_at, finished_at",
      )
      .is("deleted_at", null)
      .order("started_at", { ascending: false })
      .limit(take);

    if (status?.trim()) query = query.eq("status", status.trim());
    if (search?.trim()) query = query.ilike("name", `%${search.trim()}%`);

    const { data, error } = await query;
    if (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }

    return {
      content: [{ type: "text", text: JSON.stringify(data ?? [], null, 2) }],
      structuredContent: { sessions: data ?? [] },
    };
  },
});
