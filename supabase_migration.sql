-- 1. HAPUS SEMUANYA AGAR BERSIH
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP TABLE IF EXISTS public.payments;
DROP TABLE IF EXISTS public.users;

-- 2. TABEL USERS (Hanya Profil Dasar)
CREATE TABLE public.users (
  id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL PRIMARY KEY,
  email text UNIQUE,
  full_name text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 3. TABEL PAYMENTS (Append-only Log Riwayat Transaksi)
CREATE TABLE public.payments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  transaction_id text NOT NULL, 
  product_id text,
  amount numeric,
  currency text DEFAULT 'IDR',
  status text,
  created_at timestamptz DEFAULT now()
);

-- 4. AKTIFKAN KEAMANAN (Row Level Security)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- 5. KEBIJAKAN AKSES (Policies)
CREATE POLICY "Users can manage their own profile" 
ON public.users FOR ALL
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert and view their own payments" 
ON public.payments FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 6. TRIGGER OTOMATIS UNTUK UPDATED_AT
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

-- 7. FUNGSI SINKRONISASI (Self-Healing)
-- Fungsi ini akan dijalankan lewat trigger atau dipanggil manual jika data hilang
CREATE OR REPLACE FUNCTION public.sync_user_profile(user_id uuid, user_email text, user_metadata jsonb)
RETURNS void AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name)
  VALUES (
    user_id, 
    user_email, 
    COALESCE(user_metadata->>'full_name', user_metadata->>'name', 'User')
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. TRIGGER UNTUK SINKRONISASI OTOMATIS SAAT AUTH INSERT
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  PERFORM public.sync_user_profile(new.id, new.email, new.raw_user_meta_data);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
