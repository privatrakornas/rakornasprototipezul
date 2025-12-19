-- Create a secure function to fetch leaderboard data with deduplication
-- This hides IP addresses and device fingerprints while maintaining deduplication logic
CREATE OR REPLACE FUNCTION public.get_leaderboard()
RETURNS TABLE (
  id uuid,
  name text,
  twk_score integer,
  tiu_score integer,
  tkp_score integer,
  total_score integer,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
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
      -- Calculate if participant passes all subjects
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
    r.twk_score DESC;
END;
$$;

-- Grant execute permission on the function to anon and authenticated roles
GRANT EXECUTE ON FUNCTION public.get_leaderboard() TO anon;
GRANT EXECUTE ON FUNCTION public.get_leaderboard() TO authenticated;

-- Drop the overly permissive SELECT policy
DROP POLICY IF EXISTS "Anyone can view exam results" ON public.exam_results;

-- Create a restrictive SELECT policy - only allow through the secure function
-- Direct table access is now blocked for SELECT
CREATE POLICY "No direct select access"
ON public.exam_results
FOR SELECT
USING (false);