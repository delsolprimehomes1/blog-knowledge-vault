-- Bootstrap first admin user
-- This migration runs with elevated privileges and bypasses RLS
INSERT INTO public.user_roles (user_id, role)
VALUES ('c1a639b3-f5e3-42ae-87e2-79e98f3aefb3', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;