import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { triggerHapticLight } from '../../services/haptics';

interface BottomSheetOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  bgImage?: string;
}

export function BottomSheetOverlay({ isOpen, onClose, children, bgImage }: BottomSheetOverlayProps) {
  
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => {
              triggerHapticLight();
              onClose();
            }}
            className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm"
          />

          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-x-0 bottom-0 z-[61] h-[92vh] flex flex-col bg-[#0F0F11] rounded-t-[32px] overflow-hidden shadow-2xl border-t border-white/10"
          >
            <div 
              className="absolute top-0 left-0 right-0 h-12 flex justify-center items-center z-10 cursor-pointer"
              onClick={onClose}
            >
              <div className="w-12 h-1.5 bg-white/20 rounded-full mt-2" />
            </div>

            <button 
              onClick={() => {
                triggerHapticLight();
                onClose();
              }}
              className="absolute top-4 right-4 z-20 bg-black/40 backdrop-blur-md p-2 rounded-full text-white/80 hover:text-white"
            >
              <X size={20} />
            </button>

            {bgImage && (
              <div 
                className="relative h-64 w-full flex-shrink-0"
                style={{
                  backgroundImage: `url(${bgImage})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }}
              >
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/20 to-[#0F0F11]" />
              </div>
            )}

            <div className="flex-1 overflow-y-auto px-6 py-6 pb-24 text-white relative">
               {!bgImage && <div className="mt-8" />}
               {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}