export interface ContentItem {
  id: string;
  title: string;
  subtitle?: string;
  type: 'workout' | 'audio' | 'article' | 'program';
  category: string;
  duration?: number; // in minutes
  calories?: number;
  instructor?: string;
  coverImage: string;
  tags: string[];
  isPremium: boolean;
}

export interface WorkoutStep {
  id: string;
  title: string;
  reps?: number;
  sets?: number;
  duration?: number; // in seconds
  videoUrl?: string; // gif or video placeholder
}

export interface Workout extends ContentItem {
  type: 'workout';
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  steps: WorkoutStep[];
  startedCount: number;
}

export interface AudioTrack extends ContentItem {
  type: 'audio';
  audioUrl?: string;
}

export interface Article extends ContentItem {
  type: 'article';
  readTime: number;
  content: string;
}

export interface Program extends ContentItem {
  type: 'program';
  episodes: number;
  items: string[]; // IDs of workouts/audio
}

// --- MOCK DATABASE ---
export const MOCK_WORKOUTS: Workout[] = [
  {
    id: 'w1',
    title: '5 minute Fat Burn',
    type: 'workout',
    category: 'Cardio',
    difficulty: 'Beginner',
    duration: 8,
    calories: 32,
    startedCount: 59,
    isPremium: false,
    coverImage: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&q=80',
    tags: ['Fat Burn', 'Quick'],
    steps: [
      { id: 's1', title: 'Jumping Oblique Twists', reps: 12, sets: 2 },
      { id: 's2', title: 'High Knees', duration: 45, sets: 2 }
    ]
  },
  {
    id: 'w2',
    title: 'Mini Cardio Workout',
    type: 'workout',
    category: 'Cardio',
    difficulty: 'Intermediate',
    duration: 10,
    calories: 41,
    startedCount: 64,
    isPremium: true,
    coverImage: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?auto=format&fit=crop&q=80',
    tags: ['Cardio', 'Home'],
    steps: []
  },
  {
    id: 'w3',
    title: 'Quick Cardio Blast',
    type: 'workout',
    category: 'Cardio',
    difficulty: 'Advanced',
    duration: 11,
    calories: 42,
    startedCount: 81,
    isPremium: true,
    coverImage: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&q=80',
    tags: ['HIIT'],
    steps: []
  },
  {
    id: 'w4',
    title: 'Strength with Kim',
    subtitle: 'Upbeat Anthems',
    type: 'workout',
    category: 'Strength',
    difficulty: 'Intermediate',
    duration: 10,
    instructor: 'Kim',
    startedCount: 120,
    isPremium: false,
    coverImage: 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?auto=format&fit=crop&q=80',
    tags: ['Strength', 'Dumbbells'],
    steps: []
  },
  {
    id: 'w5',
    title: 'Yoga with Dice',
    subtitle: 'Hip-Hop/R&B',
    type: 'workout',
    category: 'Yoga',
    difficulty: 'Beginner',
    duration: 10,
    instructor: 'Dice',
    startedCount: 300,
    isPremium: false,
    coverImage: 'https://images.unsplash.com/photo-1599901860904-17e6ed7083a0?auto=format&fit=crop&q=80',
    tags: ['Yoga', 'Flow'],
    steps: []
  }
];

export const MOCK_AUDIO: AudioTrack[] = [
  {
    id: 'a1',
    title: 'Stressed',
    subtitle: 'River',
    type: 'audio',
    category: 'Meditation',
    coverImage: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&q=80',
    tags: ['Focus'],
    isPremium: false
  },
  {
    id: 'a2',
    title: 'Falling Asleep',
    subtitle: 'River',
    type: 'audio',
    category: 'Sleep',
    coverImage: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&q=80',
    tags: ['Sleep'],
    isPremium: false
  },
  {
    id: 'a3',
    title: 'Mindful Breathing',
    type: 'audio',
    category: 'Mindfulness',
    duration: 10,
    coverImage: 'https://images.unsplash.com/photo-1515023115689-589c33041d3c?auto=format&fit=crop&q=80',
    tags: ['Breathwork'],
    isPremium: false
  },
  {
    id: 'a4',
    title: 'My Riverside Bed',
    subtitle: 'Ashwin Palaparthi',
    type: 'audio',
    category: 'Music',
    duration: 6,
    coverImage: 'https://images.unsplash.com/photo-1437622368342-7a3d73a34c8f?auto=format&fit=crop&q=80',
    tags: ['Sleep'],
    isPremium: true
  },
  {
    id: 'a5',
    title: 'A Silent Forest',
    subtitle: 'Ashwin Palaparthi',
    type: 'audio',
    category: 'Music',
    duration: 10,
    coverImage: 'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&q=80',
    tags: ['Focus'],
    isPremium: false
  }
];

export const MOCK_ARTICLES: Article[] = [
  {
    id: 'ar1',
    title: '3 Crucial Life Lessons I Have Learned During This Lockdown Phase',
    type: 'article',
    category: 'Mindset',
    readTime: 5,
    coverImage: 'https://images.unsplash.com/photo-1517842645767-c639042777db?auto=format&fit=crop&q=80',
    tags: ['Popular'],
    isPremium: false,
    content: 'Full article content would go here...'
  },
  {
    id: 'ar2',
    title: 'Overcome Overthinking - 10 Simple Tips from a Therapist',
    type: 'article',
    category: 'Mental Health',
    readTime: 8,
    coverImage: 'https://images.unsplash.com/photo-1522849696084-83e73684a22b?auto=format&fit=crop&q=80',
    tags: ['Popular'],
    isPremium: false,
    content: 'Full article content would go here...'
  }
];

export const MOCK_PROGRAMS: Program[] = [
  {
    id: 'p1',
    title: '12 Stretchy Yoga Flows',
    subtitle: 'Designed for Relaxation',
    type: 'program',
    category: 'Yoga',
    episodes: 12,
    coverImage: 'https://images.unsplash.com/photo-1552289172-132d733527a0?auto=format&fit=crop&q=80',
    tags: ['Relaxation'],
    isPremium: false,
    items: []
  }
];

// --- ENGINE LOGIC ---

export function getRecommendedWorkouts(): Workout[] {
  return MOCK_WORKOUTS;
}

export function getAudioLibrary(): AudioTrack[] {
  return MOCK_AUDIO;
}

export function getArticles(): Article[] {
  return MOCK_ARTICLES;
}

export function getPrograms(): Program[] {
  return MOCK_PROGRAMS;
}

export function markContentCompleted(id: string) {
  try {
    const key = 'hc_content_history';
    const history = JSON.parse(localStorage.getItem(key) || '[]');
    if (!history.includes(id)) {
      history.push(id);
      localStorage.setItem(key, JSON.stringify(history));
    }
  } catch (e) {
    console.error(e);
  }
}

export function isContentCompleted(id: string): boolean {
  try {
    const history = JSON.parse(localStorage.getItem('hc_content_history') || '[]');
    return history.includes(id);
  } catch {
    return false;
  }
}
