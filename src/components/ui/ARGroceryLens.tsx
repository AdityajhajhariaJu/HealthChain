import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, X, Zap, ArrowLeft, ArrowRight, Scan, AlertTriangle, Image as ImageIcon, Upload, RefreshCw, Sparkles, CheckCircle2, Layers, ShieldCheck } from 'lucide-react';
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

export interface NormalizedNutrition {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  sugar: number;
  fibre: number;
  sodium: number;
  servingSize: string;
  packSizeNote?: string;
  warning?: string | null;
  subtitle?: string;
}

export function normalizeNutritionTo100g(food: {
  foodName?: string;
  name?: string;
  servingSize?: string;
  calories?: number;
  estimatedCalories?: number;
  protein?: number;
  carbs?: number;
  fats?: number;
  sugar?: number;
  fibre?: number;
  sodium?: number;
  warning?: string | null;
  subtitle?: string;
}): NormalizedNutrition {
  const name = food.foodName || food.name || 'Identified Food';
  const rawCalories = Number(food.calories ?? food.estimatedCalories ?? 0);
  const rawProtein = Number(food.protein ?? 0);
  const rawCarbs = Number(food.carbs ?? 0);
  const rawFats = Number(food.fats ?? 0);
  const rawSugar = Number(food.sugar ?? 0);
  const rawFibre = Number(food.fibre ?? 0);
  const rawSodium = Number(food.sodium ?? 0);

  const serving = (food.servingSize || '').trim();
  const lowerServing = serving.toLowerCase();

  // Determine scaling factor to 100g
  let factor = 1.0;
  let packWeightGrams: number | null = null;

  // Check if serving string is already normalized to 100g
  const isAlreadyPer100g = lowerServing.includes('per 100g') || 
                           lowerServing.includes('per 100 g') || 
                           lowerServing.includes('/ 100g') ||
                           lowerServing.includes('/100g') ||
                           lowerServing.includes('100g mark') ||
                           lowerServing.includes('100 g mark');

  if (!isAlreadyPer100g) {
    // If not explicitly per 100g, look for explicit pack gram weight like (60g), 40g, 55 gms, etc.
    const gramMatch = lowerServing.match(/(\d+(?:\.\d+)?)\s*(?:g|gm|gms|gram|grams)\b/i);
    if (gramMatch) {
      const parsedGrams = parseFloat(gramMatch[1]);
      if (parsedGrams > 0 && parsedGrams !== 100) {
        packWeightGrams = parsedGrams;
        factor = 100 / parsedGrams;
      }
    }
  } else {
    // If it is per 100g, check if pack size is noted inside parentheses (e.g., "(Pack size: 60g)")
    const packMatch = lowerServing.match(/pack size:?\s*(\d+(?:\.\d+)?)\s*g/i);
    if (packMatch) {
      packWeightGrams = parseFloat(packMatch[1]);
    }
  }

  // Cap factor within safe bounds (0.1x to 10x)
  const safeFactor = Math.min(Math.max(factor, 0.1), 10);

  const calories = Math.round(rawCalories * safeFactor);
  const protein = Math.round(rawProtein * safeFactor * 10) / 10;
  const carbs = Math.round(rawCarbs * safeFactor * 10) / 10;
  const fats = Math.round(rawFats * safeFactor * 10) / 10;
  const sugar = Math.round(rawSugar * safeFactor * 10) / 10;
  const fibre = Math.round(rawFibre * safeFactor * 10) / 10;
  const sodium = Math.round(rawSodium * safeFactor);

  const packSizeNote = packWeightGrams 
    ? `Pack: ${packWeightGrams}g` 
    : (serving && !isAlreadyPer100g ? `Portion: ${serving}` : undefined);

  return {
    name,
    calories,
    protein,
    carbs,
    fats,
    sugar,
    fibre,
    sodium,
    servingSize: '100g',
    packSizeNote,
    warning: food.warning || null,
    subtitle: food.subtitle
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
  title: string;
  subtitle: string;
}) => {
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const percent = max > 0 ? Math.min(Math.max(value, 0) / max, 1) : 0;
  const offset = circumference - percent * circumference;

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '4px',
      flexShrink: 0,
      width: '100%',
      maxWidth: '96px'
    }}>
      <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#0F172A', letterSpacing: '-0.2px', textAlign: 'center' }}>
        {title}
      </div>
      <div style={{ position: 'relative', width: '80px', height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width="80" height="80" viewBox="0 0 80 80" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="40" cy="40" r={radius} fill="none" stroke={color} strokeWidth="6" strokeOpacity="0.18" />
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
        <div style={{ position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
          <span style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', lineHeight: '1.2' }}>
            {Math.round(value * 10) / 10}
          </span>
          <span style={{ fontSize: '10px', color: '#64748B', fontWeight: 600 }}>
            {subtitle}
          </span>
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
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [shutterFlash, setShutterFlash] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [activeTab, setActiveTab] = useState<'scanned' | 'alternative'>('scanned');
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

    return () => {
      isCancelled = true;
      document.body.classList.remove('lens-active');
      document.body.style.overflow = '';
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
            setCapturedPhoto(base64);
            if (videoRef.current) {
              videoRef.current.pause();
            }

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

  const handleResumeCamera = () => {
    setCapturedPhoto(null);
    setIsScanning(false);
    if (videoRef.current && stream) {
      videoRef.current.play().catch(() => {});
    }
  };

  const handleScan = async () => {
    if (!videoRef.current) return;
    
    if (!videoRef.current.videoWidth || !videoRef.current.videoHeight) {
      setCameraError("Camera is still warming up. Please wait a moment and try scanning again.");
      return;
    }
    
    triggerHapticLight();
    setCameraError(null);
    setScanError(null);
    
    try {
      // 1. Instant snapshot from current camera video frame
      const { base64, canvas } = compressCanvas(
        videoRef.current,
        videoRef.current.videoWidth,
        videoRef.current.videoHeight,
        1024
      );

      // 2. Immediate tactile shutter flash & photo freeze
      // User does NOT need to hold the camera steady anymore; photo is already clicked!
      setShutterFlash(true);
      setTimeout(() => setShutterFlash(false), 220);
      setCapturedPhoto(base64);
      setIsScanning(true);
      if (videoRef.current) {
        videoRef.current.pause();
      }

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
    setCapturedPhoto(null);
    setIsScanning(false);
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

      {/* Instant Frozen Snapshot Preview while analyzing */}
      {capturedPhoto && !showResults && (
        <img
          src={capturedPhoto}
          alt="Captured food snapshot"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            zIndex: 1
          }}
        />
      )}

      {/* Tactile Shutter White Flash */}
      <AnimatePresence>
        {shutterFlash && (
          <motion.div
            initial={{ opacity: 0.85 }}
            animate={{ opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            style={{
              position: 'absolute',
              inset: 0,
              background: '#FFFFFF',
              zIndex: 35,
              pointerEvents: 'none'
            }}
          />
        )}
      </AnimatePresence>

      {/* Header - Camera Mode Only */}
      {!showResults && (
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
          zIndex: 40,
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
      )}

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
            {isScanning ? 'Snapshot captured · Analyzing nutrition...' : 'Scan packaged food, labels, or meals'}
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
            {isScanning ? 'Snapshot Locked · Analyzing...' : 'Align Item Inside'}
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

      {/* Pristine White Single-Page Clinical Results View */}
      <AnimatePresence>
        {showResults && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            style={{
              position: 'absolute',
              inset: 0,
              zIndex: 50,
              background: '#FFFFFF',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              height: '100%',
              width: '100%'
            }}
          >
            {/* Pristine White Header */}
            <header style={{
              flexShrink: 0,
              paddingTop: 'max(14px, env(safe-area-inset-top, 14px))',
              paddingBottom: '12px',
              paddingLeft: '20px',
              paddingRight: '20px',
              background: '#FFFFFF',
              borderBottom: '1px solid #E2E8F0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              zIndex: 10
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ background: '#10B981', width: '8px', height: '8px', borderRadius: '50%', boxShadow: '0 0 8px #10B981' }} />
                <span style={{ color: '#0F172A', fontWeight: 800, fontSize: '13.5px', letterSpacing: '0.6px', textTransform: 'uppercase' }}>
                  Clinical Lens
                </span>
              </div>

              <button
                type="button"
                aria-label="Close Clinical Lens"
                onClick={handleClose}
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  border: '1px solid #E2E8F0',
                  background: '#F8FAFC',
                  color: '#64748B',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer'
                }}
              >
                <X size={18} />
              </button>
            </header>

            {/* Scrollable Single-Page Body with Native Inertia & Pan-Y Touch Action */}
            <div style={{
              flex: '1 1 0%',
              minHeight: 0,
              overflowY: 'auto',
              WebkitOverflowScrolling: 'touch',
              touchAction: 'pan-y',
              overscrollBehaviorY: 'contain',
              padding: '14px 16px 20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              maxWidth: '520px',
              margin: '0 auto',
              width: '100%',
              boxSizing: 'border-box'
            }}>
              {/* Non-Detection / Scan Error Card */}
              {scanError ? (
                <div style={{
                  background: '#FFFFFF',
                  borderRadius: '24px',
                  padding: '32px 20px',
                  border: '1px solid #E2E8F0',
                  boxShadow: '0 4px 16px -2px rgba(15, 23, 42, 0.05)',
                  textAlign: 'center'
                }}>
                  <div style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '50%',
                    background: '#FEF2F2',
                    border: '1.5px solid #FCA5A5',
                    margin: '0 auto 16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#DC2626'
                  }}>
                    <AlertTriangle size={28} />
                  </div>
                  <h3 style={{ margin: '0 0 8px', fontSize: '18px', fontWeight: 800, color: '#0F172A' }}>
                    {scanError.title || 'No Food or Label Detected'}
                  </h3>
                  <p style={{ margin: '0 0 24px', fontSize: '13px', color: '#64748B', lineHeight: 1.5, maxWidth: '380px', marginLeft: 'auto', marginRight: 'auto' }}>
                    {scanError.message || 'Position the camera directly in front of the grocery item, barcode, or ingredient table.'}
                  </p>
                  <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                    <button
                      type="button"
                      onClick={() => {
                        triggerHapticLight();
                        handleResumeCamera();
                        setScanError(null);
                        setShowResults(false);
                        setAnalysis(null);
                        setActiveTab('scanned');
                      }}
                      style={{
                        padding: '13px 22px',
                        borderRadius: '16px',
                        background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                        color: '#FFFFFF',
                        border: 'none',
                        fontSize: '13.5px',
                        fontWeight: 800,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        boxShadow: '0 8px 24px rgba(16, 185, 129, 0.25)'
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
                        background: '#FFFFFF',
                        color: '#475569',
                        border: '1.5px solid #CBD5E1',
                        fontSize: '13.5px',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      Upload Photo
                    </button>
                  </div>
                </div>
              ) : analysis && (() => {
                const scannedNormalized = normalizeNutritionTo100g({
                  foodName: analysis.foodName,
                  servingSize: analysis.servingSize,
                  calories: analysis.calories,
                  protein: analysis.protein,
                  carbs: analysis.carbs,
                  fats: analysis.fats,
                  sugar: analysis.sugar,
                  fibre: analysis.fibre,
                  sodium: analysis.sodium,
                  warning: analysis.warning
                });

                const rawAlt = analysis?.betterAlternatives?.[0] || (analysis?.betterAlternative ? {
                  name: analysis.betterAlternative.name,
                  reason: analysis.betterAlternative.reason,
                  estimatedCalories: Math.round(scannedNormalized.calories * 0.7),
                  protein: Math.round(scannedNormalized.protein * 1.1 * 10) / 10,
                  carbs: Math.round(scannedNormalized.carbs * 0.5 * 10) / 10,
                  fats: Math.round(scannedNormalized.fats * 0.6 * 10) / 10,
                  sugar: Math.max(0.5, Math.round(scannedNormalized.sugar * 0.4 * 10) / 10),
                  fibre: Math.max(3, Math.round(scannedNormalized.fibre * 2 * 10) / 10),
                  sodium: Math.round((scannedNormalized.sodium ?? 350) * 0.35)
                } : null);

                const topAlternative = rawAlt ? {
                  ...normalizeNutritionTo100g({
                    name: rawAlt.name,
                    servingSize: (rawAlt as any).servingSize || '100g',
                    calories: (rawAlt as any).estimatedCalories ?? (rawAlt as any).calories ?? Math.round(scannedNormalized.calories * 0.7),
                    protein: (rawAlt as any).protein ?? Math.round(scannedNormalized.protein * 1.1 * 10) / 10,
                    carbs: (rawAlt as any).carbs ?? Math.round(scannedNormalized.carbs * 0.5 * 10) / 10,
                    fats: (rawAlt as any).fats ?? Math.round(scannedNormalized.fats * 0.6 * 10) / 10,
                    sugar: (rawAlt as any).sugar ?? Math.max(0.5, Math.round(scannedNormalized.sugar * 0.4 * 10) / 10),
                    fibre: (rawAlt as any).fibre ?? Math.max(3, Math.round(scannedNormalized.fibre * 2 * 10) / 10),
                    sodium: (rawAlt as any).sodium ?? Math.round((scannedNormalized.sodium ?? 350) * 0.35)
                  }),
                  reason: rawAlt.reason
                } : null;

                const isViewingAlt = activeTab === 'alternative' && topAlternative !== null;

                const displayedFood = isViewingAlt && topAlternative ? {
                  ...topAlternative,
                  subtitle: 'Standardized to 100g mark • Clinically superior swap · Clean fuel'
                } : {
                  ...scannedNormalized,
                  subtitle: `Standardized to 100g mark • ${scannedNormalized.packSizeNote ? `${scannedNormalized.packSizeNote} • ` : ''}AI-estimated from image.`
                };

                return (
                  <>
                    {/* The Clean Main Clinical Card */}
                    <div style={{
                      background: '#FFFFFF',
                      borderRadius: '24px',
                      padding: '16px 14px',
                      border: '1px solid #E2E8F0',
                      boxShadow: '0 4px 16px -2px rgba(15, 23, 42, 0.05)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px'
                    }}>
                      {/* Warning Banner (Clean Pink/Red Box) */}
                      {displayedFood.warning && (
                        <div style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '8px',
                          background: '#FEF2F2',
                          border: '1px solid #FECDD3',
                          borderRadius: '14px',
                          padding: '10px 12px',
                          boxSizing: 'border-box'
                        }}>
                          <AlertTriangle size={16} color="#DC2626" style={{ flexShrink: 0, marginTop: '2px' }} />
                          <span style={{ color: '#991B1B', fontSize: '12px', fontWeight: 700, lineHeight: 1.45 }}>
                            {displayedFood.warning}
                          </span>
                        </div>
                      )}

                      {/* Title & Calorie Pill on Same Line */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                        <div style={{ flex: 1 }}>
                          <h2 style={{ margin: 0, fontSize: '19px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.3px', lineHeight: 1.25 }}>
                            {displayedFood.name}
                          </h2>
                          <p style={{ margin: '3px 0 0', fontSize: '11.5px', color: '#64748B', fontWeight: 500, lineHeight: 1.35 }}>
                            {displayedFood.subtitle}
                          </p>
                        </div>

                        <div style={{
                          padding: '4px 10px',
                          borderRadius: '12px',
                          background: isViewingAlt ? '#ECFDF5' : '#FEF2F2',
                          border: `1px solid ${isViewingAlt ? '#A7F3D0' : '#FECDD3'}`,
                          color: isViewingAlt ? '#059669' : '#DC2626',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}>
                          <span style={{ fontSize: '13.5px', fontWeight: 800, lineHeight: 1.15 }}>
                            {displayedFood.calories} kcal
                          </span>
                          <span style={{ fontSize: '9px', fontWeight: 800, letterSpacing: '0.4px', textTransform: 'uppercase', opacity: 0.85 }}>
                            per 100g
                          </span>
                        </div>
                      </div>

                      {/* Section Header with Per 100g Standard Badge */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '2px 4px 0'
                      }}>
                        <span style={{ fontSize: '11.5px', fontWeight: 800, color: '#475569', letterSpacing: '0.4px', textTransform: 'uppercase' }}>
                          Nutrition Breakdown
                        </span>
                        <span style={{
                          fontSize: '10px',
                          fontWeight: 800,
                          color: '#059669',
                          background: '#ECFDF5',
                          padding: '3px 8px',
                          borderRadius: '999px',
                          border: '1px solid #A7F3D0',
                          letterSpacing: '0.3px',
                          textTransform: 'uppercase'
                        }}>
                          Per 100g Mark
                        </span>
                      </div>

                      {/* The 6 Original 80px Circular Macro Rings arranged in a 3x2 Matrix */}
                      <div style={{
                        background: '#F8FAFC',
                        borderRadius: '18px',
                        padding: '12px 6px',
                        border: '1px solid #F1F5F9',
                        display: 'grid',
                        gridTemplateColumns: 'repeat(3, 1fr)',
                        gap: '10px 4px',
                        justifyItems: 'center',
                        alignItems: 'center'
                      }}>
                        <CircularProgress
                          value={displayedFood.protein}
                          max={targetProtein}
                          color="#10B981"
                          title="Protein"
                          subtitle={`${targetProtein}g`}
                        />
                        <CircularProgress
                          value={displayedFood.carbs}
                          max={targetCarbs}
                          color="#3B82F6"
                          title="Carbs"
                          subtitle={`${targetCarbs}g`}
                        />
                        <CircularProgress
                          value={displayedFood.fats}
                          max={targetFats}
                          color="#F59E0B"
                          title="Fats"
                          subtitle={`${targetFats}g`}
                        />
                        <CircularProgress
                          value={displayedFood.sugar}
                          max={targetSugar}
                          color="#E879F9"
                          title="Sugar"
                          subtitle={`${targetSugar}g`}
                        />
                        <CircularProgress
                          value={displayedFood.fibre}
                          max={targetFibre}
                          color="#8B5CF6"
                          title="Fibre"
                          subtitle={`${targetFibre}g`}
                        />
                        <CircularProgress
                          value={displayedFood.calories}
                          max={targetCalories}
                          color="#EF4444"
                          title="Calories"
                          subtitle={`${targetCalories} kcal`}
                        />
                      </div>
                    </div>

                    {/* Better Alternative Card with Working Interactive Arrow Button */}
                    {topAlternative && (
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => {
                          triggerHapticLight();
                          setActiveTab(prev => (prev === 'scanned' ? 'alternative' : 'scanned'));
                        }}
                        style={{
                          background: isViewingAlt ? '#ECFDF5' : '#F0FDFA',
                          borderRadius: '20px',
                          padding: '14px 16px',
                          border: isViewingAlt ? '2px solid #10B981' : '1.5px solid #CCFBF1',
                          boxShadow: '0 4px 14px rgba(13, 148, 136, 0.08)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          flexShrink: 0
                        }}
                      >
                        <div style={{ flex: 1 }}>
                          <div style={{
                            fontSize: '11px',
                            fontWeight: 800,
                            color: '#059669',
                            letterSpacing: '0.4px',
                            textTransform: 'uppercase',
                            marginBottom: '3px'
                          }}>
                            {isViewingAlt ? 'ACTIVE SWAP SELECTED' : 'OPTION TO CONSIDER · AI SUGGESTION'}
                          </div>
                          <div style={{
                            fontSize: '15px',
                            fontWeight: 800,
                            color: '#0F172A',
                            lineHeight: 1.3
                          }}>
                            {topAlternative.name}
                          </div>
                          <div style={{
                            fontSize: '12px',
                            color: '#475569',
                            marginTop: '3px',
                            lineHeight: 1.4
                          }}>
                            {topAlternative.reason}
                          </div>
                        </div>

                        {/* Interactive Arrow Button */}
                        <div
                          aria-label={isViewingAlt ? 'Switch back to scanned food' : 'Switch to healthy alternative'}
                          style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '50%',
                            background: isViewingAlt ? '#10B981' : '#FFFFFF',
                            color: isViewingAlt ? '#FFFFFF' : '#059669',
                            border: isViewingAlt ? 'none' : '1.5px solid #A7F3D0',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            boxShadow: isViewingAlt ? '0 3px 10px rgba(16, 185, 129, 0.35)' : 'none',
                            transition: 'all 0.2s ease'
                          }}
                        >
                          {isViewingAlt ? (
                            <CheckCircle2 size={18} strokeWidth={2.5} />
                          ) : (
                            <ArrowRight size={17} strokeWidth={2.5} />
                          )}
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>

            {/* Pinned Bottom Action Footer (Flex sibling, never obscures content) */}
            <footer style={{
              flexShrink: 0,
              background: '#FFFFFF',
              borderTop: '1px solid #E2E8F0',
              paddingTop: '12px',
              paddingBottom: 'max(14px, env(safe-area-inset-bottom, 14px))',
              paddingLeft: '16px',
              paddingRight: '16px',
              zIndex: 20,
              boxShadow: '0 -4px 16px rgba(0, 0, 0, 0.04)'
            }}>
              <div style={{
                display: 'flex',
                gap: '10px',
                maxWidth: '520px',
                margin: '0 auto',
                width: '100%'
              }}>
                <button
                  type="button"
                  onClick={() => {
                    triggerHapticLight();
                    handleResumeCamera();
                    setShowResults(false);
                    setAnalysis(null);
                    setActiveTab('scanned');
                  }}
                  style={{
                    flex: 1,
                    background: '#FFFFFF',
                    color: '#334155',
                    border: '1.5px solid #CBD5E1',
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

                {onLogFood && analysis?.foodName && (() => {
                  const scannedNormalized = normalizeNutritionTo100g({
                    foodName: analysis.foodName,
                    servingSize: analysis.servingSize,
                    calories: analysis.calories,
                    protein: analysis.protein,
                    carbs: analysis.carbs,
                    fats: analysis.fats,
                    sugar: analysis.sugar,
                    fibre: analysis.fibre,
                    sodium: analysis.sodium,
                    warning: analysis.warning
                  });

                  const rawAlt = analysis?.betterAlternatives?.[0] || (analysis?.betterAlternative ? {
                    name: analysis.betterAlternative.name,
                    reason: analysis.betterAlternative.reason,
                    estimatedCalories: Math.round(scannedNormalized.calories * 0.7),
                    protein: Math.round(scannedNormalized.protein * 1.1 * 10) / 10,
                    carbs: Math.round(scannedNormalized.carbs * 0.5 * 10) / 10,
                    fats: Math.round(scannedNormalized.fats * 0.6 * 10) / 10,
                    sugar: Math.max(0.5, Math.round(scannedNormalized.sugar * 0.4 * 10) / 10),
                    fibre: Math.max(3, Math.round(scannedNormalized.fibre * 2 * 10) / 10),
                    sodium: Math.round((scannedNormalized.sodium ?? 350) * 0.35)
                  } : null);

                  const topAlternative = rawAlt ? {
                    ...normalizeNutritionTo100g({
                      name: rawAlt.name,
                      servingSize: (rawAlt as any).servingSize || '100g',
                      calories: (rawAlt as any).estimatedCalories ?? (rawAlt as any).calories ?? Math.round(scannedNormalized.calories * 0.7),
                      protein: (rawAlt as any).protein ?? Math.round(scannedNormalized.protein * 1.1 * 10) / 10,
                      carbs: (rawAlt as any).carbs ?? Math.round(scannedNormalized.carbs * 0.5 * 10) / 10,
                      fats: (rawAlt as any).fats ?? Math.round(scannedNormalized.fats * 0.6 * 10) / 10,
                      sugar: (rawAlt as any).sugar ?? Math.max(0.5, Math.round(scannedNormalized.sugar * 0.4 * 10) / 10),
                      fibre: (rawAlt as any).fibre ?? Math.max(3, Math.round(scannedNormalized.fibre * 2 * 10) / 10),
                      sodium: (rawAlt as any).sodium ?? Math.round((scannedNormalized.sodium ?? 350) * 0.35)
                    }),
                    reason: rawAlt.reason
                  } : null;

                  const isViewingAlt = activeTab === 'alternative' && topAlternative !== null;
                  const logFood = isViewingAlt && topAlternative ? topAlternative : scannedNormalized;

                  return (
                    <button
                      type="button"
                      onClick={() => {
                        triggerHapticSuccess();
                        onLogFood({
                          name: logFood.name,
                          calories: logFood.calories,
                          protein: logFood.protein,
                          carbs: logFood.carbs,
                          fat: logFood.fats,
                          sugar: logFood.sugar,
                          fibre: logFood.fibre,
                          sodium: logFood.sodium,
                          servingSize: '100g',
                          type: 'Snack'
                        });
                        handleClose();
                      }}
                      style={{
                        flex: 1.6,
                        background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                        color: '#FFFFFF',
                        border: 'none',
                        padding: '14px',
                        borderRadius: '16px',
                        fontSize: '14.5px',
                        fontWeight: 800,
                        cursor: 'pointer',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        gap: '8px',
                        boxShadow: '0 6px 20px rgba(16, 185, 129, 0.35)'
                      }}
                    >
                      <Scan size={17} />
                      Log {logFood.name.length > 18 ? `${logFood.name.slice(0, 16)}...` : logFood.name}
                    </button>
                  );
                })()}
              </div>
            </footer>
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
