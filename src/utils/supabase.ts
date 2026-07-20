// src/utils/supabase.ts

import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Check your .env.local file.');
}

// Export a singleton instance for Client Components
// This automatically syncs Auth state with browser cookies so Server Components can read them.
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);