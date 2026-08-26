/*
# Create app_state table for cross-device sync (single-tenant, no auth)

## Purpose
Single key/value table storing the weekly planner's entire state in the
cloud so it appears identically on every device. Single-tenant app with
no sign-in: anon-key frontend can read/write freely; all rows are
intentionally shared/public.

## New Tables
- `app_state`
  - `key` (text, primary key)
  - `value` (jsonb, not null)
  - `updated_at` (timestamptz, default now(), refreshed by trigger)

## Security
- RLS enabled. Four policies (select/insert/update/delete) for
  anon + authenticated using USING(true)/WITH CHECK(true) because data
  is intentionally public in this single-tenant app.

## Realtime
- Table added to supabase_realtime publication for live cross-device sync.

## Idempotency
- Safe to re-run.
*/

CREATE TABLE IF NOT EXISTS app_state (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE app_state ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_app_state" ON app_state;
CREATE POLICY "anon_select_app_state" ON app_state FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_app_state" ON app_state;
CREATE POLICY "anon_insert_app_state" ON app_state FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_app_state" ON app_state;
CREATE POLICY "anon_update_app_state" ON app_state FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_app_state" ON app_state;
CREATE POLICY "anon_delete_app_state" ON app_state FOR DELETE
  TO anon, authenticated USING (true);

CREATE OR REPLACE FUNCTION touch_app_state_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS app_state_touch ON app_state;
CREATE TRIGGER app_state_touch
  BEFORE UPDATE ON app_state
  FOR EACH ROW
  EXECUTE FUNCTION touch_app_state_updated_at();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'app_state'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE app_state;
  END IF;
END $$;