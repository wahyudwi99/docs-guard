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

-- 2. TABEL USERS (Profil Dasar)
CREATE TABLE public.users (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY, -- Internal Profile ID
  auth_id uuid REFERENCES auth.users(id) ON DELETE SET NULL UNIQUE, -- Link to Auth (Null if deleted)
  email text, -- Tidak UNIQUE agar bisa re-register setelah hapus akun
  full_name text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 3. TABEL PAYMENTS (Append-only Log)
CREATE TABLE public.payments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE NOT NULL, -- References the Internal Profile ID
  transaction_id text NOT NULL, 
  product_id text,
  amount numeric,
  currency text DEFAULT 'IDR',
  status text,
  created_at timestamptz DEFAULT now()
);

-- 4. TABEL CONTACT MESSAGES
CREATE TABLE public.contact_messages (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  email text NOT NULL,
  message text NOT NULL,
  is_processed boolean DEFAULT false,
  sent_at timestamptz DEFAULT now()
);

-- 5. AKTIFKAN KEAMANAN (RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;

-- 6. KEBIJAKAN AKSES (Policies)
CREATE POLICY "Users can manage their own profile" 
ON public.users FOR ALL
USING (auth.uid() = auth_id)
WITH CHECK (auth.uid() = auth_id);

CREATE POLICY "Users can insert and view their own payments" 
ON public.payments FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.users 
  WHERE public.users.id = public.payments.user_id 
  AND public.users.auth_id = auth.uid()
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.users 
  WHERE public.users.id = public.payments.user_id 
  AND public.users.auth_id = auth.uid()
));

CREATE POLICY "Anyone can submit contact messages" 
ON public.contact_messages FOR INSERT 
WITH CHECK (true);

-- 7. TRIGGER OTOMATIS UNTUK UPDATED_AT
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at
BEFORE UPDATE ON public.users
FOR EACH ROW
EXECUTE PROCEDURE update_updated_at_column();

-- 8. FUNGSI SINKRONISASI TOTAL (Database Level Only)
-- Fungsi ini menangani pembuatan dan pemulihan data profil secara otomatis
CREATE OR REPLACE FUNCTION public.handle_auth_user_sync()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (auth_id, email, full_name)
  VALUES (
    new.id, 
    new.email, 
    COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', 'User')
  )
  ON CONFLICT (auth_id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    updated_at = now();
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. TRIGGER UNTUK SINKRONISASI SAAT SIGNUP (INSERT)
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_auth_user_sync();

-- 10. TRIGGER UNTUK SINKRONISASI SAAT LOGIN (UPDATE last_sign_in_at)
CREATE TRIGGER on_auth_user_login
  AFTER UPDATE ON auth.users
  FOR EACH ROW 
  WHEN (old.last_sign_in_at IS DISTINCT FROM new.last_sign_in_at)
  EXECUTE PROCEDURE public.handle_auth_user_sync();

-- 11. FUNGSI PENGHAPUSAN AKUN (Anonymize + Delete Auth User)
-- Fungsi ini memungkinkan user untuk menghapus akun mereka sendiri secara total
CREATE OR REPLACE FUNCTION public.delete_user_account()
RETURNS void AS $$
DECLARE
  target_auth_id uuid;
BEGIN
  target_auth_id := auth.uid();
  
  IF target_auth_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- 1. Anonymize data di public.users dan putus hubungan dengan auth_id
  UPDATE public.users 
  SET 
    email = 'deleted_' || substr(md5(random()::text), 1, 8) || '_' || email,
    full_name = 'Deleted User ' || substr(md5(random()::text), 1, 4),
    auth_id = NULL,
    updated_at = now()
  WHERE auth_id = target_auth_id;

  -- 2. Hapus user dari auth.users (Tindakan Administratif via SECURITY DEFINER)
  DELETE FROM auth.users WHERE id = target_auth_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
