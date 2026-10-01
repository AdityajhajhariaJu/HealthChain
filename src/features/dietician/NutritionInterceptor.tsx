import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, ArrowLeft, Send, ArrowRight } from 'lucide-react';
import { analyzeFoodEntry } from '../../services/geminiService';
import { awardPoints } from '../../services/VitalityPointsEngine';
import { triggerHapticLight, triggerHapticSuccess } from '../../services/haptics';
import { useNavigate } from 'react-router-dom';
import { safeNavigateBack } from '../../services/navigation';
import { createMeal, mealEntryFromAnalysis } from '../../services/MealCommandService';
import { recordHealthMemory } from '../../services/HealthMemory';
import { captureAccountScope, isAccountScopeCurrent } from '../../services/AccountScope';

const RAPID_MEAL_BUILDERS = [
  '🥑 Avocado Toast & Poached Egg',
  '🍳 2 Scrambled Eggs & Sourdough',
  '☕ Black Espresso',
  '🥗 Greek Salad & Olive Oil',
  '🥣 Overnight Oats & Berries',
  '🍗 Grilled Chicken & Brown Rice',
  '🍲 Warm Dal & Basmati Rice',
  '🧀 Paneer Tikka & Greens',
  '🐟 Salmon Bowl & Quinoa'
];

interface NutritionItem {
  name?: string;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  fats?: number;
  sugar?: number;
  giTag?: string;
}

interface NutritionAnalysisPayload {
  clinical_insight?: string;
  items?: NutritionItem[];
  total?: {
    protein?: number;
    carbs?: number;
    fat?: number;
    calories?: number;
  };
}

export const NutritionInterceptor: React.FC = () => {
  const navigate = useNavigate();
  const [input, setInput] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [recentLog, setRecentLog] = useState<NutritionAnalysisPayload | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const displayNutrient = (value: unknown, unit = '') =>
    typeof value === 'number' && Number.isFinite(value) && value >= 0 ? `${value}${unit}` : 'Unknown';

  const handleAppendQuickMeal = (meal: string) => {
    triggerHapticLight();
    setInput(prev => {
      const trimmed = prev.trim();
      if (!trimmed) return meal;
      if (trimmed.toLowerCase().includes(meal.toLowerCase())) return prev;
      return `${trimmed}, ${meal}`;
    });
  };

  const handleLog = async () => {
    if (!input.trim()) return;
    const scope = captureAccountScope();
    triggerHapticLight();
    setIsAnalyzing(true);
    setSaveError(null);
    
    try {
      const result = await analyzeFoodEntry(input);
      if (!isAccountScopeCurrent(scope)) return;
      if (result && Array.isArray(result.items) && result.items.length > 0) {
        const now = new Date();
        const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        const entry = mealEntryFromAnalysis(input, result.items, { type: 'Meal' });
        const saved = await createMeal({ localDate: today, entry, captureMethod: 'quick_nutrition' });
        if (!isAccountScopeCurrent(scope)) return;
        if (!saved.ok) throw new Error(`Meal save failed: ${saved.error}`);
        setRecentLog(result);
        triggerHapticSuccess();
        awardPoints(2, '🥗 Quick Nutrition Log', 'lifestyle', 'quick_diet_' + saved.observation.id);
        if (saved.sync === 'queue_failed') setSaveError('Saved on this device, but cloud sync could not be queued. Keep this device until sync is repaired.');
        try {
          recordHealthMemory({
            kind: 'diet', source: 'ambient_tracking',
            title: `Nutrition Log: ${entry.name.slice(0, 50)}`,
            occurredAt: now.toISOString(), payload: { observationId: saved.observation.id, total: result.total },
          });
        } catch (memoryError) {
          console.warn('Meal saved; optional memory summary was unavailable', memoryError);
        }
        setInput('');
      } else {
        setSaveError('No food items were recognized. Add more detail and try again.');
      }
    } catch (err) {
      if (!isAccountScopeCurrent(scope)) return;
      console.error('Failed to analyze or save food', err);
      setSaveError('The meal was not confirmed as saved. Please try again.');
    } finally {
      if (isAccountScopeCurrent(scope)) setIsAnalyzing(false);
    }
  };

  return (
    <div className="w-full min-h-screen bg-[#020617] flex flex-col p-6 overflow-hidden relative">
      {/* Dynamic Background Blur Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-emerald-500/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-blue-500/20 rounded-full blur-[120px] pointer-events-none" />
      
      {/* Header */}
      <div className="flex items-center gap-4 mb-12 relative z-10 pt-12">
        <button 
          onClick={() => {
            triggerHapticLight();
            safeNavigateBack(navigate, '/app/dietician');
          }} 
          className="p-3 bg-white/5 rounded-full border border-white/10 text-white cursor-pointer"
          aria-label="Go back"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-white text-2xl font-semibold tracking-tight">Nutrition</h1>
      </div>

      {/* Main Input Area */}
      <div className="flex-1 flex flex-col justify-center relative z-10 mb-20">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h2 className="text-white/40 font-medium text-lg mb-2 uppercase tracking-widest">Quick Meal Log</h2>
          <p className="text-white text-4xl font-black tracking-tight leading-tight">
            What did you eat?
          </p>
        </motion.div>

        {/* 1-Tap Rapid Meal Building Chips */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2 px-2">
            <span className="text-white/40 text-xs font-bold uppercase tracking-wider">1-Tap Meal Starters</span>
            <span className="text-emerald-400 text-xs font-semibold">Instant auto-append</span>
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            {RAPID_MEAL_BUILDERS.map((meal, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleAppendQuickMeal(meal)}
                className="whitespace-nowrap px-4 py-2 rounded-full bg-white/10 hover:bg-white/15 border border-white/15 text-white text-sm font-medium transition-all active:scale-95 flex items-center gap-1.5 shadow-sm"
              >
                <span>{meal}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="relative">
          <textarea 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="e.g. 2 scrambled eggs and an avocado..."
            aria-label="Describe what you ate"
            className="w-full bg-white/5 border border-white/10 rounded-[32px] p-8 text-white text-xl placeholder-white/20 outline-none resize-none min-h-[160px]"
            style={{
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)'
            }}
          />
          <button 
            type="button"
            onClick={handleLog}
            disabled={isAnalyzing || !input.trim()}
            aria-label="Submit meal description for AI nutritional analysis"
            className="absolute bottom-6 right-6 p-4 rounded-full bg-emerald-500 text-slate-900 disabled:opacity-50 disabled:bg-white/10 disabled:text-white/50 transition-colors shadow-[0_0_20px_rgba(16,185,129,0.3)]"
          >
            {isAnalyzing ? <div className="w-6 h-6 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" /> : <Send size={24} />}
          </button>
        </div>
        {saveError && <p role="alert" className="mt-3 text-sm text-rose-300">{saveError}</p>}

        {/* Results Card */}
        {recentLog && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mt-8 p-6 rounded-[24px] border border-white/10 bg-white/5"
            style={{ backdropFilter: 'blur(24px)' }}
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-emerald-500/20 rounded-xl text-emerald-400">
                <Sparkles size={20} />
              </div>
              <h3 className="text-white font-semibold">Meal saved locally. Nutrient estimates need portion and ingredient review.</h3>
            </div>
            
            <div className="grid grid-cols-4 gap-4">
              <div className="flex flex-col items-center p-4 rounded-2xl bg-black/20 border border-white/5">
                <span className="text-white/50 text-xs font-bold uppercase tracking-wider mb-2">Protein</span>
                <span className="text-emerald-400 text-2xl font-black">{displayNutrient(recentLog.total?.protein, 'g')}</span>
              </div>
              <div className="flex flex-col items-center p-4 rounded-2xl bg-black/20 border border-white/5">
                <span className="text-white/50 text-xs font-bold uppercase tracking-wider mb-2">Carbs</span>
                <span className="text-blue-400 text-2xl font-black">{displayNutrient(recentLog.total?.carbs, 'g')}</span>
              </div>
              <div className="flex flex-col items-center p-4 rounded-2xl bg-black/20 border border-white/5">
                <span className="text-white/50 text-xs font-bold uppercase tracking-wider mb-2">Fats</span>
                <span className="text-amber-400 text-2xl font-black">{displayNutrient(recentLog.total?.fat, 'g')}</span>
              </div>
              <div className="flex flex-col items-center p-4 rounded-2xl bg-black/20 border border-white/5">
                <span className="text-white/50 text-xs font-bold uppercase tracking-wider mb-2">Cals</span>
                <span className="text-white text-2xl font-black">{displayNutrient(recentLog.total?.calories)}</span>
              </div>
            </div>
            <div className="text-white/40 text-xs mt-3 text-center">
              Nutrient values are estimated based on standard portions. Cooking fats, brand differences, and preparation vary.
            </div>

            <div style={{ marginTop: '20px', display: 'flex', gap: '12px' }}>
              <button
                type="button"
                onClick={() => navigate('/app/dietician')}
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  borderRadius: '16px',
                  background: '#10B981',
                  color: '#020617',
                  fontWeight: 700,
                  fontSize: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                View in Diet Tracker <ArrowRight size={16} />
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};
