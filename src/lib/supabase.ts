import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(url, anonKey, {
  auth: { persistSession: false },
});

export const APP_STATE_TABLE = "app_state";

export type AppStateRow = {
  key: string;
  value: unknown;
  updated_at: string;
};
