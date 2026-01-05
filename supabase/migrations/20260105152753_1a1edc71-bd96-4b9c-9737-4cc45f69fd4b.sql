-- Add duration_minutes column for new submissions (may already exist from partial run)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'exam_results' AND column_name = 'duration_minutes') THEN
    ALTER TABLE public.exam_results ADD COLUMN duration_minutes integer;
  END IF;
END $$;

-- Add comment explaining the column
COMMENT ON COLUMN public.exam_results.duration_minutes IS 'Time taken to complete exam in minutes (max 100 minutes). NULL for legacy data.';

-- Drop existing function first to change return type
DROP FUNCTION IF EXISTS public.get_leaderboard(integer, integer);

-- Recreate the get_leaderboard function with duration_minutes included
CREATE OR REPLACE FUNCTION public.get_leaderboard(page_limit integer DEFAULT 100, page_offset integer DEFAULT 0)
 RETURNS TABLE(id uuid, name text, twk_score integer, tiu_score integer, tkp_score integer, total_score integer, duration_minutes integer, created_at timestamp with time zone)
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
    page_limit := 500;
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
      e.duration_minutes,
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
    r.duration_minutes,
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