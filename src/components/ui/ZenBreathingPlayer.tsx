import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Pause, Play } from 'lucide-react';
import { triggerHapticLight } from '../../services/haptics';

interface ZenBreathingPlayerProps {
  isOpen: boolean;
  onClose: () => void;
  bgImage?: string;
}

export function ZenBreathingPlayer({ isOpen, onClose, bgImage = 'https://images.unsplash.com/photo-1518085250985-78e7bbdf6a62?auto=format&fit=crop&q=80' }: ZenBreathingPlayerProps) {
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [phase, setPhase] = useState<'Inhale' | 'Hold' | 'Exhale'>('Inhale');
  
  useEffect(() => {
    if (!isPlaying) return;
    
    let currentPhase = 'Inhale';
    const interval = setInterval(() => {
      triggerHapticLight();
      if (currentPhase === 'Inhale') { currentPhase = 'Hold'; }
      else if (currentPhase === 'Hold') { currentPhase = 'Exhale'; }
      else { currentPhase = 'Inhale'; }
      
      setPhase(currentPhase as any);
    }, 4000); 
    
    return () => clearInterval(interval);
  }, [isPlaying]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex flex-col justify-between items-center text-white font-sans bg-black"
        style={{
          backgroundImage: `url(${bgImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />

        <div className="w-full flex justify-between items-center p-6 z-10 pt-12">
          <button onClick={onClose} className="p-2 bg-white/10 backdrop-blur-md rounded-full hover:bg-white/20 transition-colors">
            <X size={24} color="white" />
          </button>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center z-10 relative w-full">
            <motion.div 
                className="absolute w-64 h-64 border-[1px] border-white/20 rounded-full"
                animate={{ scale: isPlaying ? (phase === 'Inhale' ? 1.5 : phase === 'Exhale' ? 1 : 1.5) : 1 }}
                transition={{ duration: 4, ease: "easeInOut" }}
            />
            <motion.div 
                className="absolute w-48 h-48 border-[1px] border-white/30 rounded-full"
                animate={{ scale: isPlaying ? (phase === 'Inhale' ? 1.4 : phase === 'Exhale' ? 1 : 1.4) : 1 }}
                transition={{ duration: 4, ease: "easeInOut", delay: 0.1 }}
            />
            <motion.div 
                className="absolute w-32 h-32 border-[1px] border-white/50 rounded-full flex items-center justify-center bg-white/5 backdrop-blur-sm"
                animate={{ scale: isPlaying ? (phase === 'Inhale' ? 1.2 : phase === 'Exhale' ? 1 : 1.2) : 1 }}
                transition={{ duration: 4, ease: "easeInOut", delay: 0.2 }}
            >
                <span className="text-xl font-light tracking-widest uppercase">{isPlaying ? phase : 'Ready'}</span>
            </motion.div>
        </div>

        <div className="w-full p-8 z-10 flex flex-col items-center gap-8 mb-8">
            <button 
                onClick={() => {
                    triggerHapticLight();
                    setIsPlaying(!isPlaying);
                }}
                className="w-20 h-20 bg-white/20 backdrop-blur-xl rounded-full flex justify-center items-center hover:bg-white/30 transition-all border border-white/30 shadow-[0_0_40px_rgba(255,255,255,0.1)]"
            >
                {isPlaying ? <Pause size={32} fill="white" /> : <Play size={32} fill="white" className="ml-2" />}
            </button>
            <div className="w-full flex justify-between text-white/50 text-sm font-medium px-4">
                <span>00:00</span>
                <span>10:00</span>
            </div>
            <div className="w-full h-1 bg-white/20 rounded-full overflow-hidden px-4">
                <div className="h-full bg-white w-0" />
            </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}