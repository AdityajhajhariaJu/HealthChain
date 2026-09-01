import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, X, Zap, ArrowRight, Scan, AlertTriangle } from 'lucide-react';
import { getProfile } from '../../services/ProfileEngine';
import { analyzeFoodImage } from '../../services/geminiService';
import { triggerHapticLight, triggerHapticSuccess, triggerHapticWarning } from '../../services/haptics';

export const ARGroceryLens = ({ onClose, onLogFood }: { onClose: () => void, onLogFood?: (food: any) => void }) => {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const profile = getProfile();
  const [analysis, setAnalysis] = useState<any>(null);

  const targetCalories = profile?.targetCalories || 2000;
  const targetProtein = Math.round((targetCalories * 0.3) / 4);
  const targetCarbs = Math.round((targetCalories * 0.4) / 4);
  const targetFats = Math.round((targetCalories * 0.3) / 9);
  const targetSugar = 36;


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

  const handleScan = async () => {
    if (!videoRef.current) return;
    
    triggerHapticLight();
    setIsScanning(true);
    
    try {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        const base64 = canvas.toDataURL('image/jpeg', 0.8);
        
        const result = await analyzeFoodImage(base64, profile);
        setAnalysis(result);
        
        if (result.warning) {
          triggerHapticWarning();
        } else {
          triggerHapticSuccess();
        }
        setShowResults(true);
      }
    } catch (e) {
      console.error(e);
      // Fallback or handle error
    } finally {
      setIsScanning(false);
    }
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
              display: 'flex', flexDirection: 'column', gap: '12px',
              maxHeight: 'calc(100vh - 140px)', overflowY: 'auto',
              paddingBottom: '20px', scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch'
            }}
          >
            {/* The AI Result Card */}
            <div style={{
              background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(20px)', borderRadius: '24px', padding: '20px',
              boxShadow: '0 24px 48px rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.5)'
            }}>
              {analysis?.warning && (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', background: '#FEF2F2', padding: '12px', borderRadius: '12px', width: '100%', marginBottom: '16px', boxSizing: 'border-box' }}>
                  <AlertTriangle size={14} color="#EF4444" />
                  <span style={{ color: '#EF4444', fontSize: '12px', fontWeight: 800, letterSpacing: '0.5px', textTransform: 'uppercase' }}>{analysis.warning}</span>
                </div>
              )}
              
              <h3 style={{ margin: '0 0 4px', fontSize: '18px', fontWeight: 800, color: '#0F172A' }}>{analysis?.foodName || 'Unknown Food'}</h3>
              <p style={{ margin: '0 0 16px', fontSize: '13px', color: '#64748B' }}>Analyzed against your profile ({analysis?.servingSize}).</p>
              
              
              {/* Glycemic Spike Graph */}
              {analysis?.sugar !== undefined && (
                <div style={{ marginBottom: '16px', padding: '16px', background: '#F8FAFC', borderRadius: '16px', border: '1px solid #E2E8F0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 800, color: '#64748B', letterSpacing: '0.5px' }}>GLYCEMIC RESPONSE</span>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: analysis.sugar > 20 ? '#EF4444' : '#10B981' }}>
                      {analysis.sugar > 20 ? 'High Spike' : 'Stable'}
                    </span>
                  </div>
                  <div style={{ height: '60px', width: '100%', position: 'relative' }}>
                    <svg viewBox="0 0 100 40" preserveAspectRatio="none" style={{ width: '100%', height: '100%' }}>
                      <path 
                        d={analysis.sugar > 20 ? "M0,35 Q30,35 45,5 T55,5 Q70,35 100,35" : "M0,35 Q50,30 100,35"} 
                        fill="none" 
                        stroke={analysis.sugar > 20 ? "url(#spikeGradient)" : "url(#stableGradient)"} 
                        strokeWidth="3" 
                        strokeLinecap="round" 
                      />
                      <defs>
                        <linearGradient id="spikeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#EF4444" stopOpacity="0.2" />
                          <stop offset="50%" stopColor="#EF4444" stopOpacity="1" />
                          <stop offset="100%" stopColor="#EF4444" stopOpacity="0.2" />
                        </linearGradient>
                        <linearGradient id="stableGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#10B981" stopOpacity="0.2" />
                          <stop offset="50%" stopColor="#10B981" stopOpacity="1" />
                          <stop offset="100%" stopColor="#10B981" stopOpacity="0.2" />
                        </linearGradient>
                      </defs>
                    </svg>
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748B', marginTop: '8px', textAlign: 'center' }}>
                    Sugar Content: {analysis.sugar}g / serving
                  </div>
                </div>
              )}
              
              {/* Macro Grid */}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <div style={{ background: '#F8FAFC', padding: '12px', borderRadius: '12px' }}>
                  <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 600 }}>Calories</div>
                  <div style={{ fontSize: '16px', color: '#0F172A', fontWeight: 800 }}>{analysis?.calories} kcal</div>
                </div>
                <div style={{ background: '#F8FAFC', padding: '12px', borderRadius: '12px' }}>
                  <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 600 }}>Protein</div>
                  <div style={{ fontSize: '16px', color: '#0F172A', fontWeight: 800 }}>{analysis?.protein}g</div>
                </div>
                <div style={{ background: '#F8FAFC', padding: '12px', borderRadius: '12px' }}>
                  <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 600 }}>Carbs (Sugar: {analysis?.sugar}g)</div>
                  <div style={{ fontSize: '16px', color: '#0F172A', fontWeight: 800 }}>{analysis?.carbs}g</div>
                </div>
                <div style={{ background: '#F8FAFC', padding: '12px', borderRadius: '12px' }}>
                  <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 600 }}>Fats</div>
                  <div style={{ fontSize: '16px', color: '#0F172A', fontWeight: 800 }}>{analysis?.fats}g</div>
                </div>
              </div>
            </div>

            {/* Better Alternative Card */}
            {analysis?.betterAlternative && (
              <div style={{
                background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(20px)', borderRadius: '20px', padding: '16px',
                display: 'flex', alignItems: 'center', gap: '16px', border: '1px solid #E2E8F0', boxShadow: '0 12px 24px rgba(0,0,0,0.1)'
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '11px', fontWeight: 800, color: '#10B981', letterSpacing: '0.5px', marginBottom: '4px' }}>BETTER ALTERNATIVE</div>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A' }}>{analysis.betterAlternative.name}</div>
                  <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>{analysis.betterAlternative.reason}</div>
                </div>
                <div style={{ width: '32px', height: '32px', borderRadius: '16px', background: '#F1F5F9', display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#0F172A' }}>
                  <ArrowRight size={16} />
                </div>
              </div>
            )}

            {/* Log Food Button */}
            {onLogFood && analysis?.foodName && (
              <button 
                onClick={() => {
                  onLogFood({
                    name: analysis.foodName,
                    calories: analysis.calories,
                    protein: analysis.protein,
                    carbs: analysis.carbs,
                    fat: analysis.fats,
                    sugar: analysis.sugar,
                    fibre: analysis.fibre,
                    type: 'Snack' // Default type, user can change later or we just append it
                  });
                }}
                style={{
                  background: '#10B981', color: '#FFF', border: 'none', padding: '16px', borderRadius: '16px', 
                  fontSize: '16px', fontWeight: 800, cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px',
                  boxShadow: '0 8px 16px rgba(16, 185, 129, 0.2)'
                }}>
                <Scan size={18} />
                Log {analysis.foodName}
              </button>
            )}
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
