-- 1. HAPUS SEMUANYA AGAR BERSIH
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_login ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS public.sync_user_profile(uuid, text, jsonb);
DROP FUNCTION IF EXISTS public.handle_auth_user_sync();
DROP FUNCTION IF EXISTS public.delete_user_account();
DROP TABLE IF EXISTS public.contact_messages CASCADE;
DROP TABLE IF EXISTS public.payments CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;

-- 2. TABEL CONTACT MESSAGES
CREATE TABLE public.contact_messages (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  email text NOT NULL,
  message text NOT NULL,
  is_processed boolean DEFAULT false,
  sent_at timestamptz DEFAULT now()
);

-- 3. AKTIFKAN KEAMANAN (RLS)
ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;

-- 4. KEBIJAKAN AKSES (Policies)
CREATE POLICY "Anyone can submit contact messages" 
ON public.contact_messages FOR INSERT 
WITH CHECK (true);
