-- Phase 1: Fitness Content Seeding Script
-- Seeds initial categories, sports, and base content.

-- 1. Categories
INSERT INTO public.fitness_categories (slug, label, description, icon_name, sort_order) VALUES
('hiit', 'HIIT', 'High-Intensity Interval Training', 'Flame', 1),
('yoga', 'Yoga', 'Flexibility and mindfulness', 'Feather', 2),
('strength', 'Strength', 'Build muscle and power', 'Dumbbell', 3),
('meditation', 'Meditation', 'Mental wellness and focus', 'Heart', 4),
('running', 'Running', 'Cardiovascular endurance', 'Activity', 5)
ON CONFLICT (slug) DO NOTHING;

-- 2. Sports
INSERT INTO public.fitness_sports (slug, name, emoji, description) VALUES
('cricket', 'Cricket', '🏏', 'Rotational torso power and explosive drive'),
('tennis', 'Tennis', '🎾', 'Lateral deceleration and kinetic chain rotation'),
('football', 'Football', '⚽', 'Repeated sprint ability and change-of-direction'),
('athletics', 'Athletics', '🏃', 'Explosive sprinting and jump mechanics')
ON CONFLICT (slug) DO NOTHING;

-- 3. Content (Basic Seed)
DO $$ 
DECLARE
  v_hiit UUID;
  v_yoga UUID;
  v_meditation UUID;
BEGIN
  SELECT id INTO v_hiit FROM public.fitness_categories WHERE slug = 'hiit';
  SELECT id INTO v_yoga FROM public.fitness_categories WHERE slug = 'yoga';
  SELECT id INTO v_meditation FROM public.fitness_categories WHERE slug = 'meditation';

  INSERT INTO public.fitness_content (type, category_id, title, subtitle, duration_minutes, calories_estimate, difficulty, is_featured, is_premium)
  VALUES
  ('workout', v_hiit, '10-Min Fat Torch', 'Quick high-intensity interval blast', 10, 150, 'Beginner', true, false),
  ('workout', v_hiit, '30-Min AMRAP Crusher', 'As many rounds as possible', 30, 450, 'Advanced', false, true),
  ('workout', v_yoga, 'Gentle Morning Flow', 'Wake up your joints and muscles', 15, 80, 'Beginner', true, false),
  ('meditation', v_meditation, 'Letting Go of Worry', 'Release anxiety and find calm', 10, 0, 'Beginner', true, false),
  ('soundscape', v_meditation, 'Monsoon on a Tin Roof', 'Indian rainfall ambience', 45, 0, 'Beginner', false, false);
END $$;
