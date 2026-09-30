-- Winter Arc Tracker Database Schema

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Create habits table
CREATE TABLE IF NOT EXISTS public.habits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    name TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create daily_logs table
CREATE TABLE IF NOT EXISTS public.daily_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    log_date DATE NOT NULL,
    photo_url TEXT,
    journal_text TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, log_date)
);

-- 3. Create daily_log_completions table
CREATE TABLE IF NOT EXISTS public.daily_log_completions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    log_id UUID NOT NULL REFERENCES public.daily_logs(id) ON DELETE CASCADE,
    habit_id UUID NOT NULL REFERENCES public.habits(id) ON DELETE CASCADE,
    is_completed BOOLEAN DEFAULT false,
    UNIQUE(log_id, habit_id)
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_log_completions ENABLE ROW LEVEL SECURITY;

-- Create Policies for habits
CREATE POLICY "Users can view their own habits" 
ON public.habits FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own habits" 
ON public.habits FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own habits" 
ON public.habits FOR UPDATE 
USING (auth.uid() = user_id);

-- Create Policies for daily_logs
CREATE POLICY "Users can view their own logs" 
ON public.daily_logs FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own logs" 
ON public.daily_logs FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own logs" 
ON public.daily_logs FOR UPDATE 
USING (auth.uid() = user_id);

-- Create Policies for daily_log_completions
CREATE POLICY "Users can view their own completions"
ON public.daily_log_completions FOR SELECT
USING (EXISTS (
    SELECT 1 FROM public.daily_logs
    WHERE daily_logs.id = daily_log_completions.log_id
    AND daily_logs.user_id = auth.uid()
));

CREATE POLICY "Users can insert their own completions"
ON public.daily_log_completions FOR INSERT
WITH CHECK (EXISTS (
    SELECT 1 FROM public.daily_logs
    WHERE daily_logs.id = daily_log_completions.log_id
    AND daily_logs.user_id = auth.uid()
));

CREATE POLICY "Users can update their own completions"
ON public.daily_log_completions FOR UPDATE
USING (EXISTS (
    SELECT 1 FROM public.daily_logs
    WHERE daily_logs.id = daily_log_completions.log_id
    AND daily_logs.user_id = auth.uid()
));

-- Setup Storage Bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('winter-arc-photos', 'winter-arc-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies
CREATE POLICY "Users can upload their own photos" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'winter-arc-photos' AND auth.uid() = owner);

CREATE POLICY "Anyone can view public photos" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'winter-arc-photos');
