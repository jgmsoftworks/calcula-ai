ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_plan_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_plan_check
  CHECK (plan IN ('free','lite','professional','enterprise'));
ALTER TABLE public.profiles ALTER COLUMN plan SET DEFAULT 'lite';
ALTER TABLE public.profiles ALTER COLUMN trial_ends_at SET DEFAULT (now() + interval '7 days');