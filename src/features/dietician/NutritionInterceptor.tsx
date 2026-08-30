import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, ArrowLeft, Send } from 'lucide-react';
import { analyzeFoodEntry } from '../../services/geminiService';
import { awardPoints } from '../../services/VitalityPointsEngine';
import { triggerHapticLight, triggerHapticSuccess } from '../../services/haptics';
import { useNavigate } from 'react-router-dom';

export const NutritionInterceptor: React.FC = () => {
  const navigate = useNavigate();
  const [input, setInput] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [recentLog, setRecentLog] = useState<any>(null);

  const handleLog = async () => {
    if (!input.trim()) return;
    triggerHapticLight();
    setIsAnalyzing(true);
    
    try {
      const result = await analyzeFoodEntry(input);
      if (result && result.items) {
        setRecentLog(result);
        triggerHapticSuccess();
        awardPoints(2, 'dY?? Quick Nutrition Log', 'lifestyle', 'quick_diet_' + Date.now());
        setInput('');
      }
    } catch (err) {
      console.error('Failed to analyze food', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="w-full min-h-screen bg-[#020617] flex flex-col p-6 overflow-hidden relative">
      {/* Dynamic Background Blur Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-emerald-500/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-blue-500/20 rounded-full blur-[120px] pointer-events-none" />
      
      {/* Header */}
      <div className="flex items-center gap-4 mb-12 relative z-10 pt-12">
        <button onClick={() => navigate(-1)} className="p-3 bg-white/5 rounded-full border border-white/10 text-white">
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
          <h2 className="text-white/40 font-medium text-lg mb-2 uppercase tracking-widest">Ambient Tracking</h2>
          <p className="text-white text-4xl font-black tracking-tight leading-tight">
            What did you eat?
          </p>
        </motion.div>

        <div className="relative">
          <textarea 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="e.g. 2 scrambled eggs and an avocado..."
            className="w-full bg-white/5 border border-white/10 rounded-[32px] p-8 text-white text-xl placeholder-white/20 outline-none resize-none min-h-[160px]"
            style={{
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)'
            }}
          />
          <button 
            onClick={handleLog}
            disabled={isAnalyzing || !input.trim()}
            className="absolute bottom-6 right-6 p-4 rounded-full bg-emerald-500 text-slate-900 disabled:opacity-50 disabled:bg-white/10 disabled:text-white/50 transition-colors shadow-[0_0_20px_rgba(16,185,129,0.3)]"
          >
            {isAnalyzing ? <div className="w-6 h-6 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" /> : <Send size={24} />}
          </button>
        </div>

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
              <h3 className="text-white font-semibold">{recentLog.clinical_insight || 'Logged successfully.'}</h3>
            </div>
            
            <div className="grid grid-cols-4 gap-4">
              <div className="flex flex-col items-center p-4 rounded-2xl bg-black/20 border border-white/5">
                <span className="text-white/50 text-xs font-bold uppercase tracking-wider mb-2">Protein</span>
                <span className="text-emerald-400 text-2xl font-black">{recentLog.total?.protein || 0}g</span>
              </div>
              <div className="flex flex-col items-center p-4 rounded-2xl bg-black/20 border border-white/5">
                <span className="text-white/50 text-xs font-bold uppercase tracking-wider mb-2">Carbs</span>
                <span className="text-blue-400 text-2xl font-black">{recentLog.total?.carbs || 0}g</span>
              </div>
              <div className="flex flex-col items-center p-4 rounded-2xl bg-black/20 border border-white/5">
                <span className="text-white/50 text-xs font-bold uppercase tracking-wider mb-2">Fats</span>
                <span className="text-amber-400 text-2xl font-black">{recentLog.total?.fat || 0}g</span>
              </div>
              <div className="flex flex-col items-center p-4 rounded-2xl bg-black/20 border border-white/5">
                <span className="text-white/50 text-xs font-bold uppercase tracking-wider mb-2">Cals</span>
                <span className="text-white text-2xl font-black">{recentLog.total?.calories || 0}</span>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};