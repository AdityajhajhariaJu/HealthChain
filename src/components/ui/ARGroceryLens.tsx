import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, X, Zap, ArrowRight, Scan, AlertTriangle, Image as ImageIcon, Upload, RefreshCw, Sparkles } from 'lucide-react';
import { getProfile } from '../../services/ProfileEngine';
import { FoodAnalysisResult, analyzeFoodImage } from '../../services/geminiService';
import { triggerHapticLight, triggerHapticSuccess, triggerHapticWarning } from '../../services/haptics';
import { awardPoints } from '../../services/VitalityPointsEngine';

function checkCanvasBrightness(canvas: HTMLCanvasElement): number {
  try {
    const sample = document.createElement('canvas');
    sample.width = 32;
    sample.height = 32;
    const sCtx = sample.getContext('2d');
    if (!sCtx) return 100;
    sCtx.drawImage(canvas, 0, 0, 32, 32);
    const imgData = sCtx.getImageData(0, 0, 32, 32);
    const data = imgData.data;
    let total = 0;
    for (let i = 0; i < data.length; i += 4) {
      total += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    }
    return total / (32 * 32);
  } catch {
    return 100;
  }
}

function compressCanvas(imgSource: CanvasImageSource, origWidth: number, origHeight: number, maxDim = 1024): { base64: string; canvas: HTMLCanvasElement } {
  let width = origWidth || 1024;
  let height = origHeight || 1024;
  if (width > maxDim || height > maxDim) {
    if (width > height) {
      height = Math.round((height * maxDim) / width);
      width = maxDim;
    } else {
      width = Math.round((width * maxDim) / height);
      height = maxDim;
    }
  }
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(width, 1);
  canvas.height = Math.max(height, 1);
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.drawImage(imgSource, 0, 0, width, height);
  }
  return {
    base64: canvas.toDataURL('image/jpeg', 0.82),
    canvas
  };
}

export const ARGroceryLens = ({ onClose, onLogFood }: { onClose: () => void, onLogFood?: (food: any) => void }) => {
  const navigate = useNavigate();
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scanError, setScanError] = useState<{ title: string; message: string } | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const profile = getProfile();
  const [analysis, setAnalysis] = useState<FoodAnalysisResult | null>(null);

  const targetCalories = profile?.targetCalories || 2000;
  const targetProtein = Math.round((targetCalories * 0.3) / 4);
  const targetCarbs = Math.round((targetCalories * 0.4) / 4);
  const targetFats = Math.round((targetCalories * 0.3) / 9);
  const targetSugar = 36;

  useEffect(() => {
    let activeStream: MediaStream | null = null;

    // Start camera
    navigator.mediaDevices?.getUserMedia?.({ video: { facingMode: 'environment' } })
      .then((s) => {
        activeStream = s;
        setStream(s);
        setCameraError(null);
        if (videoRef.current) {
          videoRef.current.srcObject = s;
        }
      })
      .catch((err) => {
        console.error("Camera access denied or unavailable", err);
        setCameraError("Camera is unavailable or permission was not granted. You can upload a photo of the food or nutrition facts label instead.");
      });

    return () => {
      if (activeStream) {
        activeStream.getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsScanning(true);
    setScanError(null);
    triggerHapticLight();
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const rawData = event.target?.result as string;
        if (!rawData) return;
        
        const img = new Image();
        img.onload = async () => {
          try {
            const { base64, canvas } = compressCanvas(img, img.naturalWidth || 1024, img.naturalHeight || 1024, 1024);
            const brightness = checkCanvasBrightness(canvas);
            if (brightness < 16) {
              setScanError({
                title: 'Photo is Too Dark',
                message: 'The uploaded photo is too dark to analyze. Please upload a clear photo taken under good lighting.'
              });
              triggerHapticWarning();
              setShowResults(true);
              return;
            }

            const result = await analyzeFoodImage(base64, profile);
            if (!result.detected || !result.foodName) {
              setScanError({
                title: 'No Food Detected',
                message: result.errorMessage || 'Could not detect food or a nutrition facts panel in this photo. Please upload a clear image of your meal or package label.'
              });
              triggerHapticWarning();
              setShowResults(true);
              return;
            }

            setAnalysis(result);
            if (result.warning) {
              triggerHapticWarning();
            } else {
              triggerHapticSuccess();
            }
            awardPoints(5, 'Scanned Nutrition Facts via AR Lens', 'lifestyle');
            setShowResults(true);
          } catch (scanErr) {
            console.error('Analysis error:', scanErr);
            setScanError({
              title: 'Scan Inconclusive',
              message: 'Failed to analyze photo. Please try another angle or a clearer image.'
            });
            triggerHapticWarning();
            setShowResults(true);
          } finally {
            setIsScanning(false);
          }
        };
        img.onerror = () => {
          setIsScanning(false);
          setScanError({
            title: 'Image Load Error',
            message: 'Unable to process this image file. Please try a different photo.'
          });
          setShowResults(true);
        };
        img.src = rawData;
      } catch (err) {
        console.error('File scan error:', err);
        setIsScanning(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleScan = async () => {
    if (!videoRef.current) return;
    
    if (!videoRef.current.videoWidth || !videoRef.current.videoHeight) {
      setCameraError("Camera is still warming up. Please wait a moment and try scanning again.");
      return;
    }
    
    triggerHapticLight();
    setIsScanning(true);
    setCameraError(null);
    setScanError(null);
    
    try {
      const { base64, canvas } = compressCanvas(
        videoRef.current,
        videoRef.current.videoWidth,
        videoRef.current.videoHeight,
        1024
      );

      const brightness = checkCanvasBrightness(canvas);
      if (brightness < 16) {
        setScanError({
          title: 'Camera View is Too Dark',
          message: 'The captured frame is too dark to analyze food or labels. Please aim directly at your meal or nutrition panel in good lighting.'
        });
        triggerHapticWarning();
        setShowResults(true);
        return;
      }
      
      const result = await analyzeFoodImage(base64, profile);
      if (!result.detected || !result.foodName) {
        setScanError({
          title: 'No Food Detected',
          message: result.errorMessage || 'Could not clearly recognize a food item, meal, or nutrition facts label. Please ensure the dish is well-lit and in frame.'
        });
        triggerHapticWarning();
        setShowResults(true);
        return;
      }

      setAnalysis(result);
      if (result.warning) {
        triggerHapticWarning();
      } else {
        triggerHapticSuccess();
      }
      awardPoints(5, 'Scanned Nutrition Facts via AR Lens', 'lifestyle');
      setShowResults(true);
    } catch (e) {
      console.error(e);
      setScanError({
        title: 'Scan Inconclusive',
        message: 'Could not analyze this frame. Please try again or upload a photo from your gallery.'
      });
      triggerHapticWarning();
      setShowResults(true);
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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [stream]);

  const dailySugarLimit = 36; // grams (AHA recommendation for men, roughly)
  const scannedSugar = 28; // Example for Sugar Loops
  const sugarPercentage = Math.min((scannedSugar / dailySugarLimit) * 100, 100);

  return (
    <div 
      role="dialog"
      aria-modal="true"
      aria-label="AR Grocery Nutrition Scanner"
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: '#000', zIndex: 9999, display: 'flex', flexDirection: 'column'
      }}
    >
      {/* Live Camera Feed */}
      <video 
        ref={videoRef}
        autoPlay 
        playsInline 
        muted 
        onError={() => setCameraError("Video stream could not be loaded")}
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
          type="button"
          aria-label="Close AR Grocery Lens"
          onClick={handleClose}
          style={{ width: '40px', height: '40px', borderRadius: '20px', background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(10px)', border: 'none', color: '#FFF', display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer' }}
        >
          <X size={20} />
        </button>
      </div>

      {/* Scanning Animation */}
      {isScanning && (
        <motion.div
          initial={{ y: '20vh' }}
          animate={{ y: '80vh' }}
          transition={{ duration: 1.5, repeat: Infinity, repeatType: 'reverse', ease: 'linear' }}
          style={{
            position: 'absolute', top: 0, left: '10%', right: '10%', height: '2px', willChange: 'transform', background: '#10B981',
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
            {/* Non-Detection / Error Guidance Card */}
            {scanError ? (
              <div style={{
                background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.98) 0%, #FFF8F3 100%)',
                backdropFilter: 'blur(24px)',
                WebkitBackdropFilter: 'blur(24px)',
                borderRadius: '24px',
                padding: '24px 20px',
                boxShadow: '0 24px 48px rgba(234, 88, 12, 0.18)',
                border: '1.5px solid rgba(254, 215, 195, 0.95)',
                textAlign: 'center'
              }}>
                <div style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #FFEFE6 0%, #FED7AA 100%)',
                  border: '1.5px solid rgba(251, 146, 60, 0.35)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#EA580C',
                  margin: '0 auto 14px',
                  boxShadow: '0 4px 14px rgba(251, 146, 60, 0.18)'
                }}>
                  <AlertTriangle size={26} />
                </div>
                <h3 style={{ margin: '0 0 8px', fontSize: '18px', fontWeight: 800, color: '#1C1917' }}>
                  {scanError.title}
                </h3>
                <p style={{ margin: '0 0 16px', fontSize: '13.5px', color: '#78716C', lineHeight: 1.5 }}>
                  {scanError.message}
                </p>

                {/* Tip Box */}
                <div style={{
                  background: '#FFF7F2',
                  border: '1px solid #FCD9C6',
                  borderRadius: '14px',
                  padding: '10px 14px',
                  fontSize: '12px',
                  color: '#9A3412',
                  textAlign: 'left',
                  marginBottom: '18px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <Sparkles size={16} color="#EA580C" style={{ flexShrink: 0 }} />
                  <span>Tip: For packaged groceries, aim directly at the <strong>Nutrition Facts</strong> table or product label.</span>
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => {
                      triggerHapticLight();
                      setShowResults(false);
                      setScanError(null);
                      setAnalysis(null);
                    }}
                    style={{
                      flex: 1,
                      padding: '13px',
                      borderRadius: '16px',
                      background: 'linear-gradient(135deg, #FF6B4A 0%, #FF8A65 100%)',
                      color: '#FFFFFF',
                      border: 'none',
                      fontSize: '14px',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      boxShadow: '0 6px 18px rgba(255, 107, 74, 0.32)'
                    }}
                  >
                    <RefreshCw size={15} /> Try Scanning Again
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowResults(false);
                      setScanError(null);
                      fileInputRef.current?.click();
                    }}
                    style={{
                      padding: '13px 18px',
                      borderRadius: '16px',
                      background: '#FFFFFF',
                      color: '#57534E',
                      border: '1.5px solid #F3D9C9',
                      fontSize: '13.5px',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    Upload Photo
                  </button>
                </div>
              </div>
            ) : analysis && (
              <>
                {/* The Luxury Peach & Creme Result Card */}
                <div style={{
                  background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.98) 0%, #FFF8F3 100%)',
                  backdropFilter: 'blur(24px)',
                  WebkitBackdropFilter: 'blur(24px)',
                  borderRadius: '24px',
                  padding: '20px',
                  boxShadow: '0 24px 48px rgba(234, 88, 12, 0.18)',
                  border: '1.5px solid rgba(254, 215, 195, 0.95)'
                }}>
                  {analysis?.warning && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '8px',
                      background: '#FFF1F2',
                      border: '1px solid #FECDD3',
                      padding: '12px',
                      borderRadius: '14px',
                      width: '100%',
                      marginBottom: '14px',
                      boxSizing: 'border-box'
                    }}>
                      <AlertTriangle size={15} color="#E11D48" style={{ flexShrink: 0, marginTop: '1px' }} />
                      <span style={{ color: '#BE123C', fontSize: '12px', fontWeight: 800, letterSpacing: '0.3px', lineHeight: 1.4 }}>
                        {analysis.warning}
                      </span>
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                    <h3 style={{ margin: 0, fontSize: '19px', fontWeight: 800, color: '#1C1917', letterSpacing: '-0.3px' }}>
                      {analysis?.foodName || 'Identified Dish'}
                    </h3>
                    {profile?.conditions && profile.conditions.length > 0 && (
                      <span style={{
                        fontSize: '10.5px',
                        fontWeight: 800,
                        padding: '3px 9px',
                        borderRadius: '999px',
                        background: '#ECFDF5',
                        color: '#059669',
                        border: '1px solid #A7F3D0',
                        whiteSpace: 'nowrap'
                      }}>
                        🩺 Active Profile
                      </span>
                    )}
                  </div>

                  <p style={{ margin: '0 0 16px', fontSize: '12.5px', color: '#78716C' }}>
                    Analyzed against your health profile{analysis?.servingSize ? ` • ${analysis.servingSize}` : ''}
                  </p>

                  {/* Glycemic Spike Graph */}
                  {analysis?.sugar !== undefined && (
                    <div style={{ marginBottom: '16px', padding: '14px 16px', background: '#FFF7F2', borderRadius: '16px', border: '1.5px solid #FCD9C6' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <span style={{ fontSize: '11px', fontWeight: 800, color: '#9A3412', letterSpacing: '0.6px' }}>GLYCEMIC RESPONSE</span>
                        <span style={{
                          fontSize: '12px',
                          fontWeight: 800,
                          color: analysis.sugar > 20 ? '#DC2626' : '#059669',
                          background: analysis.sugar > 20 ? '#FEE2E2' : '#ECFDF5',
                          padding: '2px 8px',
                          borderRadius: '999px',
                          border: `1px solid ${analysis.sugar > 20 ? '#FECDD3' : '#A7F3D0'}`
                        }}>
                          {analysis.sugar > 20 ? 'High Spike ⚠️' : 'Glycemic Stable ✓'}
                        </span>
                      </div>
                      <div style={{ height: '54px', width: '100%', position: 'relative' }}>
                        <svg viewBox="0 0 100 40" preserveAspectRatio="none" style={{ width: '100%', height: '100%' }}>
                          <path 
                            d={analysis.sugar > 20 ? "M0,35 Q30,35 45,5 T55,5 Q70,35 100,35" : "M0,35 Q50,30 100,35"} 
                            fill="none" 
                            stroke={analysis.sugar > 20 ? "url(#spikeGradient)" : "url(#stableGradient)"} 
                            strokeWidth="3.5" 
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
                      <div style={{ fontSize: '11.5px', color: '#78716C', marginTop: '6px', textAlign: 'center' }}>
                        Estimated Sugar: <strong style={{ color: '#1C1917' }}>{analysis.sugar ?? 0}g</strong> per serving
                      </div>
                    </div>
                  )}

                  {/* Macro Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
                    <div style={{ background: '#FFF7F2', padding: '12px', borderRadius: '14px', border: '1px solid #FCD9C6' }}>
                      <div style={{ fontSize: '11.5px', color: '#78716C', fontWeight: 600 }}>Calories</div>
                      <div style={{ fontSize: '17px', color: '#1C1917', fontWeight: 800 }}>{analysis?.calories ?? 0} kcal</div>
                    </div>
                    <div style={{ background: '#FFF7F2', padding: '12px', borderRadius: '14px', border: '1px solid #FCD9C6' }}>
                      <div style={{ fontSize: '11.5px', color: '#78716C', fontWeight: 600 }}>Protein</div>
                      <div style={{ fontSize: '17px', color: '#1C1917', fontWeight: 800 }}>{analysis?.protein ?? 0}g</div>
                    </div>
                    <div style={{ background: '#FFF7F2', padding: '12px', borderRadius: '14px', border: '1px solid #FCD9C6' }}>
                      <div style={{ fontSize: '11.5px', color: '#78716C', fontWeight: 600 }}>Carbs (Sugar: {analysis?.sugar ?? 0}g)</div>
                      <div style={{ fontSize: '17px', color: '#1C1917', fontWeight: 800 }}>{analysis?.carbs ?? 0}g</div>
                    </div>
                    <div style={{ background: '#FFF7F2', padding: '12px', borderRadius: '14px', border: '1px solid #FCD9C6' }}>
                      <div style={{ fontSize: '11.5px', color: '#78716C', fontWeight: 600 }}>Fats</div>
                      <div style={{ fontSize: '17px', color: '#1C1917', fontWeight: 800 }}>{analysis?.fats ?? 0}g</div>
                    </div>
                  </div>
                </div>

                {/* Better Alternative Card */}
                {analysis?.betterAlternative && (
                  <div style={{
                    background: 'linear-gradient(135deg, rgba(255,255,255,0.98) 0%, #FFF8F3 100%)',
                    backdropFilter: 'blur(20px)', borderRadius: '20px', padding: '16px',
                    display: 'flex', alignItems: 'center', gap: '16px', border: '1.5px solid rgba(254, 215, 195, 0.95)', boxShadow: '0 12px 24px rgba(234, 88, 12, 0.08)'
                  }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '11px', fontWeight: 800, color: '#059669', letterSpacing: '0.5px', marginBottom: '4px' }}>BETTER ALTERNATIVE</div>
                      <div style={{ fontSize: '15px', fontWeight: 700, color: '#1C1917' }}>{analysis.betterAlternative.name}</div>
                      <div style={{ fontSize: '12px', color: '#78716C', marginTop: '2px' }}>{analysis.betterAlternative.reason}</div>
                    </div>
                    <div style={{ width: '32px', height: '32px', borderRadius: '16px', background: '#FFF2EB', display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#EA580C' }}>
                      <ArrowRight size={16} />
                    </div>
                  </div>
                )}

                {/* Consult Ava Action */}
                <button
                  type="button"
                  onClick={() => {
                    triggerHapticLight();
                    handleClose();
                    const prompt = `Hi Ava, I just scanned "${analysis.foodName || 'this packaged food'}" in the grocery aisle: ${analysis.calories || 0} kcal, ${analysis.protein || 0}g protein, ${analysis.carbs || 0}g carbs (${analysis.sugar || 0}g sugar), and ${analysis.fats || 0}g fat. Does this food spike insulin or conflict with my active metabolic profile, glycemic goals, and condition history?`;
                    navigate('/app/ava', { state: { initialPrompt: prompt } });
                  }}
                  style={{
                    width: '100%',
                    background: 'linear-gradient(135deg, #FF6B4A 0%, #FF8A65 100%)',
                    color: '#FFF',
                    border: 'none',
                    padding: '14px',
                    borderRadius: '16px',
                    fontSize: '14.5px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: '8px',
                    boxShadow: '0 6px 20px rgba(255, 107, 74, 0.35)',
                    marginBottom: '10px'
                  }}
                >
                  <Sparkles size={16} /> Consult Ava on this Item
                </button>

                {/* Action Buttons: Scan Another & Log Food */}
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => {
                      triggerHapticLight();
                      setShowResults(false);
                      setAnalysis(null);
                    }}
                    style={{
                      flex: 1,
                      background: 'rgba(255,255,255,0.95)',
                      color: '#57534E',
                      border: '1.5px solid #F3D9C9',
                      padding: '14px',
                      borderRadius: '16px',
                      fontSize: '14px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <RefreshCw size={15} /> Scan Another
                  </button>

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
                          type: 'Snack'
                        });
                      }}
                      style={{
                        flex: 1.5,
                        background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)', color: '#FFF', border: 'none', padding: '14px', borderRadius: '16px', 
                        fontSize: '15px', fontWeight: 800, cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px',
                        boxShadow: '0 6px 20px rgba(16, 185, 129, 0.3)'
                      }}>
                      <Scan size={18} />
                      Log {analysis.foodName}
                    </button>
                  )}
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hidden File Input for Device/Gallery Photo Selection */}
      <input
        type="file"
        accept="image/*"
        ref={fileInputRef}
        aria-label="Upload grocery or food label photo"
        onChange={handleFileUpload}
        style={{ display: 'none' }}
      />

      {/* Camera Unavailable Glassmorphic Card */}
      {cameraError && !showResults && (
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', zIndex: 15
        }}>
          <div style={{
            background: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(20px)',
            borderRadius: '24px', padding: '32px 24px', maxWidth: '420px', textAlign: 'center',
            border: '1px solid rgba(255,255,255,0.15)', color: '#FFF'
          }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.15)', color: '#F87171', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <Camera size={28} />
            </div>
            <h3 style={{ margin: '0 0 8px', fontSize: '18px', fontWeight: 800 }}>Camera Not Available</h3>
            <p style={{ margin: '0 0 24px', fontSize: '14px', color: '#94A3B8', lineHeight: 1.5 }}>
              {cameraError}
            </p>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="btn btn-primary"
              style={{ padding: '12px 24px', borderRadius: '12px', fontSize: '14px', fontWeight: 700, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            >
              <Upload size={16} /> Choose Photo from Device
            </button>
          </div>
        </div>
      )}

      {/* Capture & Upload Bar */}
      {!showResults && !cameraError && (
        <div style={{ position: 'absolute', bottom: '40px', left: 0, right: 0, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '24px', zIndex: 10 }}>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            title="Upload from Gallery"
            style={{
              width: '48px', height: '48px', borderRadius: '24px',
              background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255,255,255,0.3)',
              display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer',
              color: '#FFF'
            }}
          >
            <ImageIcon size={20} />
          </button>
          
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

          <div style={{ width: '48px' }} />
        </div>
      )}
    </div>
  );
};
