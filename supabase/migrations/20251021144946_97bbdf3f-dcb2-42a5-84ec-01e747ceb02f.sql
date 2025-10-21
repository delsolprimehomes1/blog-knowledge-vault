-- Add audit fields to user_roles table
ALTER TABLE public.user_roles 
ADD COLUMN IF NOT EXISTS granted_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS granted_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Create user_role_changes table for activity log
CREATE TABLE IF NOT EXISTS public.user_role_changes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  action TEXT CHECK (action IN ('granted', 'revoked', 'requested')) NOT NULL,
  role app_role NOT NULL,
  performed_by UUID REFERENCES auth.users(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on user_role_changes
ALTER TABLE public.user_role_changes ENABLE ROW LEVEL SECURITY;

-- Policy: Only admins can view role changes
CREATE POLICY "Admins can view role changes"
ON public.user_role_changes
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

-- Policy: Only admins can insert role changes
CREATE POLICY "Admins can insert role changes"
ON public.user_role_changes
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin(auth.uid()));

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_role_changes_target_user ON public.user_role_changes(target_user_id);
CREATE INDEX IF NOT EXISTS idx_role_changes_created_at ON public.user_role_changes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);