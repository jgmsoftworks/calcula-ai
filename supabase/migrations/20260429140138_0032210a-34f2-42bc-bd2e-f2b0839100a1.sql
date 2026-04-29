UPDATE public.profiles
SET plan = 'enterprise',
    plan_expires_at = (now() + interval '1 month'),
    updated_at = now()
WHERE user_id = '03d16fd1-75d1-4601-90a7-0e5ae17c13bf';