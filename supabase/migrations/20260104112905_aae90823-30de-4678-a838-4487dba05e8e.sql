-- Drop the existing restrictive policy and recreate as permissive
DROP POLICY IF EXISTS "Allow delete exam results" ON public.exam_results;

CREATE POLICY "Allow delete exam results"
ON public.exam_results
AS PERMISSIVE
FOR DELETE
TO public
USING (true);