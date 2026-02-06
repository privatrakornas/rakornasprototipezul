-- Add DELETE policy for exam_sessions to support permanent deletion by admin
CREATE POLICY "Anyone can delete exam sessions"
ON public.exam_sessions
FOR DELETE
USING (true);