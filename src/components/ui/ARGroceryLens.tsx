import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, X, Zap, ArrowRight, Scan, AlertTriangle, Image as ImageIcon, Upload, RefreshCw, Sparkles, CheckCircle2, ShieldCheck, Leaf } from 'lucide-react';
import { getProfile, addNutritionLog } from '../../services/ProfileEngine';
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

const CircularProgress = ({
  value,
  max,
  color,
  title,
  subtitle
}: {
  value: number;
  max: number;
  color: string;
  trackColor?: string;
  title: string;
  subtitle: string;
}) => {
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const percent = max > 0 ? Math.min(Math.max(value, 0) / max, 1) : 0;
  const offset = circumference - percent * circumference;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', flexShrink: 0, minWidth: '72px' }}>
      <div style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A' }}>{title}</div>
      <div style={{ position: 'relative', width: '80px', height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width="80" height="80" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="40" cy="40" r={radius} fill="none" stroke={color} strokeWidth="6" strokeOpacity="0.2" />
          <circle
            cx="40"
            cy="40"
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth="6"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.6s cubic-bezier(0.4, 0, 0.2, 1)' }}
          />
        </svg>
        <div style={{ position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', lineHeight: '1.2' }}>
            {Math.round(value * 10) / 10}
          </span>
          <span style={{ fontSize: '10px', color: '#64748B', fontWeight: 500 }}>{subtitle}</span>
        </div>
      </div>
    </div>
  );
};

export const ARGroceryLens = ({ onClose, onLogFood }: { onClose: () => void, onLogFood?: (food: any) => void }) => {
  const navigate = useNavigate();
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
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
  const targetFibre = 28;

  useEffect(() => {
    let activeStream: MediaStream | null = null;
    let isCancelled = false;

    // Start camera
    if (navigator.mediaDevices?.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: facingMode } } })
        .then((s) => {
          if (isCancelled) {
            s.getTracks().forEach(t => t.stop());
            return;
          }
          activeStream = s;
          setStream(s);
          setCameraError(null);
          if (videoRef.current) {
            videoRef.current.srcObject = s;
          }
        })
        .catch((err) => {
          if (isCancelled) return;
          console.error("Camera access denied or unavailable", err);
          setCameraError("Camera is unavailable or permission was not granted. You can upload a photo of the food or nutrition facts label instead.");
        });
    } else {
      setCameraError("Camera is unavailable on this device. You can upload a photo from your gallery.");
    }

    document.body.classList.add('lens-active');
    document.body.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';

    return () => {
      isCancelled = true;
      document.body.classList.remove('lens-active');
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
      if (activeStream) {
        activeStream.getTracks().forEach(t => t.stop());
      }
    };
  }, [facingMode]);

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

  const handleToggleFacingMode = () => {
    triggerHapticLight();
    if (stream) {
      stream.getTracks().forEach(t => t.stop());
      setStream(null);
    }
    setFacingMode(prev => (prev === 'environment' ? 'user' : 'environment'));
  };

  const handleClose = () => {
    document.body.classList.remove('lens-active');
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

  return createPortal(
    <div 
      role="dialog"
      aria-modal="true"
      aria-label="Clinical AR Food & Nutrition Scanner"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100dvh',
        background: '#000000',
        zIndex: 999999,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
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
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        paddingTop: 'max(16px, env(safe-area-inset-top, 16px))',
        paddingLeft: '20px',
        paddingRight: '20px',
        paddingBottom: '16px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        zIndex: 10,
        background: 'linear-gradient(180deg, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0) 100%)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ background: '#10B981', width: '8px', height: '8px', borderRadius: '50%', boxShadow: '0 0 10px #10B981' }} />
          <span style={{ color: '#FFFFFF', fontWeight: 800, fontSize: '13.5px', letterSpacing: '0.6px', textTransform: 'uppercase' }}>
            Clinical Lens
          </span>
        </div>
        <button 
          type="button"
          aria-label="Close Clinical Lens"
          onClick={handleClose}
          style={{
            width: '42px',
            height: '42px',
            borderRadius: '21px',
            background: 'rgba(255, 255, 255, 0.18)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: '1px solid rgba(255, 255, 255, 0.25)',
            color: '#FFFFFF',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            cursor: 'pointer'
          }}
        >
          <X size={20} />
        </button>
      </div>

      {/* Themed Minimal Guidance Pill */}
      {!showResults && (
        <div style={{
          position: 'absolute',
          top: 'max(68px, calc(env(safe-area-inset-top, 16px) + 52px))',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 10,
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          background: 'rgba(15, 23, 42, 0.82)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: '1px solid rgba(52, 211, 153, 0.35)',
          borderRadius: '999px',
          padding: '6px 14px',
          boxShadow: '0 6px 20px rgba(0, 0, 0, 0.4)',
          width: 'max-content',
          maxWidth: 'calc(100% - 32px)',
          boxSizing: 'border-box',
          pointerEvents: 'none'
        }}>
          <Sparkles size={13} color="#34D399" style={{ flexShrink: 0 }} />
          <span style={{
            color: '#F1F5F9',
            fontSize: '11.5px',
            fontWeight: 600,
            letterSpacing: '0.1px',
            textAlign: 'center',
            lineHeight: 1.3,
            whiteSpace: 'normal'
          }}>
            Scan packaged food, labels, or meals
          </span>
        </div>
      )}

      {/* Center AR Reticle Viewfinder */}
      {!showResults && !cameraError && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -55%)',
          width: 'min(270px, 72vw)',
          height: 'min(270px, 72vw)',
          pointerEvents: 'none',
          zIndex: 5,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          {/* Top-Left Corner */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '28px',
            height: '28px',
            borderTop: '3px solid #34D399',
            borderLeft: '3px solid #34D399',
            borderTopLeftRadius: '14px',
            filter: 'drop-shadow(0 0 6px rgba(52, 211, 153, 0.6))'
          }} />
          {/* Top-Right Corner */}
          <div style={{
            position: 'absolute',
            top: 0,
            right: 0,
            width: '28px',
            height: '28px',
            borderTop: '3px solid #34D399',
            borderRight: '3px solid #34D399',
            borderTopRightRadius: '14px',
            filter: 'drop-shadow(0 0 6px rgba(52, 211, 153, 0.6))'
          }} />
          {/* Bottom-Left Corner */}
          <div style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            width: '28px',
            height: '28px',
            borderBottom: '3px solid #34D399',
            borderLeft: '3px solid #34D399',
            borderBottomLeftRadius: '14px',
            filter: 'drop-shadow(0 0 6px rgba(52, 211, 153, 0.6))'
          }} />
          {/* Bottom-Right Corner */}
          <div style={{
            position: 'absolute',
            bottom: 0,
            right: 0,
            width: '28px',
            height: '28px',
            borderBottom: '3px solid #34D399',
            borderRight: '3px solid #34D399',
            borderBottomRightRadius: '14px',
            filter: 'drop-shadow(0 0 6px rgba(52, 211, 153, 0.6))'
          }} />

          {/* Frame Label */}
          <span style={{
            color: 'rgba(255, 255, 255, 0.75)',
            fontSize: '11px',
            fontWeight: 600,
            letterSpacing: '0.4px',
            textTransform: 'uppercase',
            textAlign: 'center',
            background: 'rgba(0, 0, 0, 0.35)',
            padding: '4px 10px',
            borderRadius: '999px',
            backdropFilter: 'blur(6px)'
          }}>
            {isScanning ? 'Analyzing...' : 'Align Item Inside'}
          </span>
        </div>
      )}

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
              position: 'absolute',
              bottom: 'max(24px, calc(env(safe-area-inset-bottom, 0px) + 16px))',
              left: '16px',
              right: '16px',
              zIndex: 30,
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              maxHeight: 'calc(100vh - 120px)',
              overflowY: 'auto',
              paddingBottom: '24px',
              scrollbarWidth: 'none',
              WebkitOverflowScrolling: 'touch'
            }}
          >
            {/* Non-Detection / Error Guidance Card */}
            {scanError ? (
              <div style={{
                position: 'relative',
                background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.76) 0%, rgba(255, 255, 255, 0.42) 100%)',
                backdropFilter: 'blur(36px)',
                WebkitBackdropFilter: 'blur(36px)',
                borderRadius: '32px',
                padding: '24px 20px',
                boxShadow: '0 24px 48px rgba(0, 0, 0, 0.12), inset 0 2px 0 rgba(255, 255, 255, 0.85), inset 0 0 30px rgba(255, 255, 255, 0.35)',
                border: '1.5px solid rgba(255, 255, 255, 0.85)',
                textAlign: 'center',
                overflow: 'hidden'
              }}>
                <div style={{ position: 'absolute', top: '-10%', left: '-10%', width: '140px', height: '140px', background: '#FEE2E2', borderRadius: '50%', filter: 'blur(45px)', zIndex: 0, opacity: 0.6, pointerEvents: 'none' }} />
                <div style={{ position: 'absolute', bottom: '-10%', right: '-10%', width: '150px', height: '150px', background: '#DBEAFE', borderRadius: '50%', filter: 'blur(45px)', zIndex: 0, opacity: 0.6, pointerEvents: 'none' }} />
                
                <div style={{ position: 'relative', zIndex: 1 }}>
                  <div style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '50%',
                    background: 'rgba(254, 242, 242, 0.9)',
                    border: '1.5px solid rgba(239, 68, 68, 0.35)',
                    margin: '0 auto 16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#DC2626'
                  }}>
                    <AlertTriangle size={28} />
                  </div>
                  <h3 style={{ margin: '0 0 8px', fontSize: '18px', fontWeight: 800, color: '#1C1917' }}>
                    No Food or Label Detected
                  </h3>
                  <p style={{ margin: '0 0 20px', fontSize: '13px', color: '#78716C', lineHeight: 1.5 }}>
                    Position the camera directly in front of the grocery item, barcode, or ingredient table.
                  </p>
                  <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                    <button
                      type="button"
                      onClick={() => {
                        triggerHapticLight();
                        setScanError(null);
                        setShowResults(false);
                        setAnalysis(null);
                      }}
                      style={{
                        padding: '13px 22px',
                        borderRadius: '16px',
                        background: 'linear-gradient(135deg, #0D9488 0%, #0F766E 100%)',
                        color: '#FFFFFF',
                        border: 'none',
                        fontSize: '13.5px',
                        fontWeight: 800,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        boxShadow: '0 8px 24px rgba(13, 148, 136, 0.3)'
                      }}
                    >
                      <RefreshCw size={16} /> Try Again
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        triggerHapticLight();
                        setShowResults(false);
                        setScanError(null);
                        fileInputRef.current?.click();
                      }}
                      style={{
                        padding: '13px 18px',
                        borderRadius: '16px',
                        background: 'rgba(255, 255, 255, 0.85)',
                        backdropFilter: 'blur(16px)',
                        color: '#57534E',
                        border: '1.5px solid rgba(255, 255, 255, 0.9)',
                        fontSize: '13.5px',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      Upload Photo
                    </button>
                  </div>
                </div>
              </div>
            ) : analysis && (
              <>
                {/* The Clinical Result Card with Sheer Glass Theme from Diet Section */}
                <div style={{
                  position: 'relative',
                  background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.72) 0%, rgba(255, 255, 255, 0.42) 100%)',
                  backdropFilter: 'blur(36px)',
                  WebkitBackdropFilter: 'blur(36px)',
                  borderRadius: '32px',
                  padding: '22px 20px',
                  boxShadow: '0 24px 50px rgba(0, 0, 0, 0.12), inset 0 2px 0 rgba(255, 255, 255, 0.85), inset 0 0 35px rgba(255, 255, 255, 0.35)',
                  border: '1.5px solid rgba(255, 255, 255, 0.85)',
                  overflow: 'hidden'
                }}>
                  {/* Ambient pastel blobs behind the sheer glass card */}
                  <div style={{ position: 'absolute', top: '-15%', left: '-10%', width: '180px', height: '180px', background: '#A7F3D0', borderRadius: '50%', filter: 'blur(50px)', zIndex: 0, opacity: 0.55, pointerEvents: 'none' }} />
                  <div style={{ position: 'absolute', bottom: '-10%', right: '-10%', width: '200px', height: '200px', background: '#DBEAFE', borderRadius: '50%', filter: 'blur(55px)', zIndex: 0, opacity: 0.6, pointerEvents: 'none' }} />
                  <div style={{ position: 'absolute', top: '35%', right: '15%', width: '130px', height: '130px', background: '#FDE68A', borderRadius: '50%', filter: 'blur(45px)', zIndex: 0, opacity: 0.4, pointerEvents: 'none' }} />
                  <div style={{ position: 'absolute', bottom: '25%', left: '10%', width: '120px', height: '120px', background: '#FAE8FF', borderRadius: '50%', filter: 'blur(45px)', zIndex: 0, opacity: 0.45, pointerEvents: 'none' }} />

                  <div style={{ position: 'relative', zIndex: 1 }}>
                    {/* 1. Food Header (Prominent Top Hierarchy) */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px', gap: '8px' }}>
                      <h3 style={{ margin: 0, fontSize: '19px', fontWeight: 800, color: '#1C1917', letterSpacing: '-0.3px' }}>
                        {analysis?.foodName || 'Identified Dish'}
                      </h3>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                        <span style={{
                          padding: '3px 10px',
                          borderRadius: '999px',
                          background: 'rgba(239, 68, 68, 0.1)',
                          border: '1px solid rgba(239, 68, 68, 0.25)',
                          color: '#DC2626',
                          fontSize: '12px',
                          fontWeight: 800,
                          whiteSpace: 'nowrap'
                        }}>
                          {analysis?.calories ?? 0} kcal
                        </span>
                        {profile?.conditions && profile.conditions.length > 0 && (
                          <span style={{
                            fontSize: '10.5px',
                            fontWeight: 800,
                            padding: '3px 9px',
                            borderRadius: '999px',
                            background: 'rgba(236, 253, 245, 0.85)',
                            color: '#059669',
                            border: '1px solid #A7F3D0',
                            whiteSpace: 'nowrap'
                          }}>
                            🩺 Active Profile
                          </span>
                        )}
                      </div>
                    </div>

                    <p style={{ margin: '0 0 14px', fontSize: '12.5px', color: '#78716C' }}>
                      AI-estimated from the image{analysis?.servingSize ? ` • ${analysis.servingSize}` : ''}. Verify the package label and portion before saving.
                    </p>

                    {/* 2. Traffic-Light Health Verdict Banner */}
                    {analysis?.healthVerdict && (
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '10px',
                        padding: '12px 14px',
                        borderRadius: '18px',
                        marginBottom: '14px',
                        background: analysis.healthVerdict === 'clean_choice'
                          ? 'linear-gradient(135deg, rgba(236, 253, 245, 0.95) 0%, rgba(209, 250, 229, 0.85) 100%)'
                          : analysis.healthVerdict === 'moderate_treat'
                          ? 'linear-gradient(135deg, rgba(254, 243, 199, 0.95) 0%, rgba(253, 230, 138, 0.85) 100%)'
                          : 'linear-gradient(135deg, rgba(254, 242, 242, 0.95) 0%, rgba(254, 205, 211, 0.85) 100%)',
                        border: `1.5px solid ${
                          analysis.healthVerdict === 'clean_choice'
                            ? '#6EE7B7'
                            : analysis.healthVerdict === 'moderate_treat'
                            ? '#FCD34D'
                            : '#FCA5A5'
                        }`,
                        boxShadow: '0 4px 14px rgba(0,0,0,0.04)'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                          {analysis.healthVerdict === 'clean_choice' ? (
                            <CheckCircle2 size={18} color="#059669" style={{ flexShrink: 0 }} />
                          ) : (
                            <AlertTriangle
                              size={18}
                              color={analysis.healthVerdict === 'moderate_treat' ? '#D97706' : '#DC2626'}
                              style={{ flexShrink: 0 }}
                            />
                          )}
                          <div style={{ flex: 1 }}>
                            <div style={{
                              fontSize: '10.5px',
                              fontWeight: 800,
                              letterSpacing: '0.6px',
                              color: analysis.healthVerdict === 'clean_choice'
                                ? '#065F46'
                                : analysis.healthVerdict === 'moderate_treat'
                                ? '#92400E'
                                : '#991B1B'
                            }}>
                              {analysis.healthVerdict === 'clean_choice'
                                ? 'CLEAN FUEL · BALANCED CHOICE'
                                : analysis.healthVerdict === 'moderate_treat'
                                ? 'MODERATE TREAT · ENJOY MINDFULLY'
                                : 'ULTRA-PROCESSED · SWAP RECOMMENDED'}
                            </div>
                            {analysis.verdictHeadline && (
                              <div style={{
                                fontSize: '13px',
                                fontWeight: 800,
                                color: '#1C1917',
                                marginTop: '1px'
                              }}>
                                {analysis.verdictHeadline}
                              </div>
                            )}
                          </div>
                        </div>

                        {analysis.novaGrade && (
                          <span style={{
                            fontSize: '10px',
                            fontWeight: 800,
                            padding: '4px 8px',
                            borderRadius: '999px',
                            whiteSpace: 'nowrap',
                            background: analysis.novaGrade === 1
                              ? '#10B981'
                              : analysis.novaGrade === 2
                              ? '#059669'
                              : analysis.novaGrade === 3
                              ? '#F59E0B'
                              : '#EF4444',
                            color: '#FFFFFF',
                            boxShadow: '0 2px 6px rgba(0,0,0,0.1)'
                          }}>
                            NOVA {analysis.novaGrade}
                          </span>
                        )}
                      </div>
                    )}

                    {/* 3. Clinical Rationale & Ingredient Flags */}
                    {analysis?.clinicalRationale && (
                      <div style={{
                        marginBottom: '14px',
                        padding: '12px 14px',
                        background: 'rgba(255, 255, 255, 0.75)',
                        backdropFilter: 'blur(16px)',
                        borderRadius: '16px',
                        border: '1px solid rgba(255, 255, 255, 0.9)',
                        fontSize: '12.5px',
                        color: '#334155',
                        lineHeight: 1.45
                      }}>
                        <div style={{ fontSize: '10px', fontWeight: 800, color: '#0F766E', letterSpacing: '0.5px', marginBottom: '3px' }}>
                          CLINICAL PERSPECTIVE
                        </div>
                        {analysis.clinicalRationale}

                        {analysis.flags && analysis.flags.length > 0 && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginTop: '8px' }}>
                            {analysis.flags.map((flag, idx) => (
                              <span
                                key={idx}
                                style={{
                                  fontSize: '10px',
                                  fontWeight: 700,
                                  padding: '2px 8px',
                                  borderRadius: '6px',
                                  background: 'rgba(239, 68, 68, 0.1)',
                                  color: '#BE123C',
                                  border: '1px solid rgba(239, 68, 68, 0.2)'
                                }}
                              >
                                ⚠ {flag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {analysis?.warning && !analysis?.clinicalRationale && (
                      <div style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '8px',
                        background: 'rgba(255, 241, 242, 0.85)',
                        backdropFilter: 'blur(12px)',
                        border: '1px solid #FECDD3',
                        padding: '12px',
                        borderRadius: '16px',
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

                    {/* 4. Glycemic Response Graph */}
                    {analysis?.sugar !== undefined && (
                      <div style={{
                        marginBottom: '14px',
                        padding: '14px 16px',
                        background: 'rgba(255, 255, 255, 0.75)',
                        backdropFilter: 'blur(16px)',
                        borderRadius: '20px',
                        border: '1px solid rgba(255, 255, 255, 0.9)',
                        boxShadow: '0 4px 14px rgba(0, 0, 0, 0.03)'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                          <span style={{ fontSize: '10.5px', fontWeight: 800, color: '#0F766E', letterSpacing: '0.6px' }}>
                            GLYCEMIC RESPONSE
                          </span>
                          <span style={{
                            fontSize: '11px',
                            fontWeight: 800,
                            padding: '3px 10px',
                            borderRadius: '999px',
                            background: (analysis.sugar || 0) > 15 ? 'rgba(239, 68, 68, 0.12)' : 'rgba(16, 185, 129, 0.12)',
                            color: (analysis.sugar || 0) > 15 ? '#DC2626' : '#059669',
                            border: `1px solid ${(analysis.sugar || 0) > 15 ? '#FCA5A5' : '#A7F3D0'}`
                          }}>
                            {(analysis.sugar || 0) > 15 ? 'High Spike ⚠️' : 'Glycemic Stable ✓'}
                          </span>
                        </div>
                        <div style={{ height: '54px', width: '100%', position: 'relative' }}>
                          <svg viewBox="0 0 100 40" preserveAspectRatio="none" style={{ width: '100%', height: '100%' }}>
                            <path
                              d={(analysis.sugar || 0) > 15 ? "M0,35 Q30,35 45,6 T55,6 Q70,35 100,35" : "M0,35 Q50,30 100,35"}
                              fill="none"
                              stroke={(analysis.sugar || 0) > 15 ? "url(#spikeGradient)" : "url(#stableGradient)"}
                              strokeWidth="3.5"
                              strokeLinecap="round"
                            />
                            <defs>
                              <linearGradient id="spikeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stopColor="#EF4444" stopOpacity="0.25" />
                                <stop offset="50%" stopColor="#EF4444" stopOpacity="1" />
                                <stop offset="100%" stopColor="#EF4444" stopOpacity="0.25" />
                              </linearGradient>
                              <linearGradient id="stableGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stopColor="#10B981" stopOpacity="0.25" />
                                <stop offset="50%" stopColor="#10B981" stopOpacity="1" />
                                <stop offset="100%" stopColor="#10B981" stopOpacity="0.25" />
                              </linearGradient>
                            </defs>
                          </svg>
                        </div>
                        <div style={{ fontSize: '11.5px', color: '#64748B', marginTop: '6px', textAlign: 'center', fontWeight: 600 }}>
                          Estimated Sugar: <strong style={{ color: '#1C1917' }}>{analysis.sugar ?? 0}g</strong> per serving
                        </div>
                      </div>
                    )}

                    {/* 5. Functional Gut & Metabolic Integrity Chips */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '14px' }}>
                      {/* Insulin Surge / Stable Chip */}
                      {(analysis?.sugar || 0) > 15 ? (
                        <span style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '4px 10px',
                          borderRadius: '8px',
                          background: 'rgba(239, 68, 68, 0.1)',
                          color: '#B91C1C',
                          border: '1px solid rgba(239, 68, 68, 0.25)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}>
                          ⚡ High Insulin Surge (&gt;15g)
                        </span>
                      ) : (
                        <span style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '4px 10px',
                          borderRadius: '8px',
                          background: 'rgba(16, 185, 129, 0.1)',
                          color: '#047857',
                          border: '1px solid rgba(16, 185, 129, 0.25)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}>
                          ✓ Glycemic Balance Stable
                        </span>
                      )}

                      {/* Protein Density Chip */}
                      {(analysis?.protein || 0) >= 8 && (
                        <span style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '4px 10px',
                          borderRadius: '8px',
                          background: 'rgba(59, 130, 246, 0.1)',
                          color: '#1D4ED8',
                          border: '1px solid rgba(59, 130, 246, 0.25)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}>
                          💪 High Protein Density ({analysis?.protein}g)
                        </span>
                      )}

                      {/* Refined Seed Oil / Palm Oil Chip */}
                      {(
                        (analysis?.flags && analysis.flags.some(f => /oil|palm|fried|trans fat/i.test(f))) ||
                        (analysis?.clinicalRationale && /seed oil|palm oil|deep fried|trans fat/i.test(analysis.clinicalRationale)) ||
                        (analysis?.foodName && /chips|fries|crisps|biscuit|cookie|noodle|wafer/i.test(analysis.foodName))
                      ) && (
                        <span style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '4px 10px',
                          borderRadius: '8px',
                          background: 'rgba(245, 158, 11, 0.1)',
                          color: '#B45309',
                          border: '1px solid rgba(245, 158, 11, 0.3)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}>
                          ⚠️ Refined Seed Oil Alert
                        </span>
                      )}

                      {/* Mucosal Emulsifier Scan */}
                      {(
                        analysis?.novaGrade === 4 ||
                        (analysis?.flags && analysis.flags.some(f => /emulsifier|thickener|preservative|additive|carrageenan/i.test(f))) ||
                        (analysis?.clinicalRationale && /emulsifier|gut lining|microbiome|mucosal/i.test(analysis.clinicalRationale)) ||
                        (analysis?.foodName && /sauce|mayo|dressing|ice cream|energy bar/i.test(analysis.foodName))
                      ) && (
                        <span style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '4px 10px',
                          borderRadius: '8px',
                          background: 'rgba(139, 92, 246, 0.1)',
                          color: '#6D28D9',
                          border: '1px solid rgba(139, 92, 246, 0.25)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}>
                          🛡️ Mucosal Emulsifier Scan
                        </span>
                      )}
                    </div>

                    {/* 6. Macro Grid (High-Contrast 2x2 Cards) */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
                      <div style={{
                        background: 'rgba(255, 255, 255, 0.8)',
                        backdropFilter: 'blur(12px)',
                        padding: '12px 14px',
                        borderRadius: '16px',
                        border: '1px solid rgba(226, 232, 240, 0.9)',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
                      }}>
                        <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>Calories</div>
                        <div style={{ fontSize: '18px', color: '#1C1917', fontWeight: 800, marginTop: '2px' }}>
                          {analysis?.calories ?? 0} <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748B' }}>kcal</span>
                        </div>
                      </div>
                      <div style={{
                        background: 'rgba(255, 255, 255, 0.8)',
                        backdropFilter: 'blur(12px)',
                        padding: '12px 14px',
                        borderRadius: '16px',
                        border: '1px solid rgba(226, 232, 240, 0.9)',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
                      }}>
                        <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>Protein</div>
                        <div style={{ fontSize: '18px', color: '#059669', fontWeight: 800, marginTop: '2px' }}>
                          {analysis?.protein ?? 0}<span style={{ fontSize: '12px', fontWeight: 600, color: '#64748B' }}>g</span>
                        </div>
                      </div>
                      <div style={{
                        background: 'rgba(255, 255, 255, 0.8)',
                        backdropFilter: 'blur(12px)',
                        padding: '12px 14px',
                        borderRadius: '16px',
                        border: '1px solid rgba(226, 232, 240, 0.9)',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
                      }}>
                        <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>
                          Carbs (Sugar: {analysis?.sugar ?? 0}g)
                        </div>
                        <div style={{ fontSize: '18px', color: '#2563EB', fontWeight: 800, marginTop: '2px' }}>
                          {analysis?.carbs ?? 0}<span style={{ fontSize: '12px', fontWeight: 600, color: '#64748B' }}>g</span>
                        </div>
                      </div>
                      <div style={{
                        background: 'rgba(255, 255, 255, 0.8)',
                        backdropFilter: 'blur(12px)',
                        padding: '12px 14px',
                        borderRadius: '16px',
                        border: '1px solid rgba(226, 232, 240, 0.9)',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
                      }}>
                        <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>Fats</div>
                        <div style={{ fontSize: '18px', color: '#D97706', fontWeight: 800, marginTop: '2px' }}>
                          {analysis?.fats ?? 0}<span style={{ fontSize: '12px', fontWeight: 600, color: '#64748B' }}>g</span>
                        </div>
                      </div>
                    </div>

                    {/* 7. Circular Macro Progress Rings Carousel (Exact Sheer Glass Diet Theme) */}
                    <div style={{ position: 'relative', marginBottom: '16px' }}>
                      {/* Aesthetic background blobs */}
                      <div style={{ position: 'absolute', top: '10%', left: '8%', width: '120px', height: '120px', background: '#A7F3D0', borderRadius: '50%', filter: 'blur(40px)', zIndex: 0, opacity: 0.8, pointerEvents: 'none' }} />
                      <div style={{ position: 'absolute', bottom: '10%', right: '8%', width: '140px', height: '140px', background: '#DBEAFE', borderRadius: '50%', filter: 'blur(45px)', zIndex: 0, opacity: 0.8, pointerEvents: 'none' }} />
                      <div style={{ position: 'absolute', top: '35%', right: '30%', width: '100px', height: '100px', background: '#FDE68A', borderRadius: '50%', filter: 'blur(35px)', zIndex: 0, opacity: 0.65, pointerEvents: 'none' }} />
                      
                      <div className="hide-scrollbar scrollable-row" style={{
                        background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.45) 0%, rgba(255, 255, 255, 0.05) 100%)',
                        backdropFilter: 'blur(32px)',
                        WebkitBackdropFilter: 'blur(32px)',
                        border: '1px solid rgba(255, 255, 255, 0.8)',
                        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.08), inset 0 2px 0 rgba(255,255,255,0.7), inset 0 0 30px rgba(255,255,255,0.4)',
                        borderRadius: '32px',
                        padding: '24px 16px',
                        display: 'flex',
                        flexWrap: 'nowrap',
                        overflowX: 'auto',
                        position: 'relative',
                        zIndex: 1,
                        gap: '16px',
                        paddingBottom: '16px',
                        scrollbarWidth: 'none',
                        WebkitOverflowScrolling: 'touch'
                      }}>
                        <CircularProgress value={analysis?.protein ?? 0} max={targetProtein} color="#10B981" trackColor="#D1FAE5" title="Protein" subtitle={`${targetProtein}g`} />
                        <CircularProgress value={analysis?.carbs ?? 0} max={targetCarbs} color="#3B82F6" trackColor="#DBEAFE" title="Carbs" subtitle={`${targetCarbs}g`} />
                        <CircularProgress value={analysis?.sugar ?? 0} max={targetSugar} color="#E879F9" trackColor="#FAE8FF" title="Sugar" subtitle={`${targetSugar}g`} />
                        <CircularProgress value={analysis?.fibre ?? 0} max={targetFibre} color="#8B5CF6" trackColor="#EDE9FE" title="Fibre" subtitle={`${targetFibre}g`} />
                        <CircularProgress value={analysis?.fats ?? 0} max={targetFats} color="#F59E0B" trackColor="#FEF3C7" title="Fats" subtitle={`${targetFats}g`} />
                        <CircularProgress value={analysis?.calories ?? 0} max={targetCalories} color="#EF4444" trackColor="#FEE2E2" title="Calories" subtitle={`${targetCalories} kcal`} />
                      </div>
                    </div>

                    {/* 8. Nutrition context — sheer glass styling */}
                    {analysis?.sugar !== undefined && (
                      <div style={{
                        marginBottom: '16px',
                        padding: '14px 16px',
                        background: 'rgba(255, 255, 255, 0.55)',
                        backdropFilter: 'blur(20px)',
                        WebkitBackdropFilter: 'blur(20px)',
                        borderRadius: '20px',
                        border: '1px solid rgba(255, 255, 255, 0.85)',
                        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.02)'
                      }}>
                        <div style={{ fontSize: '11px', fontWeight: 800, color: '#0F766E', letterSpacing: '0.6px', marginBottom: 6 }}>ESTIMATED NUTRITION CONTEXT</div>
                        <div style={{ fontSize: '12px', color: '#475569', lineHeight: 1.5 }}>
                          Estimated sugar: <strong style={{ color: '#1C1917' }}>{analysis.sugar ?? 0}g</strong> per serving. This cannot predict your glucose or insulin response; preparation, portion, other foods, medicines, and individual physiology matter.
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Craving-Matched Better Alternatives Section */}
                {((analysis?.betterAlternatives && analysis.betterAlternatives.length > 0) || analysis?.betterAlternative) && (
                  <div style={{
                    marginBottom: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px'
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0 4px'
                    }}>
                      <div style={{
                        fontSize: '11px',
                        fontWeight: 800,
                        color: '#059669',
                        letterSpacing: '0.6px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}>
                        <Sparkles size={14} color="#059669" /> CRAVING-MATCHED BETTER ALTERNATIVES
                      </div>
                      <span style={{ fontSize: '10.5px', color: '#64748B', fontWeight: 600 }}>
                        Same Craving · Clean Nutrition
                      </span>
                    </div>

                    {(analysis.betterAlternatives && analysis.betterAlternatives.length > 0
                      ? analysis.betterAlternatives
                      : [
                          {
                            name: analysis.betterAlternative?.name || 'Clean Alternative',
                            reason: analysis.betterAlternative?.reason || 'Nutrient-dense alternative',
                            swapType: 'whole_food' as const,
                            satisfactionMatch: 'Satisfies craving with superior nutrient density'
                          }
                        ]
                    ).map((alt, idx) => (
                      <div
                        key={idx}
                        style={{
                          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.96) 0%, #F0FDFA 100%)',
                          backdropFilter: 'blur(20px)',
                          borderRadius: '20px',
                          padding: '16px',
                          border: '1.5px solid #CCFBF1',
                          boxShadow: '0 12px 28px rgba(13, 148, 136, 0.08)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '10px'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                              <span style={{
                                fontSize: '9.5px',
                                fontWeight: 800,
                                letterSpacing: '0.4px',
                                padding: '2px 8px',
                                borderRadius: '999px',
                                background: alt.swapType === 'packaged' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(16, 185, 129, 0.12)',
                                color: alt.swapType === 'packaged' ? '#1D4ED8' : '#047857',
                                border: alt.swapType === 'packaged' ? '1px solid #BFDBFE' : '1px solid #A7F3D0'
                              }}>
                                {alt.swapType === 'packaged' ? '📦 CLEAN PACKAGED SWAP' : '🌱 WHOLE-FOOD SWAP'}
                              </span>
                              {alt.estimatedCalories && (
                                <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748B' }}>
                                  ~{alt.estimatedCalories} kcal {alt.protein ? `• ${alt.protein}g protein` : ''}
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: '15px', fontWeight: 800, color: '#1C1917', letterSpacing: '-0.2px' }}>
                              {alt.name}
                            </div>
                            <div style={{ fontSize: '12px', color: '#475569', marginTop: '3px', lineHeight: 1.4 }}>
                              <strong>Why better:</strong> {alt.reason}
                            </div>
                            {alt.satisfactionMatch && (
                              <div style={{ fontSize: '11.5px', color: '#0F766E', marginTop: '3px', fontWeight: 600 }}>
                                ✨ {alt.satisfactionMatch}
                              </div>
                            )}
                          </div>
                          <div style={{
                            width: '34px',
                            height: '34px',
                            borderRadius: '17px',
                            background: '#F0FDFA',
                            border: '1px solid #99F6E4',
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            color: '#0D9488',
                            flexShrink: 0
                          }}>
                            {alt.swapType === 'packaged' ? <ShieldCheck size={17} /> : <Leaf size={17} />}
                          </div>
                        </div>

                        {/* One-tap Log Alternative Action */}
                        <button
                          type="button"
                          onClick={() => {
                            triggerHapticSuccess();
                            const itemToLog = {
                              name: alt.name,
                              calories: alt.estimatedCalories || Math.round((analysis?.calories || 200) * 0.6),
                              protein: alt.protein || 4,
                              carbs: alt.carbs || 15,
                              fat: alt.fats || 3,
                              sugar: alt.sugar || 1,
                              fibre: alt.fibre || 3,
                              type: 'Snack'
                            };
                            if (onLogFood) {
                              onLogFood(itemToLog);
                            } else {
                              try {
                                addNutritionLog({
                                  meal: itemToLog.name,
                                  calories: itemToLog.calories,
                                  protein: itemToLog.protein,
                                  carbs: itemToLog.carbs,
                                  fat: itemToLog.fat,
                                  sugar: itemToLog.sugar,
                                  fibre: itemToLog.fibre,
                                  type: itemToLog.type,
                                  date: new Date().toISOString().split('T')[0]
                                });
                              } catch (e) {
                                console.warn('Failed to add nutrition log:', e);
                              }
                            }
                            awardPoints(15, 'Chose Smart Alternative 🌟', 'lifestyle');
                            handleClose();
                          }}
                          style={{
                            width: '100%',
                            background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                            color: '#FFFFFF',
                            border: 'none',
                            padding: '9px 14px',
                            borderRadius: '12px',
                            fontSize: '12.5px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                            boxShadow: '0 3px 10px rgba(5, 150, 105, 0.25)'
                          }}
                        >
                          <Sparkles size={14} /> Log Healthy Swap Instead (+15 pts)
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Consult Ava Action */}
                <button
                  type="button"
                  onClick={() => {
                    triggerHapticLight();
                    handleClose();
                    const prompt = `Hi Ava, I just scanned "${analysis.foodName || 'this food'}" in the grocery aisle: ${analysis.calories || 0} kcal, ${analysis.protein || 0}g protein, ${analysis.carbs || 0}g carbs (${analysis.sugar || 0}g sugar), and ${analysis.fats || 0}g fat. Does this food spike insulin or conflict with my active metabolic profile, glycemic goals, and condition history?`;
                    navigate('/app/ava', { state: { initialPrompt: prompt } });
                  }}
                  style={{
                    width: '100%',
                    background: 'linear-gradient(135deg, #0D9488 0%, #0F766E 100%)',
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
                    boxShadow: '0 6px 20px rgba(13, 148, 136, 0.35)',
                    marginBottom: '10px'
                  }}
                >
                  <Sparkles size={16} /> Review estimates with Ava
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
                      border: '1.5px solid #E2E8F0',
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

                  {analysis?.foodName && (
                    <button 
                      onClick={() => {
                        triggerHapticSuccess();
                        const itemToLog = {
                          name: analysis.foodName,
                          calories: analysis.calories || 0,
                          protein: analysis.protein || 0,
                          carbs: analysis.carbs || 0,
                          fat: analysis.fats || 0,
                          sugar: analysis.sugar || 0,
                          fibre: analysis.fibre || 0,
                          type: 'Snack'
                        };
                        if (onLogFood) {
                          onLogFood(itemToLog);
                        } else {
                          try {
                            addNutritionLog({
                              meal: itemToLog.name,
                              calories: itemToLog.calories,
                              protein: itemToLog.protein,
                              carbs: itemToLog.carbs,
                              fat: itemToLog.fat,
                              sugar: itemToLog.sugar,
                              fibre: itemToLog.fibre,
                              type: itemToLog.type,
                              date: new Date().toISOString().split('T')[0]
                            });
                          } catch (e) {
                            console.warn('Failed to add nutrition log:', e);
                          }
                        }
                        awardPoints(5, 'AI Food Scanned & Logged', 'lifestyle', `ar_scan_${Date.now()}`);
                        handleClose();
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
        <div style={{
          position: 'absolute',
          bottom: 'max(28px, calc(env(safe-area-inset-bottom, 0px) + 20px))',
          left: 0,
          right: 0,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '36px',
          zIndex: 20,
          padding: '0 24px'
        }}>
          {/* Left: Gallery Upload Button */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
            <motion.button
              type="button"
              whileTap={{ scale: 0.9 }}
              onClick={() => fileInputRef.current?.click()}
              aria-label="Upload food or label image from gallery"
              title="Upload from Gallery"
              style={{
                width: '50px',
                height: '50px',
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.18)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                border: '1.5px solid rgba(255, 255, 255, 0.3)',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                cursor: 'pointer',
                color: '#FFFFFF',
                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)'
              }}
            >
              <ImageIcon size={22} />
            </motion.button>
            <span style={{ color: 'rgba(255, 255, 255, 0.85)', fontSize: '10.5px', fontWeight: 600, letterSpacing: '0.2px' }}>
              Gallery
            </span>
          </div>

          {/* Center: Tactile Capture Shutter Button */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
            <motion.button 
              type="button"
              onClick={handleScan}
              disabled={isScanning}
              whileTap={{ scale: 0.92 }}
              aria-label={isScanning ? "Scanning..." : "Capture and analyze food"}
              style={{
                width: '76px',
                height: '76px',
                borderRadius: '50%',
                background: isScanning ? 'rgba(255, 255, 255, 0.3)' : '#FFFFFF',
                border: '4px solid rgba(255, 255, 255, 0.45)',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                cursor: isScanning ? 'default' : 'pointer',
                boxShadow: isScanning
                  ? '0 0 24px rgba(16, 185, 129, 0.6)'
                  : '0 8px 30px rgba(0, 0, 0, 0.4), 0 0 0 4px rgba(16, 185, 129, 0.25)',
                position: 'relative'
              }}
            >
              {isScanning ? (
                <RefreshCw size={28} color="#0D9488" className="animate-spin" />
              ) : (
                <Scan size={30} color="#0F172A" strokeWidth={2.4} />
              )}
            </motion.button>
            <span style={{ color: '#FFFFFF', fontSize: '11px', fontWeight: 700, letterSpacing: '0.3px' }}>
              {isScanning ? 'Scanning...' : 'Capture'}
            </span>
          </div>

          {/* Right: Camera Flip Button */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
            <motion.button
              type="button"
              whileTap={{ scale: 0.9 }}
              onClick={handleToggleFacingMode}
              aria-label="Switch between front and back camera"
              title="Flip Camera"
              style={{
                width: '50px',
                height: '50px',
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.18)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                border: '1.5px solid rgba(255, 255, 255, 0.3)',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                cursor: 'pointer',
                color: '#FFFFFF',
                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)'
              }}
            >
              <RefreshCw size={20} />
            </motion.button>
            <span style={{ color: 'rgba(255, 255, 255, 0.85)', fontSize: '10.5px', fontWeight: 600, letterSpacing: '0.2px' }}>
              Flip
            </span>
          </div>
        </div>
      )}
    </div>,
    document.body
  );
};
