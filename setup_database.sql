-- 1. Create tutor_sessions table
CREATE TABLE IF NOT EXISTS public.tutor_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL DEFAULT 'Yangi Suhbat',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Modify messages table
-- Agar `messages` jadvali oldin yaratilgan bo'lsa, avval unga `session_id` ustunini qo'shamiz
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS session_id UUID REFERENCES public.tutor_sessions(id) ON DELETE CASCADE;

-- 3. Enable RLS (Row Level Security)
ALTER TABLE public.tutor_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- 4. Create Policies for tutor_sessions
DROP POLICY IF EXISTS "Foydalanuvchi o'z suhbatlarini ko'rishi mumkin" ON public.tutor_sessions;
CREATE POLICY "Foydalanuvchi o'z suhbatlarini ko'rishi mumkin"
ON public.tutor_sessions FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Foydalanuvchi o'ziga suhbat yaratishi mumkin" ON public.tutor_sessions;
CREATE POLICY "Foydalanuvchi o'ziga suhbat yaratishi mumkin"
ON public.tutor_sessions FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Foydalanuvchi o'z suhbatini o'chirishi mumkin" ON public.tutor_sessions;
CREATE POLICY "Foydalanuvchi o'z suhbatini o'chirishi mumkin"
ON public.tutor_sessions FOR DELETE
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Foydalanuvchi o'z suhbatini yangilashi mumkin" ON public.tutor_sessions;
CREATE POLICY "Foydalanuvchi o'z suhbatini yangilashi mumkin"
ON public.tutor_sessions FOR UPDATE
USING (auth.uid() = user_id);

-- 5. Create Policies for messages
DROP POLICY IF EXISTS "Foydalanuvchi o'z xabarlarini ko'rishi mumkin" ON public.messages;
CREATE POLICY "Foydalanuvchi o'z xabarlarini ko'rishi mumkin"
ON public.messages FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Foydalanuvchi o'ziga xabar yozishi mumkin" ON public.messages;
CREATE POLICY "Foydalanuvchi o'ziga xabar yozishi mumkin"
ON public.messages FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Foydalanuvchi o'z xabarlarini o'chirishi mumkin" ON public.messages;
CREATE POLICY "Foydalanuvchi o'z xabarlarini o'chirishi mumkin"
ON public.messages FOR DELETE
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Foydalanuvchi o'z xabarlarini yangilashi mumkin" ON public.messages;
CREATE POLICY "Foydalanuvchi o'z xabarlarini yangilashi mumkin"
ON public.messages FOR UPDATE
USING (auth.uid() = user_id);
