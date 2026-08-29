import os

migration_sql = """
-- ===== 20260829_fitness_platform.sql =====
-- Cinematic Fitness & Wellness Overhaul
-- Creates 18 tables, RLS policies, storage buckets, and RPCs for the fitness platform.

-- 1. Create Core Content Tables (Admin-managed, public read)

CREATE TABLE IF NOT EXISTS public.fitness_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  label TEXT NOT NULL,
  description TEXT,
  cover_image_url TEXT,
  icon_name TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.fitness_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('workout', 'meditation', 'soundscape', 'sleep_story', 'article', 'breathwork')),
  category_id UUID REFERENCES public.fitness_categories(id),
  title TEXT NOT NULL,
  subtitle TEXT,
  description TEXT,
  cover_image_url TEXT,
  audio_url TEXT,
  video_url TEXT,
  duration_minutes INTEGER,
  calories_estimate INTEGER,
  difficulty TEXT CHECK (difficulty IN ('Beginner', 'Intermediate', 'Advanced', 'Athlete')),
  equipment TEXT[],
  music_genre TEXT,
  breathwork_pattern JSONB,
  is_premium BOOLEAN DEFAULT false,
  is_featured BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  publish_at TIMESTAMPTZ,
  sort_order INTEGER DEFAULT 0,
  started_count INTEGER DEFAULT 0,
  completed_count INTEGER DEFAULT 0,
  avg_rating NUMERIC(3,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fitness_content_type ON public.fitness_content(type);
CREATE INDEX IF NOT EXISTS idx_fitness_content_category ON public.fitness_content(category_id);
CREATE INDEX IF NOT EXISTS idx_fitness_content_difficulty ON public.fitness_content(difficulty);
CREATE INDEX IF NOT EXISTS idx_fitness_content_active ON public.fitness_content(is_active, publish_at);
CREATE INDEX IF NOT EXISTS idx_fitness_content_featured ON public.fitness_content(is_featured) WHERE is_featured = true;

CREATE TABLE IF NOT EXISTS public.fitness_content_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id UUID NOT NULL REFERENCES public.fitness_content(id) ON DELETE CASCADE,
  step_order INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  duration_seconds INTEGER,
  reps INTEGER,
  sets INTEGER DEFAULT 1,
  rest_seconds INTEGER DEFAULT 30,
  modification_easier TEXT,
  modification_harder TEXT,
  UNIQUE(content_id, step_order)
);

CREATE TABLE IF NOT EXISTS public.fitness_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  label TEXT NOT NULL,
  color TEXT
);

CREATE TABLE IF NOT EXISTS public.fitness_content_tags (
  content_id UUID REFERENCES public.fitness_content(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES public.fitness_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (content_id, tag_id)
);

CREATE TABLE IF NOT EXISTS public.fitness_programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  subtitle TEXT,
  description TEXT,
  cover_image_url TEXT,
  category_id UUID REFERENCES public.fitness_categories(id),
  difficulty TEXT CHECK (difficulty IN ('Beginner', 'Intermediate', 'Advanced', 'Athlete', 'All Levels')),
  total_episodes INTEGER NOT NULL,
  duration_weeks INTEGER,
  is_premium BOOLEAN DEFAULT false,
  is_featured BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.fitness_program_episodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID NOT NULL REFERENCES public.fitness_programs(id) ON DELETE CASCADE,
  content_id UUID NOT NULL REFERENCES public.fitness_content(id),
  episode_number INTEGER NOT NULL,
  title TEXT,
  is_free_preview BOOLEAN DEFAULT false,
  UNIQUE(program_id, episode_number)
);

CREATE TABLE IF NOT EXISTS public.fitness_sports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  emoji TEXT,
  description TEXT,
  focus_areas TEXT[],
  cover_image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.fitness_sport_weeks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sport_id UUID NOT NULL REFERENCES public.fitness_sports(id) ON DELETE CASCADE,
  phase TEXT NOT NULL CHECK (phase IN ('GPP', 'SPP', 'Peak')),
  week_number INTEGER NOT NULL,
  title TEXT,
  description TEXT,
  sessions_per_week INTEGER DEFAULT 3,
  UNIQUE(sport_id, week_number)
);

CREATE TABLE IF NOT EXISTS public.fitness_sport_days (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_id UUID NOT NULL REFERENCES public.fitness_sport_weeks(id) ON DELETE CASCADE,
  day_number INTEGER NOT NULL,
  content_id UUID REFERENCES public.fitness_content(id),
  title TEXT,
  is_rest_day BOOLEAN DEFAULT false,
  UNIQUE(week_id, day_number)
);


-- 2. Create User Tables (RLS protected)

CREATE TABLE IF NOT EXISTS public.user_fitness_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content_id UUID NOT NULL REFERENCES public.fitness_content(id),
  content_type TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  calories_burned INTEGER,
  was_completed BOOLEAN DEFAULT false,
  rating SMALLINT CHECK (rating BETWEEN 1 AND 5),
  notes TEXT,
  device_platform TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_user_fitness_history_user ON public.user_fitness_history(user_id);
CREATE INDEX IF NOT EXISTS idx_user_fitness_history_content ON public.user_fitness_history(content_id);
CREATE INDEX IF NOT EXISTS idx_user_fitness_history_date ON public.user_fitness_history(user_id, started_at DESC);

CREATE TABLE IF NOT EXISTS public.user_program_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  program_id UUID NOT NULL REFERENCES public.fitness_programs(id),
  current_episode INTEGER DEFAULT 1,
  completed_episodes INTEGER[] DEFAULT '{}',
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  UNIQUE(user_id, program_id)
);

CREATE TABLE IF NOT EXISTS public.user_streaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_active_date DATE,
  streak_freezes_available INTEGER DEFAULT 0,
  streak_freezes_used INTEGER DEFAULT 0,
  total_workout_days INTEGER DEFAULT 0,
  total_meditation_days INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_slug TEXT NOT NULL,
  earned_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, badge_slug)
);

CREATE TABLE IF NOT EXISTS public.user_body_measurements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  measured_at DATE NOT NULL DEFAULT CURRENT_DATE,
  weight_kg NUMERIC(5,2),
  waist_cm NUMERIC(5,2),
  chest_cm NUMERIC(5,2),
  arm_cm NUMERIC(5,2),
  thigh_cm NUMERIC(5,2),
  body_fat_pct NUMERIC(4,1),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_body_measurements_user ON public.user_body_measurements(user_id, measured_at DESC);

CREATE TABLE IF NOT EXISTS public.user_progress_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  pose TEXT CHECK (pose IN ('front', 'side', 'back', 'custom')),
  taken_at DATE DEFAULT CURRENT_DATE,
  measurement_id UUID REFERENCES public.user_body_measurements(id),
  is_private BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_favorites (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content_id UUID NOT NULL REFERENCES public.fitness_content(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (user_id, content_id)
);


-- 3. Row Level Security (RLS) Policies

-- Content Tables (Public read, admin write via service_role)
ALTER TABLE public.fitness_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fitness_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fitness_content_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fitness_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fitness_content_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fitness_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fitness_program_episodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fitness_sports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fitness_sport_weeks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fitness_sport_days ENABLE ROW LEVEL SECURITY;

-- Grant select to anon and authenticated
GRANT SELECT ON public.fitness_categories TO anon, authenticated;
GRANT SELECT ON public.fitness_content TO anon, authenticated;
GRANT SELECT ON public.fitness_content_steps TO anon, authenticated;
GRANT SELECT ON public.fitness_tags TO anon, authenticated;
GRANT SELECT ON public.fitness_content_tags TO anon, authenticated;
GRANT SELECT ON public.fitness_programs TO anon, authenticated;
GRANT SELECT ON public.fitness_program_episodes TO anon, authenticated;
GRANT SELECT ON public.fitness_sports TO anon, authenticated;
GRANT SELECT ON public.fitness_sport_weeks TO anon, authenticated;
GRANT SELECT ON public.fitness_sport_days TO anon, authenticated;

-- Public read policies for content
CREATE POLICY "Public read active categories" ON public.fitness_categories FOR SELECT USING (is_active = true);
CREATE POLICY "Public read active content" ON public.fitness_content FOR SELECT USING (is_active = true AND (publish_at IS NULL OR publish_at <= now()));
CREATE POLICY "Public read steps" ON public.fitness_content_steps FOR SELECT USING (true);
CREATE POLICY "Public read tags" ON public.fitness_tags FOR SELECT USING (true);
CREATE POLICY "Public read content tags" ON public.fitness_content_tags FOR SELECT USING (true);
CREATE POLICY "Public read active programs" ON public.fitness_programs FOR SELECT USING (is_active = true);
CREATE POLICY "Public read program episodes" ON public.fitness_program_episodes FOR SELECT USING (true);
CREATE POLICY "Public read sports" ON public.fitness_sports FOR SELECT USING (is_active = true);
CREATE POLICY "Public read sport weeks" ON public.fitness_sport_weeks FOR SELECT USING (true);
CREATE POLICY "Public read sport days" ON public.fitness_sport_days FOR SELECT USING (true);


-- User Tables (Owner-only access)
ALTER TABLE public.user_fitness_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_program_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_body_measurements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_progress_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_favorites ENABLE ROW LEVEL SECURITY;

GRANT ALL ON public.user_fitness_history TO authenticated;
GRANT ALL ON public.user_program_progress TO authenticated;
GRANT ALL ON public.user_streaks TO authenticated;
GRANT ALL ON public.user_badges TO authenticated;
GRANT ALL ON public.user_body_measurements TO authenticated;
GRANT ALL ON public.user_progress_photos TO authenticated;
GRANT ALL ON public.user_favorites TO authenticated;

CREATE POLICY "Users own history" ON public.user_fitness_history FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users own progress" ON public.user_program_progress FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users own streaks" ON public.user_streaks FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users own badges" ON public.user_badges FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users own measurements" ON public.user_body_measurements FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users own photos" ON public.user_progress_photos FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users own favorites" ON public.user_favorites FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);


-- 4. RPCs for Atomic Actions

CREATE OR REPLACE FUNCTION public.complete_workout_session(
  p_user_id UUID, p_content_id UUID, p_duration_seconds INTEGER, p_calories INTEGER
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_badges TEXT[] := '{}';
  v_total_workouts INTEGER;
BEGIN
  -- Mark session complete
  UPDATE public.user_fitness_history
  SET completed_at = now(), was_completed = true,
      duration_seconds = p_duration_seconds, calories_burned = p_calories
  WHERE user_id = p_user_id AND content_id = p_content_id AND completed_at IS NULL;

  -- Increment content popularity counter
  UPDATE public.fitness_content SET completed_count = completed_count + 1 WHERE id = p_content_id;

  -- Badge Check: First workout
  SELECT COUNT(*) INTO v_total_workouts FROM public.user_fitness_history
  WHERE user_id = p_user_id AND was_completed = true;

  IF v_total_workouts = 1 THEN
    INSERT INTO public.user_badges(user_id, badge_slug) VALUES (p_user_id, 'first_workout')
      ON CONFLICT DO NOTHING;
    v_new_badges := array_append(v_new_badges, 'first_workout');
  END IF;

  IF v_total_workouts = 10 THEN
    INSERT INTO public.user_badges(user_id, badge_slug) VALUES (p_user_id, '10_workouts')
      ON CONFLICT DO NOTHING;
    v_new_badges := array_append(v_new_badges, '10_workouts');
  END IF;

  RETURN jsonb_build_object('new_badges', v_new_badges, 'total_workouts', v_total_workouts);
END;
$$;

REVOKE ALL ON FUNCTION public.complete_workout_session(UUID, UUID, INTEGER, INTEGER) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.complete_workout_session(UUID, UUID, INTEGER, INTEGER) TO authenticated, service_role;


-- 5. Storage Buckets & Policies

INSERT INTO storage.buckets (id, name, public) VALUES ('fitness-content', 'fitness-content', true) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('progress-photos', 'progress-photos', false) ON CONFLICT DO NOTHING;

-- Storage policies for user photos
DROP POLICY IF EXISTS "Users upload own photos" ON storage.objects;
CREATE POLICY "Users upload own photos" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'progress-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users read own photos" ON storage.objects;
CREATE POLICY "Users read own photos" ON storage.objects
  FOR SELECT USING (bucket_id = 'progress-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users delete own photos" ON storage.objects;
CREATE POLICY "Users delete own photos" ON storage.objects
  FOR DELETE USING (bucket_id = 'progress-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Admin content bucket is public read, service_role write

-- 6. Analytics Views (Service Role Only)

CREATE OR REPLACE VIEW public.fitness_content_analytics WITH (security_invoker = true) AS
SELECT c.id, c.title, c.type, c.difficulty,
  c.started_count, c.completed_count,
  CASE WHEN c.started_count > 0 THEN ROUND(c.completed_count::numeric / c.started_count * 100, 1) ELSE 0 END AS completion_rate_pct,
  c.avg_rating
FROM public.fitness_content c
WHERE c.is_active = true
ORDER BY c.started_count DESC;

CREATE OR REPLACE VIEW public.fitness_daily_activity WITH (security_invoker = true) AS
SELECT DATE(started_at) as day,
  COUNT(*) as total_sessions,
  COUNT(DISTINCT user_id) as unique_users,
  COUNT(*) FILTER (WHERE was_completed) as completed_sessions,
  SUM(duration_seconds) / 60 as total_minutes,
  SUM(calories_burned) as total_calories
FROM public.user_fitness_history
GROUP BY DATE(started_at)
ORDER BY day DESC;

REVOKE ALL ON public.fitness_content_analytics FROM public, anon, authenticated;
REVOKE ALL ON public.fitness_daily_activity FROM public, anon, authenticated;
GRANT SELECT ON public.fitness_content_analytics TO service_role;
GRANT SELECT ON public.fitness_daily_activity TO service_role;

"""

with open('supabase/migrations/20260829_fitness_platform.sql', 'w', encoding='utf-8') as f:
    f.write(migration_sql)

with open('supabase/APPLY_ALL.sql', 'a', encoding='utf-8') as f:
    f.write('\n\n' + migration_sql)

print("Migration SQL files written.")
