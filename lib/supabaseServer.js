import 'server-only';
import { createClient } from '@supabase/supabase-js';

// สร้าง client ฝั่งเซิร์ฟเวอร์ ถ้าส่ง accessToken มา จะทำงานในสิทธิ์ของพนักงานคนนั้น (RLS / auth.uid() ใช้ได้)
export function serverSupabase(accessToken) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  return createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : undefined,
  });
}
