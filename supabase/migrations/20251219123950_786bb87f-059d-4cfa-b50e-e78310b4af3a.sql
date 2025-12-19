-- Add pagination to get_leaderboard() function to limit data exposure
-- This addresses the SECURITY DEFINER concern by limiting result sets

DROP FUNCTION IF EXISTS public.get_leaderboard();

CREATE OR REPLACE FUNCTION public.get_leaderboard(
  page_limit INTEGER DEFAULT 100,
  page_offset INTEGER DEFAULT 0
)
RETURNS TABLE(
  id uuid, 
  name text, 
  twk_score integer, 
  tiu_score integer, 
  tkp_score integer, 
  total_score integer, 
  created_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Validate inputs to prevent abuse
  IF page_limit IS NULL OR page_limit < 1 THEN
    page_limit := 100;
  END IF;
  
  IF page_limit > 500 THEN
    page_limit := 500; -- Cap maximum results
  END IF;
  
  IF page_offset IS NULL OR page_offset < 0 THEN
    page_offset := 0;
  END IF;

  RETURN QUERY
  WITH ranked_results AS (
    SELECT 
      e.id,
      e.name,
      e.twk_score,
      e.tiu_score,
      e.tkp_score,
      e.total_score,
      e.created_at,
      e.ip_address,
      e.device_fingerprint,
      CASE 
        WHEN e.twk_score >= 65 AND e.tiu_score >= 80 AND e.tkp_score >= 166 
        THEN 1 ELSE 0 
      END as is_lulus,
      ROW_NUMBER() OVER (
        PARTITION BY COALESCE(e.device_fingerprint, e.ip_address, e.id::text)
        ORDER BY 
          CASE WHEN e.twk_score >= 65 AND e.tiu_score >= 80 AND e.tkp_score >= 166 THEN 0 ELSE 1 END,
          e.total_score DESC,
          e.tkp_score DESC,
          e.tiu_score DESC,
          e.twk_score DESC
      ) as rn
    FROM public.exam_results e
  )
  SELECT 
    r.id,
    r.name,
    r.twk_score,
    r.tiu_score,
    r.tkp_score,
    r.total_score,
    r.created_at
  FROM ranked_results r
  WHERE r.rn = 1
  ORDER BY 
    r.is_lulus DESC,
    r.total_score DESC,
    r.tkp_score DESC,
    r.tiu_score DESC,
    r.twk_score DESC
  LIMIT page_limit
  OFFSET page_offset;
END;
$function$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_leaderboard(INTEGER, INTEGER) TO anon;
GRANT EXECUTE ON FUNCTION public.get_leaderboard(INTEGER, INTEGER) TO authenticated;