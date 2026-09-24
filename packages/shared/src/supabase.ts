import { createClient } from "@supabase/supabase-js";

export function createBomaSupabaseClient(url: string, anonKey: string) {
  return createClient(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true
    }
  });
}

export function hasSupabaseConfig(url?: string, anonKey?: string) {
  return Boolean(url && anonKey);
}
