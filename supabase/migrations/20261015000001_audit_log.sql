-- Audit logging table for security events
CREATE TABLE IF NOT EXISTS public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  details JSONB DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for common queries
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON public.audit_log (user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON public.audit_log (action);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON public.audit_log (created_at DESC);

-- Enable RLS
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "audit_log_select" ON public.audit_log;
DROP POLICY IF EXISTS "audit_log_insert" ON public.audit_log;

-- Only admins and the user themselves can view their audit logs
CREATE POLICY "audit_log_select" ON public.audit_log FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin());

-- Only system functions can insert audit logs (SECURITY DEFINER functions)
CREATE POLICY "audit_log_insert" ON public.audit_log FOR INSERT
  WITH CHECK (false); -- Prevent direct client inserts

-- Function to log security events (called by SECURITY DEFINER functions)
CREATE OR REPLACE FUNCTION public.log_security_event(
  p_action TEXT,
  p_details JSONB DEFAULT '{}',
  p_user_id UUID DEFAULT auth.uid()
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_ip INET;
  v_user_agent TEXT;
BEGIN
  -- Try to get IP from request context (set by middleware)
  BEGIN
    v_ip := NULLIF(current_setting('request.ip', true), '')::INET;
  EXCEPTION WHEN OTHERS THEN
    v_ip := NULL;
  END;

  BEGIN
    v_user_agent := NULLIF(current_setting('request.user_agent', true), '');
  EXCEPTION WHEN OTHERS THEN
    v_user_agent := NULL;
  END;

  INSERT INTO public.audit_log (user_id, action, details, ip_address, user_agent)
  VALUES (p_user_id, p_action, p_details, v_ip, v_user_agent);
END;
$$;

-- Trigger for failed logins (called from auth hook or API)
CREATE OR REPLACE FUNCTION public.log_failed_login(
  p_email TEXT,
  p_ip INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  PERFORM public.log_security_event(
    'failed_login',
    jsonb_build_object('email', p_email),
    NULL
  );
END;
$$;

-- Trigger for successful login
CREATE OR REPLACE FUNCTION public.log_successful_login(
  p_user_id UUID
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  PERFORM public.log_security_event(
    'successful_login',
    '{}',
    p_user_id
  );
END;
$$;

-- Trigger for password changes
CREATE OR REPLACE FUNCTION public.log_password_change(
  p_user_id UUID
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  PERFORM public.log_security_event(
    'password_changed',
    '{}',
    p_user_id
  );
END;
$$;

-- Trigger for role changes
CREATE OR REPLACE FUNCTION public.log_role_change(
  p_user_id UUID,
  p_old_role TEXT,
  p_new_role TEXT
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  PERFORM public.log_security_event(
    'role_changed',
    jsonb_build_object('old_role', p_old_role, 'new_role', p_new_role),
    p_user_id
  );
END;
$$;

-- Trigger for email changes
CREATE OR REPLACE FUNCTION public.log_email_change(
  p_user_id UUID,
  p_old_email TEXT,
  p_new_email TEXT
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  PERFORM public.log_security_event(
    'email_changed',
    jsonb_build_object('old_email', p_old_email, 'new_email', p_new_email),
    p_user_id
  );
END;
$$;

-- Grant execute on functions to authenticated users
GRANT EXECUTE ON FUNCTION public.log_security_event TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_failed_login TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_successful_login TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_password_change TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_role_change TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_email_change TO authenticated;