import { supabase } from './supabaseClient';

export interface FitnessProgram {
  id: string;
  title: string;
  subtitle: string;
  gradient: string;
  icon_name: string;
  cover_image_url?: string;
  total_episodes: number;
  duration_weeks: number;
}

export interface FitnessCategory {
  id: string;
  slug: string;
  label: string;
  description: string;
  cover_image_url: string;
  icon_name: string;
}

export interface FitnessContent {
  id: string;
  category_id: string;
  is_active: boolean;
  completed_count?: number;
  started_count?: number;
  type: 'workout' | 'meditation' | 'soundscape' | 'sleep_story' | 'article' | 'breathwork';
  title: string;
  subtitle: string;
  description: string;
  cover_image_url: string;
  audio_url: string;
  video_url: string;
  duration_minutes: number;
  calories_estimate: number;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced' | 'Athlete';
  equipment: string[];
  music_genre?: string;
  breathwork_pattern?: any;
  is_premium: boolean;
  is_featured: boolean;
}


interface FitnessCache {
  categories?: FitnessCategory[];
  programs?: FitnessProgram[];
  activeContent?: FitnessContent[];
  specialtyContent?: FitnessContent[];
  timestamp?: number;
}
const CACHE_TTL = 1000 * 60 * 5; // 5 minutes
let memoryCache: FitnessCache = {};

export const FitnessService = {
  async getUserFitnessHistory(userId: string) {
    const { data, error } = await supabase
      .from('user_fitness_history')
      .select('*, fitness_content(type, difficulty, category_id)')
      .eq('user_id', userId)
      .eq('was_completed', true)
      .order('completed_at', { ascending: true });
    
    if (error) throw error;
    
    // We'll also fetch categories manually if nested join fails, but let's try to get them
    const { data: categories } = await supabase.from('fitness_categories').select('id, name, slug');
    const catMap = (categories || []).reduce((acc: any, curr: any) => {
      acc[curr.id] = curr;
      return acc;
    }, {});
    
    return (data || []).map(item => ({
      ...item,
      category: item.fitness_content?.category_id ? catMap[item.fitness_content.category_id] : null
    }));
  },

  async startProgram(userId: string, programId: string) {
    const { data, error } = await supabase
      .from('user_program_progress')
      .upsert({
        user_id: userId,
        program_id: programId,
        started_at: new Date().toISOString(),
        is_active: true,
        current_episode: 1,
        completed_episodes: []
      }, { onConflict: 'user_id,program_id' })
      .select()
      .single();
      
    if (error) throw error;
    return data;
  },

  async getProgramEpisodes(programId: string) {
    const { data, error } = await supabase
      .from('fitness_program_episodes')
      .select('*, fitness_content(*)')
      .eq('program_id', programId)
      .order('episode_number', { ascending: true });
      
    if (error) throw error;
    return data.map((d: any) => d.fitness_content) as FitnessContent[];
  },

  async getAllActiveContent() {
    if (memoryCache.activeContent && memoryCache.timestamp && Date.now() - memoryCache.timestamp < CACHE_TTL) {
      return memoryCache.activeContent;
    }
    const { data, error } = await supabase
      .from('fitness_content')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });
      
    if (error) throw error;
    memoryCache.activeContent = data as FitnessContent[];
    memoryCache.timestamp = Date.now();
    return memoryCache.activeContent;
  },

  async getPrograms() {
    if (memoryCache.programs && memoryCache.timestamp && Date.now() - memoryCache.timestamp < CACHE_TTL) {
      return memoryCache.programs;
    }
    const { data, error } = await supabase
      .from('fitness_programs')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });
    
    if (error) throw error;
    memoryCache.programs = data as FitnessProgram[];
    memoryCache.timestamp = Date.now();
    return memoryCache.programs;
  },

  async getContentByDifficulty(difficulty: string) {
    const { data, error } = await supabase
      .from('fitness_content')
      .select('*')
      .eq('difficulty', difficulty)
      .eq('is_active', true)
      .order('sort_order', { ascending: true });
      
    if (error) throw error;
    return data as FitnessContent[];
  },

  async getSpecialtyContent() {
    // Activity Games and Hand-Eye
    const { data, error } = await supabase
      .from('fitness_content')
      .select('*, fitness_categories!inner(slug)')
      .in('fitness_categories.slug', ['activity-games', 'hand-eye'])
      .eq('is_active', true)
      .order('sort_order', { ascending: true });
      
    if (error) throw error;
    return data as FitnessContent[];
  },

  async getCategories() {
    const { data, error } = await supabase
      .from('fitness_categories')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });
    
    if (error) throw error;
    return data as FitnessCategory[];
  },

  async getContentByCategory(categoryId: string) {
    const { data, error } = await supabase
      .from('fitness_content')
      .select('*')
      .eq('category_id', categoryId)
      .eq('is_active', true)
      .order('sort_order', { ascending: true });
      
    if (error) throw error;
    return data as FitnessContent[];
  },

  async getFeaturedContent() {
    const { data, error } = await supabase
      .from('fitness_content')
      .select('*')
      .eq('is_featured', true)
      .eq('is_active', true)
      .limit(10);
      
    if (error) throw error;
    return data as FitnessContent[];
  },

  async completeWellnessSession(userId: string, contentId: string, durationSeconds: number, calories: number = 0) {
    return this.completeWorkoutSession(userId, contentId, durationSeconds, calories);
  },

  async completeWorkoutSession(userId: string, contentId: string, durationSeconds: number, calories: number) {
    const { data, error } = await supabase.rpc('complete_workout_session', {
      p_user_id: userId,
      p_content_id: contentId,
      p_duration_seconds: durationSeconds,
      p_calories: calories
    });

    if (error) throw error;
    return data;
  },

    async getUserStreaks(userId: string) {
    const { data, error } = await supabase
      .from('user_streaks')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },
  async getBodyMeasurements(userId: string) {
    const { data, error } = await supabase
      .from('user_body_measurements')
      .select('*')
      .eq('user_id', userId)
      .order('measured_at', { ascending: true });
    if (error) throw error;
    return data;
  },
    async getUserBadges(userId: string) {
    const { data, error } = await supabase
      .from('user_badges')
      .select('*')
      .eq('user_id', userId)
      .order('earned_at', { ascending: false });
    if (error) throw error;
    return data;
  },
  async getProgressPhotos(userId: string) {
    const { data, error } = await supabase
      .from('user_progress_photos')
      .select('*')
      .eq('user_id', userId)
      .order('taken_at', { ascending: false });
    if (error) throw error;
    return data;
  },
  async getSports() {
    const { data, error } = await supabase
      .from('fitness_sports')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });
    
    if (error) throw error;
    return data;
  }
};






