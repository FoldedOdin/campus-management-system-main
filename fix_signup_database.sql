-- TrustVote: Fix Supabase signup/profile database issues
-- Run this in Supabase SQL Editor on existing projects.

BEGIN;

-- 1) Ensure users.id matches auth.users.id (not random UUID)
ALTER TABLE public.users
  ALTER COLUMN id DROP DEFAULT;

-- 1.1) Backup + remove orphan profile rows that cannot satisfy FK to auth.users
-- These are typically legacy rows created before Supabase Auth integration.
CREATE TABLE IF NOT EXISTS public.users_orphan_backup (
  id UUID,
  email VARCHAR(255),
  full_name VARCHAR(255),
  role VARCHAR(50),
  student_id VARCHAR(100),
  department VARCHAR(255),
  year VARCHAR(50),
  phone VARCHAR(20),
  verified BOOLEAN,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  backed_up_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO public.users_orphan_backup (
  id, email, full_name, role, student_id, department, year, phone, verified, created_at, updated_at
)
SELECT
  u.id, u.email, u.full_name, u.role, u.student_id, u.department, u.year, u.phone, u.verified, u.created_at, u.updated_at
FROM public.users u
LEFT JOIN auth.users au ON au.id = u.id
WHERE au.id IS NULL;

DELETE FROM public.users u
WHERE NOT EXISTS (
  SELECT 1
  FROM auth.users au
  WHERE au.id = u.id
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'users_id_fkey'
      AND conrelid = 'public.users'::regclass
  ) THEN
    ALTER TABLE public.users
      ADD CONSTRAINT users_id_fkey
      FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 1.2) Normalize legacy staff roles and enforce updated role constraint
DO $$
BEGIN
  -- Normalize legacy roles before tightening role constraint.
  UPDATE public.users
  SET role = 'staff_coordinator'
  WHERE role IN ('hod');

  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'users_role_check'
      AND conrelid = 'public.users'::regclass
  ) THEN
    ALTER TABLE public.users DROP CONSTRAINT users_role_check;
  END IF;

  ALTER TABLE public.users
    ADD CONSTRAINT users_role_check
    CHECK (role IN (
      'student',
      'admin',
      'candidate',
      'chairman',
      'staff_coordinator',
      'event_coordinator',
      'arts_secretary',
      'sports_secretary',
      'magazine_editor'
    ));
END $$;

-- 2) Create/replace sync trigger from auth.users to public.users
CREATE OR REPLACE FUNCTION public.handle_auth_user_sync()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (
    id,
    email,
    full_name,
    role,
    student_id,
    department,
    year,
    phone,
    verified
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    CASE 
      WHEN NEW.raw_user_meta_data->>'role' = 'hod' THEN 'staff_coordinator'
      ELSE COALESCE(NEW.raw_user_meta_data->>'role', 'student')
    END,
    NULLIF(NEW.raw_user_meta_data->>'student_id', ''),
    NULLIF(NEW.raw_user_meta_data->>'department', ''),
    NULLIF(NEW.raw_user_meta_data->>'year', ''),
    NULLIF(NEW.raw_user_meta_data->>'phone', ''),
    NEW.email_confirmed_at IS NOT NULL
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(NULLIF(EXCLUDED.full_name, ''), public.users.full_name),
    role = COALESCE(NULLIF(EXCLUDED.role, ''), public.users.role),
    student_id = COALESCE(EXCLUDED.student_id, public.users.student_id),
    department = COALESCE(EXCLUDED.department, public.users.department),
    year = COALESCE(EXCLUDED.year, public.users.year),
    phone = COALESCE(EXCLUDED.phone, public.users.phone),
    verified = EXCLUDED.verified,
    updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_auth_user_sync();

DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE OF email, raw_user_meta_data, email_confirmed_at ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_auth_user_sync();

-- 3) Backfill existing auth users missing in public.users
INSERT INTO public.users (
  id,
  email,
  full_name,
  role,
  student_id,
  department,
  year,
  phone,
  verified
)
SELECT
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'full_name', ''),
  CASE 
    WHEN au.raw_user_meta_data->>'role' = 'hod' THEN 'staff_coordinator'
    ELSE COALESCE(au.raw_user_meta_data->>'role', 'student')
  END,
  NULLIF(au.raw_user_meta_data->>'student_id', ''),
  NULLIF(au.raw_user_meta_data->>'department', ''),
  NULLIF(au.raw_user_meta_data->>'year', ''),
  NULLIF(au.raw_user_meta_data->>'phone', ''),
  au.email_confirmed_at IS NOT NULL
FROM auth.users au
LEFT JOIN public.users pu ON pu.id = au.id
WHERE pu.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- 4) Replace policies that were using auth.role() = 'admin'
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
CREATE POLICY "Users can view their own profile" ON public.users
  FOR SELECT USING (
    auth.uid()::text = id::text
    OR COALESCE(auth.jwt() -> 'user_metadata' ->> 'role', '') = 'admin'
  );

DROP POLICY IF EXISTS "Users can view their candidate requests" ON public.candidate_requests;
CREATE POLICY "Users can view their candidate requests" ON public.candidate_requests
  FOR SELECT USING (
    auth.uid()::text = user_id::text
    OR COALESCE(auth.jwt() -> 'user_metadata' ->> 'role', '') = 'admin'
  );

COMMIT;
