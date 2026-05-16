-- 1. TABEL USERS (Profil dan Status Langganan)
CREATE TABLE public.users (
  -- ID ini harus sama dengan ID di auth.users (Supabase Auth)
  id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL PRIMARY KEY,
  email text UNIQUE,
  full_name text,
  avatar_url text, -- Tambahkan kolom ini
  is_pro boolean DEFAULT false,
  subscription_end_date timestamptz,
  revenuecat_id text UNIQUE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. TABEL PAYMENTS (Riwayat Transaksi)
CREATE TABLE public.payments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  transaction_id text UNIQUE NOT NULL, -- ID dari Store/RevenueCat
  amount numeric,
  currency text DEFAULT 'IDR',
  status text, -- succeeded, failed, refunded
  created_at timestamptz DEFAULT now()
);

-- 3. AKTIFKAN KEAMANAN (Row Level Security)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- 4. KEBIJAKAN AKSES (Policies)
-- User hanya bisa melihat datanya sendiri di tabel users
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
CREATE POLICY "Users can view their own profile" 
ON public.users FOR SELECT 
USING (auth.uid() = id);

-- User bisa mengupdate profilnya sendiri (penting untuk is_pro)
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
CREATE POLICY "Users can update their own profile" 
ON public.users FOR UPDATE 
USING (auth.uid() = id);

-- User hanya bisa melihat riwayat pembayarannya sendiri
DROP POLICY IF EXISTS "Users can view their own payments" ON public.payments;
CREATE POLICY "Users can view their own payments" 
ON public.payments FOR SELECT 
USING (auth.uid() = user_id);

-- User bisa mencatat pembayarannya sendiri
DROP POLICY IF EXISTS "Users can insert their own payments" ON public.payments;
CREATE POLICY "Users can insert their own payments" 
ON public.payments FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- 5. TRIGGER OTOMATIS UNTUK UPDATED_AT
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

-- 6. TRIGGER UNTUK OTOMATIS COPY DATA DARI AUTH KE PUBLIC.USERS
-- Setiap kali user baru daftar lewat Google, baris di public.users akan otomatis dibuat.
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, avatar_url)
  VALUES (
    new.id, 
    new.email, 
    COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', 'User'),
    COALESCE(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture', '')
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
