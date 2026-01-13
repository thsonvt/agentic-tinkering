import {createClient, SupabaseClient} from '@supabase/supabase-js';

let supabaseInstance: SupabaseClient | null = null;

export function getSupabaseClient(url?: string, anonKey?: string): SupabaseClient | null {
  if (typeof window === 'undefined') {
    return null;
  }

  if (supabaseInstance) {
    return supabaseInstance;
  }

  if (!url || !anonKey) {
    console.warn('Supabase credentials not provided');
    return null;
  }

  supabaseInstance = createClient(url, anonKey);
  return supabaseInstance;
}
