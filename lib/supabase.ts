import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder-fill-your-env-correctly.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  console.warn("CRITICAL: Supabase URL is undefined. Authentication will fail. Ensure .env is loaded during build.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
