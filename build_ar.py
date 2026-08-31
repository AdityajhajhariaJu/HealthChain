# -*- coding: utf-8 -*-
import sys
import os

os.makedirs('src/components/ui', exist_ok=True)

# 1. Create ARGroceryLens.tsx
ar_lens_code = '''import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, X, Zap, ArrowRight, Scan, AlertTriangle } from 'lucide-react';
import { getProfile } from '../../services/ProfileEngine';
import { triggerHapticLight, triggerHapticSuccess, triggerHapticWarning } from '../../services/haptics';

export const ARGroceryLens = ({ onClose }: { onClose: () => void }) => {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const profile = getProfile();

  useEffect(() => {
    // Start camera
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      .then((s) => {
        setStream(s);
        if (videoRef.current) {
          videoRef.current.srcObject = s;
        }
      })
      .catch(err => {
        console.error("Camera access denied or unavailable", err);
      });

    return () => {
      if (stream) {
        stream.getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  const handleScan = () => {
    triggerHapticLight();
    setIsScanning(true);
    
    // Simulate AI vision analysis delay
    setTimeout(() => {
      triggerHapticWarning();
      setIsScanning(false);
      setShowResults(true);
    }, 2500);
  };

  const handleClose = () => {
    if (stream) {
      stream.getTracks().forEach(t => t.stop());
    }
    onClose();
  };

  const dailySugarLimit = 36; // grams (AHA recommendation for men, roughly)
  const scannedSugar = 28; // Example for Sugar Loops
  const sugarPercentage = Math.min((scannedSugar / dailySugarLimit) * 100, 100);

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: '#000', zIndex: 9999, display: 'flex', flexDirection: 'column'
    }}>
      {/* Live Camera Feed */}
      <video 
        ref={videoRef}
        autoPlay 
        playsInline 
        muted 
        style={{
          position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 0
        }} 
      />

      {/* Header */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, padding: '24px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 10,
        background: 'linear-gradient(180deg, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0) 100%)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ background: '#10B981', width: '8px', height: '8px', borderRadius: '50%', boxShadow: '0 0 8px #10B981' }} />
          <span style={{ color: '#FFF', fontWeight: 600, fontSize: '14px', letterSpacing: '0.5px' }}>HEALTHCHAIN LENS</span>
        </div>
        <button 
          onClick={handleClose}
          style={{ width: '40px', height: '40px', borderRadius: '20px', background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(10px)', border: 'none', color: '#FFF', display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer' }}
        >
          <X size={20} />
        </button>
      </div>

      {/* Scanning Animation */}
      {isScanning && (
        <motion.div
          initial={{ top: '20%' }}
          animate={{ top: '80%' }}
          transition={{ duration: 1.5, repeat: Infinity, repeatType: 'reverse', ease: 'linear' }}
          style={{
            position: 'absolute', left: '10%', right: '10%', height: '2px', background: '#10B981',
            boxShadow: '0 0 20px 4px rgba(16, 185, 129, 0.5)', zIndex: 5
          }}
        />
      )}

      {/* Results Overlay */}
      <AnimatePresence>
        {showResults && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.95 }}
            style={{
              position: 'absolute', bottom: '40px', left: '20px', right: '20px', zIndex: 20,
              display: 'flex', flexDirection: 'column', gap: '12px'
            }}
          >
            {/* The Warning Card */}
            <div style={{
              background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(20px)', borderRadius: '24px', padding: '20px',
              boxShadow: '0 24px 48px rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.5)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#FEF2F2', padding: '6px 12px', borderRadius: '8px', width: 'fit-content', marginBottom: '16px' }}>
                <AlertTriangle size={14} color="#EF4444" />
                <span style={{ color: '#EF4444', fontSize: '12px', fontWeight: 800, letterSpacing: '0.5px' }}>HIGH GLYCEMIC SPIKE</span>
              </div>
              
              <h3 style={{ margin: '0 0 4px', fontSize: '18px', fontWeight: 800, color: '#0F172A' }}>Sugar Loops Cereal</h3>
              <p style={{ margin: '0 0 16px', fontSize: '13px', color: '#64748B' }}>Analyzed against your pre-diabetic profile.</p>
              
              {/* Comparative Chart */}
              <div style={{ marginBottom: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 600, color: '#0F172A', marginBottom: '6px' }}>
                  <span>Sugar per serving ({scannedSugar}g)</span>
                  <span style={{ color: '#EF4444' }}>{Math.round(sugarPercentage)}% of daily max</span>
                </div>
                <div style={{ height: '8px', background: '#F1F5F9', borderRadius: '4px', overflow: 'hidden' }}>
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: ${sugarPercentage}% }}
                    transition={{ duration: 1, delay: 0.2, type: 'spring' }}
                    style={{ height: '100%', background: '#EF4444', borderRadius: '4px' }}
                  />
                </div>
              </div>
            </div>

            {/* Better Alternative Card */}
            <div style={{
              background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(20px)', borderRadius: '20px', padding: '16px',
              display: 'flex', alignItems: 'center', gap: '16px', border: '1px solid #E2E8F0', boxShadow: '0 12px 24px rgba(0,0,0,0.1)'
            }}>
              <div style={{ width: '48px', height: '64px', background: '#F1F5F9', borderRadius: '8px', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '24px' }}>
                🥣
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '11px', fontWeight: 800, color: '#10B981', letterSpacing: '0.5px', marginBottom: '4px' }}>BETTER ALTERNATIVE</div>
                <div style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A' }}>Oat & Seed Fuel</div>
                <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>+20g Protein. 3g Sugar. Aisle 4.</div>
              </div>
              <div style={{ width: '32px', height: '32px', borderRadius: '16px', background: '#F1F5F9', display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#0F172A' }}>
                <ArrowRight size={16} />
              </div>
            </div>

          </motion.div>
        )}
      </AnimatePresence>

      {/* Capture Button */}
      {!showResults && (
        <div style={{ position: 'absolute', bottom: '40px', left: 0, right: 0, display: 'flex', justifyContent: 'center', zIndex: 10 }}>
          <button 
            onClick={handleScan}
            disabled={isScanning}
            style={{
              width: '72px', height: '72px', borderRadius: '36px',
              background: isScanning ? 'rgba(255,255,255,0.5)' : '#FFF',
              border: '6px solid rgba(255,255,255,0.3)',
              backgroundClip: 'padding-box',
              display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer',
              transition: 'all 0.2s', transform: isScanning ? 'scale(0.95)' : 'scale(1)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.2)'
            }}
          >
            {!isScanning && <Scan size={28} color="#0F172A" />}
          </button>
        </div>
      )}
    </div>
  );
};
'''

with open('src/components/ui/ARGroceryLens.tsx', 'w', encoding='utf-8') as f:
    f.write(ar_lens_code)

# 2. Modify Dietician.tsx
with open('src/features/dietician/Dietician.tsx', 'r', encoding='utf-8') as f:
    dietician_content = f.read()

# Add imports
if "import { ARGroceryLens }" not in dietician_content:
    dietician_content = dietician_content.replace("import React,", "import React,\nimport { Scan } from 'lucide-react';\nimport { ARGroceryLens } from '../../components/ui/ARGroceryLens';")
    # if lucide-react import already exists, we might have duplicate Scan, but it's okay for now. Let's fix that carefully.

# Better way to add imports
import re
if "ARGroceryLens" not in dietician_content:
    dietician_content = dietician_content.replace("import { motion, AnimatePresence } from 'framer-motion';", "import { motion, AnimatePresence } from 'framer-motion';\nimport { ARGroceryLens } from '../../components/ui/ARGroceryLens';\nimport { Scan } from 'lucide-react';")

# Add state
if "showARLens" not in dietician_content:
    dietician_content = dietician_content.replace("const [isLogModalOpen, setIsLogModalOpen] = useState(false);", "const [isLogModalOpen, setIsLogModalOpen] = useState(false);\n  const [showARLens, setShowARLens] = useState(false);")

# Add the FAB and Component
fab_code = '''
      {/* AR Lens FAB */}
      <button
        onClick={() => { triggerHapticLight(); setShowARLens(true); }}
        style={{
          position: 'fixed',
          bottom: '100px', // Above bottom nav
          right: '24px',
          width: '56px',
          height: '56px',
          borderRadius: '28px',
          background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
          boxShadow: '0 12px 24px rgba(16, 185, 129, 0.4)',
          border: 'none',
          color: '#FFF',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          cursor: 'pointer',
          zIndex: 900,
          transition: 'transform 0.2s'
        }}
      >
        <Scan size={24} />
      </button>

      {showARLens && <ARGroceryLens onClose={() => setShowARLens(false)} />}
'''

# insert before the final closing div
dietician_content = re.sub(r'(      </AnimatePresence>\n    </div>\n  );\n})', fab_code + r'\1', dietician_content)

with open('src/features/dietician/Dietician.tsx', 'w', encoding='utf-8') as f:
    f.write(dietician_content)

print('Done')
