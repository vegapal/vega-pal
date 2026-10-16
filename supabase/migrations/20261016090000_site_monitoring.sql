-- First-party, approximate traffic counts and owner-only signup notifications.
-- No historical notifications are backfilled. Anonymous API callers never get
-- direct database access; the application validates and records visits server-side.
BEGIN;

CREATE TABLE IF NOT EXISTS public.site_visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_id uuid NOT NULL,
  session_id uuid NOT NULL,
  visit_date date NOT NULL DEFAULT ((now() AT TIME ZONE 'UTC')::date),
  landing_path text NOT NULL CHECK (length(landing_path) BETWEEN 1 AND 160 AND landing_path ~ '^/[a-z0-9/-]*$'),
  source text NOT NULL CHECK (source IN ('direct', 'search', 'referral')),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT site_visits_session_day_key UNIQUE (session_id, visit_date)
);
CREATE INDEX IF NOT EXISTS site_visits_date_visitor_idx ON public.site_visits (visit_date, visitor_id);

-- Kept separate from user_activity_logs: authenticated users can write their
-- own activity log, while these events must represent successful server logins.
CREATE TABLE IF NOT EXISTS public.site_login_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS site_login_events_created_user_idx ON public.site_login_events (created_at, user_id);

CREATE TABLE IF NOT EXISTS public.admin_signup_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  read_at timestamptz,
  delivery_status text NOT NULL DEFAULT 'pending' CHECK (delivery_status IN ('pending', 'processing', 'sent')),
  delivery_attempts integer NOT NULL DEFAULT 0 CHECK (delivery_attempts >= 0),
  delivery_claimed_at timestamptz,
  delivery_sent_at timestamptz,
  delivery_next_attempt_at timestamptz NOT NULL DEFAULT now(),
  delivery_last_error text CHECK (delivery_last_error IS NULL OR (length(delivery_last_error) <= 80 AND delivery_last_error ~ '^[a-z0-9_]+$'))
);
CREATE INDEX IF NOT EXISTS admin_signup_notifications_created_idx ON public.admin_signup_notifications (created_at DESC);
CREATE INDEX IF NOT EXISTS admin_signup_notifications_unread_idx ON public.admin_signup_notifications (created_at DESC) WHERE read_at IS NULL;
CREATE INDEX IF NOT EXISTS profiles_monitoring_created_idx ON public.profiles (created_at);

ALTER TABLE public.site_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_login_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_signup_notifications ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.site_visits, public.site_login_events, public.admin_signup_notifications FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.site_visits, public.site_login_events, public.admin_signup_notifications TO service_role;

CREATE OR REPLACE FUNCTION public.record_site_visit(
  p_visitor_id uuid, p_session_id uuid, p_landing_path text, p_source text
) RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = pg_catalog, public
AS $$
  INSERT INTO public.site_visits (visitor_id, session_id, landing_path, source)
  VALUES (p_visitor_id, p_session_id, p_landing_path, p_source)
  ON CONFLICT (session_id, visit_date) DO NOTHING;
$$;
REVOKE ALL ON FUNCTION public.record_site_visit(uuid, uuid, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_site_visit(uuid, uuid, text, text) TO service_role;

CREATE OR REPLACE FUNCTION public.record_site_login(p_user_id uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = pg_catalog, public
AS $$
  INSERT INTO public.site_login_events (user_id) VALUES (p_user_id);
$$;
REVOKE ALL ON FUNCTION public.record_site_login(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_site_login(uuid) TO service_role;

-- Atomic claims prevent concurrent requests from claiming the same delivery.
-- A crashed worker becomes eligible again after five minutes. Provider calls
-- happen outside the signup transaction; failures never interrupt registration.
CREATE OR REPLACE FUNCTION public.claim_signup_notifications(p_limit integer DEFAULT 5)
RETURNS TABLE(id uuid, user_id uuid, created_at timestamptz, delivery_attempts integer)
LANGUAGE sql SECURITY DEFINER SET search_path = pg_catalog, public
AS $$
  WITH candidates AS (
    SELECT n.id FROM public.admin_signup_notifications n
    WHERE (n.delivery_status = 'pending' AND n.delivery_next_attempt_at <= now())
      OR (n.delivery_status = 'processing' AND n.delivery_claimed_at < now() - interval '5 minutes')
    ORDER BY n.created_at
    FOR UPDATE SKIP LOCKED
    LIMIT greatest(1, least(coalesce(p_limit, 5), 20))
  ), claimed AS (
    UPDATE public.admin_signup_notifications n
    SET delivery_status = 'processing', delivery_attempts = n.delivery_attempts + 1, delivery_claimed_at = now()
    FROM candidates c WHERE n.id = c.id
    RETURNING n.id, n.user_id, n.created_at, n.delivery_attempts
  ) SELECT claimed.id, claimed.user_id, claimed.created_at, claimed.delivery_attempts FROM claimed;
$$;
REVOKE ALL ON FUNCTION public.claim_signup_notifications(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_signup_notifications(integer) TO service_role;

CREATE OR REPLACE FUNCTION public.notify_admin_signup()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public
AS $$
BEGIN
  INSERT INTO public.admin_signup_notifications (user_id) VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.notify_admin_signup() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS monitoring_profile_created ON public.profiles;
CREATE TRIGGER monitoring_profile_created AFTER INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.notify_admin_signup();

-- Aggregate in SQL rather than downloading a PostgREST page (default 1,000 rows).
-- Fixed 30 UTC dates; raw visits and login events retain at most 90 UTC dates
-- once an owner opens the dashboard. No IP, user agent, or referrer is stored.
CREATE OR REPLACE FUNCTION public.get_site_monitoring_summary()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public
AS $$
DECLARE
  v_today date := (now() AT TIME ZONE 'UTC')::date;
  v_since date := v_today - 29;
  v_start timestamptz := (v_since::timestamp AT TIME ZONE 'UTC');
  v_retention timestamptz := ((v_today - 89)::timestamp AT TIME ZONE 'UTC');
  v_result jsonb;
BEGIN
  DELETE FROM public.site_visits WHERE visit_date < v_today - 89;
  DELETE FROM public.site_login_events WHERE created_at < v_retention;

  WITH days AS (
    SELECT v_since + day AS day FROM generate_series(0, 29) AS day
  ), visit_days AS (
    SELECT visit_date AS day, count(*) AS visits, count(DISTINCT visitor_id) AS visitors
    FROM public.site_visits WHERE visit_date BETWEEN v_since AND v_today GROUP BY visit_date
  ), account_days AS (
    SELECT (created_at AT TIME ZONE 'UTC')::date AS day, count(*) AS accounts
    FROM public.profiles WHERE created_at >= v_start AND created_at < ((v_today + 1)::timestamp AT TIME ZONE 'UTC')
    GROUP BY 1
  ), login_days AS (
    SELECT (created_at AT TIME ZONE 'UTC')::date AS day, count(*) AS logins
    FROM public.site_login_events WHERE created_at >= v_start AND created_at < ((v_today + 1)::timestamp AT TIME ZONE 'UTC')
    GROUP BY 1
  )
  SELECT jsonb_build_object(
    'since', to_char(v_since, 'YYYY-MM-DD') || 'T00:00:00.000Z',
    'uniqueVisitors', (SELECT count(DISTINCT visitor_id) FROM public.site_visits WHERE visit_date BETWEEN v_since AND v_today),
    'visits', (SELECT count(*) FROM public.site_visits WHERE visit_date BETWEEN v_since AND v_today),
    'newAccounts', (SELECT coalesce(sum(accounts), 0) FROM account_days),
    'signedInUsers', (SELECT count(DISTINCT user_id) FROM public.site_login_events WHERE created_at >= v_start AND created_at < ((v_today + 1)::timestamp AT TIME ZONE 'UTC')),
    'logins', (SELECT coalesce(sum(logins), 0) FROM login_days),
    'daily', (SELECT jsonb_agg(jsonb_build_object(
      'date', to_char(d.day, 'YYYY-MM-DD'),
      'visitors', coalesce(v.visitors, 0), 'visits', coalesce(v.visits, 0),
      'newAccounts', coalesce(a.accounts, 0), 'logins', coalesce(l.logins, 0)
    ) ORDER BY d.day) FROM days d LEFT JOIN visit_days v USING (day) LEFT JOIN account_days a USING (day) LEFT JOIN login_days l USING (day)),
    'notifications', (SELECT coalesce(jsonb_agg(n.item ORDER BY (n.read_at IS NULL) DESC, n.created_at DESC, n.id DESC), '[]'::jsonb) FROM (
      SELECT n.id, n.created_at, n.read_at, jsonb_build_object(
        'id', n.id, 'userId', n.user_id, 'name', coalesce(p.name, ''), 'email', coalesce(p.email, ''),
        'createdAt', n.created_at, 'readAt', n.read_at
      ) AS item
      FROM public.admin_signup_notifications n JOIN public.profiles p ON p.id = n.user_id
      -- Unread rows stay reachable even when the inbox grows past 50 items.
      ORDER BY (n.read_at IS NULL) DESC, n.created_at DESC, n.id DESC LIMIT 50
    ) n),
    'unreadCount', (SELECT count(*) FROM public.admin_signup_notifications WHERE read_at IS NULL)
  ) INTO v_result;
  RETURN v_result;
END;
$$;
REVOKE ALL ON FUNCTION public.get_site_monitoring_summary() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_site_monitoring_summary() TO service_role;

COMMIT;
