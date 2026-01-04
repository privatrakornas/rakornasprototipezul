-- Add DELETE policy to allow deleting exam results
CREATE POLICY "Allow delete exam results"
ON public.exam_results
FOR DELETE
USING (true);