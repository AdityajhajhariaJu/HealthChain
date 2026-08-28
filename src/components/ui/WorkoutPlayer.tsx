import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Pause, Play } from 'lucide-react';
import { triggerHapticLight, triggerHapticMedium } from '../../services/haptics';
import { Workout } from '../../services/ContentLibraryEngine';

interface WorkoutPlayerProps {
  isOpen: boolean;
  onClose: () => void;
  workout: Workout;
}

export function WorkoutPlayer({ isOpen, onClose, workout }: WorkoutPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentStep, setCurrentStep] = useState(0);

  if (!isOpen) return null;

  const step = workout.steps[currentStep];

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 100,
          backgroundColor: 'white',
          display: 'flex',
          flexDirection: 'column',
          fontFamily: 'sans-serif'
        }}
      >
        <div style={{ position: 'relative', flex: 1, backgroundColor: '#F2F2F7', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
            <div 
                style={{
                  position: 'absolute',
                  inset: 0,
                  filter: 'blur(64px)',
                  opacity: 0.3,
                  backgroundImage: `url(${workout.coverImage})`,
                  backgroundSize: 'cover'
                }}
            />
            <button 
              onClick={onClose} 
              style={{ position: 'absolute', top: '48px', left: '24px', zIndex: 20, padding: '8px', backgroundColor: 'rgba(0,0,0,0.1)', backdropFilter: 'blur(12px)', borderRadius: '9999px', border: 'none', cursor: 'pointer' }}
            >
                <ChevronLeft size={24} color="black" />
            </button>
            
            <img 
                src="https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&q=80" 
                alt="Exercise"
                style={{ position: 'relative', zIndex: 10, height: '100%', width: '100%', objectFit: 'cover', mixBlendMode: 'multiply', opacity: 0.9 }}
            />
            
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '48px', backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', padding: '0 24px', justifyContent: 'space-between', zIndex: 20 }}>
                <span style={{ color: 'white', fontWeight: 500 }}>Workout Preview</span>
                <button onClick={onClose} style={{ color: 'rgba(255,255,255,0.8)', fontSize: '14px', background: 'none', border: 'none', cursor: 'pointer' }}>Skip</button>
            </div>
        </div>

        <div style={{ height: '40vh', backgroundColor: 'white', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '32px 24px', position: 'relative', zIndex: 30 }}>
            <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: 'black', margin: '0 0 4px' }}>{step?.title || workout.title}</h2>
            <p style={{ color: '#6b7280', fontWeight: 500, marginBottom: 'auto' }}>
                {step?.reps ? `${step.reps} Reps` : `${step?.duration || 30} Seconds`} • {step?.sets || 1} Sets
            </p>

            <button style={{ color: '#007AFF', fontWeight: 600, fontSize: '14px', marginBottom: '32px', letterSpacing: '0.05em', background: 'none', border: 'none', cursor: 'pointer' }}>
                INSTRUCTIONS
            </button>

            <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 16px 32px' }}>
                <button 
                    style={{ color: 'black', fontWeight: 600, fontSize: '14px', display: 'flex', flexDirection: 'column', alignItems: 'center', opacity: 0.5, background: 'none', border: 'none', cursor: 'pointer' }}
                    onClick={() => { triggerHapticLight(); setCurrentStep(Math.max(0, currentStep - 1)); }}
                >
                    PREV
                </button>
                <button 
                    onClick={() => {
                        triggerHapticLight();
                        setIsPlaying(!isPlaying);
                    }}
                    style={{ width: '64px', height: '64px', backgroundColor: '#1C1C1E', borderRadius: '9999px', display: 'flex', justifyContent: 'center', alignItems: 'center', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)', border: 'none', cursor: 'pointer' }}
                >
                    {isPlaying ? <Pause size={28} fill="white" color="white" /> : <Play size={28} fill="white" color="white" style={{ marginLeft: '4px' }} />}
                </button>
                <button 
                    style={{ color: 'black', fontWeight: 600, fontSize: '14px', display: 'flex', flexDirection: 'column', alignItems: 'center', opacity: 0.7, background: 'none', border: 'none', cursor: 'pointer' }}
                    onClick={() => { 
                        triggerHapticMedium(); 
                        if (currentStep < workout.steps.length - 1) setCurrentStep(currentStep + 1); 
                        else onClose(); 
                    }}
                >
                    NEXT
                </button>
            </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}