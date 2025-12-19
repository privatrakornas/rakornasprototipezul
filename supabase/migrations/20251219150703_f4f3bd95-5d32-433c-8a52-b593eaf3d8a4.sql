-- Create function to check if device/IP already has a submission
CREATE OR REPLACE FUNCTION public.check_existing_submission(
  p_device_fingerprint TEXT DEFAULT NULL,
  p_ip_address TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  submission_exists BOOLEAN;
BEGIN
  -- Check if any submission exists with matching device_fingerprint OR ip_address
  SELECT EXISTS (
    SELECT 1 FROM public.exam_results e
    WHERE 
      (p_device_fingerprint IS NOT NULL AND e.device_fingerprint = p_device_fingerprint)
      OR (p_ip_address IS NOT NULL AND p_ip_address != 'unknown' AND e.ip_address = p_ip_address)
  ) INTO submission_exists;
  
  RETURN submission_exists;
END;
$function$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.check_existing_submission(TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.check_existing_submission(TEXT, TEXT) TO authenticated;