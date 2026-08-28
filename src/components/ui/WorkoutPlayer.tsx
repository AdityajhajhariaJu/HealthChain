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
        className="fixed inset-0 z-[100] bg-white flex flex-col font-sans"
      >
        <div className="relative flex-1 bg-[#F2F2F7] flex items-center justify-center overflow-hidden">
            <div 
                className="absolute inset-0 blur-3xl opacity-30" 
                style={{ backgroundImage: `url(${workout.coverImage})`, backgroundSize: 'cover' }}
            />
            <button onClick={onClose} className="absolute top-12 left-6 z-20 p-2 bg-black/10 backdrop-blur-md rounded-full">
                <ChevronLeft size={24} color="black" />
            </button>
            
            <img 
                src="https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&q=80" 
                alt="Exercise"
                className="relative z-10 h-full w-full object-cover mix-blend-multiply opacity-90"
            />
            
            <div className="absolute bottom-0 left-0 right-0 h-12 bg-black/60 backdrop-blur-md flex items-center px-6 justify-between z-20">
                <span className="text-white font-medium">Workout Preview</span>
                <button className="text-white/80 hover:text-white text-sm" onClick={onClose}>Skip</button>
            </div>
        </div>

        <div className="h-[40vh] bg-white flex flex-col items-center py-8 px-6 relative z-30">
            <h2 className="text-2xl font-bold text-black mb-1">{step?.title || workout.title}</h2>
            <p className="text-gray-500 font-medium mb-auto">
                {step?.reps ? `${step.reps} Reps` : `${step?.duration || 30} Seconds`} • {step?.sets || 1} Sets
            </p>

            <button className="text-[#007AFF] font-semibold text-sm mb-8 tracking-wide">
                INSTRUCTIONS
            </button>

            <div className="w-full flex justify-between items-center px-4 pb-8">
                <button 
                    className="text-black font-semibold text-sm flex flex-col items-center opacity-50 hover:opacity-100 transition-opacity"
                    onClick={() => { triggerHapticLight(); setCurrentStep(Math.max(0, currentStep - 1)); }}
                >
                    PREV
                </button>
                <button 
                    onClick={() => {
                        triggerHapticLight();
                        setIsPlaying(!isPlaying);
                    }}
                    className="w-16 h-16 bg-[#1C1C1E] rounded-full flex justify-center items-center hover:scale-105 transition-transform shadow-xl"
                >
                    {isPlaying ? <Pause size={28} fill="white" color="white" /> : <Play size={28} fill="white" color="white" className="ml-1" />}
                </button>
                <button 
                    className="text-black font-semibold text-sm flex flex-col items-center hover:opacity-70 transition-opacity"
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