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

const NutritionMatrixCell = ({
  title,
  value,
  unit,
  target,
  color,
  percent
}: {
  title: string;
  value: string | number;
  unit: string;
  target?: string;
  color: string;
  percent?: number;
}) => {
  const radius = 18;
  const circumference = 2 * Math.PI * radius;
  const p = percent !== undefined ? Math.min(Math.max(percent, 0), 1) : 0;
  const offset = circumference - p * circumference;

  return (
    <div style={{
      background: '#F8FAFC',
      border: '1px solid #E2E8F0',
      borderRadius: '18px',
      padding: '10px 4px 9px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)',
      boxSizing: 'border-box',
      minWidth: 0,
      width: '100%'
    }}>
      <span style={{ fontSize: '11px', fontWeight: 700, color: '#475569', letterSpacing: '-0.2px', marginBottom: '4px', textAlign: 'center', whiteSpace: 'nowrap' }}>
        {title}
      </span>
      <div style={{ position: 'relative', width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width="48" height="48" viewBox="0 0 48 48" style={{ transform: 'rotate(-90deg)', overflow: 'visible' }}>
          <circle cx="24" cy="24" r={radius} fill="none" stroke={color} strokeWidth="3.6" strokeOpacity="0.18" />
          {percent !== undefined && (
            <circle
              cx="24"
              cy="24"
              r={radius}
              fill="none"
              stroke={color}
              strokeWidth="3.6"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              strokeLinecap="round"
              style={{ transition: 'stroke-dashoffset 0.6s cubic-bezier(0.4, 0, 0.2, 1)' }}
            />
          )}
        </svg>
        <div style={{ position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', maxWidth: '38px', textAlign: 'center' }}>
          <span style={{ fontSize: typeof value === 'string' && value.length > 3 ? '11px' : '13px', fontWeight: 800, color: '#0F172A', lineHeight: '1' }}>
            {value}
          </span>
          <span style={{ fontSize: '7.5px', color: '#64748B', fontWeight: 700, marginTop: '2px', textTransform: 'uppercase', letterSpacing: '0.2px' }}>
            {unit}
          </span>
        </div>
      </div>
      {target && (
        <span style={{ fontSize: '8.5px', color: '#64748B', fontWeight: 600, marginTop: '3px', whiteSpace: 'nowrap', opacity: 0.9 }}>
          {target}
        </span>
      )}
    </div>
  );
};

export const ARGroceryLens = ({ onClose, onLogFood }: { onClose: () => void, onLogFood?: (food: any) => void }) => {
  const navigate = useNavigate();
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [isScanning, setIsScanning] = useState(false);
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
            if (videoRef.current) {
              videoRef.current.pause();
            }
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
            if (videoRef.current) {
              videoRef.current.pause();
            }
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
          if (videoRef.current) {
            videoRef.current.pause();
          }
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
        if (videoRef.current) {
          videoRef.current.pause();
        }
        setScanError({
          title: 'Camera View is Too Dark',
          message: 'The captured frame is too dark to analyze food or labels. Please aim directly at your meal or nutrition panel in good lighting.'
        });
        triggerHapticWarning();
        setShowResults(true);
        return;
      }
      
      const result = await analyzeFoodImage(base64, profile);
      if (videoRef.current) {
        videoRef.current.pause();
      }

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
      if (videoRef.current) {
        videoRef.current.pause();
      }
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
              background: '#F8FAFC',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden'
            }}
          >
            {/* Pristine White Clinical Header */}
            <header style={{
              flexShrink: 0,
              paddingTop: 'max(14px, env(safe-area-inset-top, 14px))',
              paddingBottom: '12px',
              paddingLeft: '16px',
              paddingRight: '16px',
              background: '#FFFFFF',
              borderBottom: '1px solid #E2E8F0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)',
              zIndex: 10
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => {
                    triggerHapticLight();
                    handleResumeCamera();
                    setShowResults(false);
                    setAnalysis(null);
                    setActiveTab('scanned');
                  }}
                  aria-label="Back to Camera Scanner"
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '50%',
                    border: '1px solid #E2E8F0',
                    background: '#F8FAFC',
                    color: '#334155',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer'
                  }}
                >
                  <ArrowLeft size={18} />
                </button>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.3px' }}>
                      Clinical Food Intelligence
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '1px' }}>
                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10B981', boxShadow: '0 0 6px #10B981' }} />
                    <span style={{ fontSize: '10.5px', color: '#64748B', fontWeight: 600 }}>
                      {analysis?.scrapedSource || 'CPG Catalog & Open Food Index'}
                    </span>
                  </div>
                </div>
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

            {/* Scrollable Single-Page Body */}
            <div style={{
              flex: 1,
              overflowY: 'auto',
              WebkitOverflowScrolling: 'touch',
              padding: '16px 16px 130px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
              maxWidth: '640px',
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
                const topAlternative = analysis?.betterAlternatives?.[0] || (analysis?.betterAlternative ? {
                  name: analysis.betterAlternative.name,
                  reason: analysis.betterAlternative.reason,
                  swapType: 'whole_food' as const,
                  satisfactionMatch: 'Satisfies sensory craving with clean metabolic fuel',
                  estimatedCalories: Math.round((analysis.calories ?? 200) * 0.7),
                  protein: Math.round(((analysis.protein ?? 8) * 1.1) * 10) / 10,
                  carbs: Math.round(((analysis.carbs ?? 16) * 0.5) * 10) / 10,
                  fats: Math.round(((analysis.fats ?? 14) * 0.6) * 10) / 10,
                  sugar: Math.max(0.5, Math.round(((analysis.sugar ?? 2) * 0.4) * 10) / 10),
                  fibre: Math.max(3, Math.round(((analysis.fibre ?? 2) * 2) * 10) / 10),
                  sodium: Math.round((analysis.sodium ?? 350) * 0.35)
                } : null);

                const isViewingAlt = activeTab === 'alternative' && topAlternative !== null;

                const displayedFood = isViewingAlt ? {
                  name: topAlternative.name,
                  brand: 'Clinically Superior Swap',
                  servingSize: '1 standard portion',
                  calories: topAlternative.estimatedCalories ?? Math.round((analysis?.calories ?? 200) * 0.7),
                  protein: topAlternative.protein ?? Math.round(((analysis?.protein ?? 8) * 1.1) * 10) / 10,
                  carbs: topAlternative.carbs ?? Math.round(((analysis?.carbs ?? 16) * 0.5) * 10) / 10,
                  fats: topAlternative.fats ?? Math.round(((analysis?.fats ?? 14) * 0.6) * 10) / 10,
                  sugar: topAlternative.sugar ?? Math.max(0.5, Math.round(((analysis?.sugar ?? 2) * 0.4) * 10) / 10),
                  fibre: topAlternative.fibre ?? Math.max(3, Math.round(((analysis?.fibre ?? 2) * 2) * 10) / 10),
                  sodium: topAlternative.sodium ?? Math.round((analysis?.sodium ?? 350) * 0.35),
                  novaGrade: topAlternative.swapType === 'whole_food' ? (1 as const) : (2 as const),
                  nutriScore: 'A' as const,
                  glycemicImpact: 'Low' as const,
                  verdictHeadline: 'Clinically Optimal Swap',
                  clinicalRationale: topAlternative.reason,
                  isCaution: false
                } : {
                  name: analysis?.foodName || 'Identified Food',
                  brand: analysis?.brand,
                  servingSize: analysis?.servingSize || '1 pack',
                  calories: Math.round(analysis?.calories ?? 0),
                  protein: Math.round((analysis?.protein ?? 0) * 10) / 10,
                  carbs: Math.round((analysis?.carbs ?? 0) * 10) / 10,
                  fats: Math.round((analysis?.fats ?? 0) * 10) / 10,
                  sugar: Math.round((analysis?.sugar ?? 0) * 10) / 10,
                  fibre: Math.round((analysis?.fibre ?? 0) * 10) / 10,
                  sodium: analysis?.sodium ?? (analysis?.warning?.toLowerCase().includes('sodium') ? 380 : 160),
                  novaGrade: analysis?.novaGrade ?? (analysis?.warning ? 4 : 2),
                  nutriScore: analysis?.nutriScore || (analysis?.healthVerdict === 'clean_choice' ? 'A' : analysis?.healthVerdict === 'moderate_treat' ? 'C' : 'D'),
                  glycemicImpact: analysis?.glycemicImpact || (analysis?.healthVerdict === 'caution_swap_recommended' ? 'High' : 'Moderate'),
                  verdictHeadline: analysis?.verdictHeadline || (analysis?.healthVerdict === 'caution_swap_recommended' ? 'Ultra-Processed · Swap Recommended' : 'Clean Whole-Food Fuel'),
                  clinicalRationale: analysis?.clinicalRationale || analysis?.warning || 'Nutritional breakdown estimated from visual CPG recognition.',
                  isCaution: analysis?.healthVerdict === 'caution_swap_recommended' || !!analysis?.warning
                };

                const netCarbs = Math.max(0, Math.round((displayedFood.carbs - displayedFood.fibre) * 10) / 10);

                return (
                  <>
                    {/* View Switcher: Original vs Swap */}
                    {topAlternative && (
                      <div style={{
                        display: 'flex',
                        background: '#E2E8F0',
                        padding: '3px',
                        borderRadius: '14px',
                        gap: '3px'
                      }}>
                        <button
                          type="button"
                          onClick={() => { triggerHapticLight(); setActiveTab('scanned'); }}
                          style={{
                            flex: 1,
                            padding: '8px 10px',
                            borderRadius: '11px',
                            border: 'none',
                            background: activeTab === 'scanned' ? '#FFFFFF' : 'transparent',
                            color: activeTab === 'scanned' ? '#0F172A' : '#64748B',
                            fontSize: '12px',
                            fontWeight: activeTab === 'scanned' ? 800 : 600,
                            boxShadow: activeTab === 'scanned' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}
                        >
                          Scanned: {analysis?.foodName || 'Item'}
                        </button>
                        <button
                          type="button"
                          onClick={() => { triggerHapticLight(); setActiveTab('alternative'); }}
                          style={{
                            flex: 1,
                            padding: '8px 10px',
                            borderRadius: '11px',
                            border: 'none',
                            background: activeTab === 'alternative' ? '#059669' : 'transparent',
                            color: activeTab === 'alternative' ? '#FFFFFF' : '#64748B',
                            fontSize: '12px',
                            fontWeight: activeTab === 'alternative' ? 800 : 600,
                            boxShadow: activeTab === 'alternative' ? '0 2px 6px rgba(5,150,105,0.25)' : 'none',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '4px',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}
                        >
                          <Sparkles size={13} /> Swap: {topAlternative.name}
                        </button>
                      </div>
                    )}

                    {/* Product Identity Hero Card */}
                    <div style={{
                      background: '#FFFFFF',
                      borderRadius: '24px',
                      padding: '18px',
                      border: '1px solid #E2E8F0',
                      boxShadow: '0 4px 16px -2px rgba(15, 23, 42, 0.05)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                        <div>
                          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.4px', lineHeight: 1.25 }}>
                            {displayedFood.name}
                          </h2>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px', flexWrap: 'wrap' }}>
                            {displayedFood.brand && (
                              <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#475569', background: '#F1F5F9', padding: '2px 8px', borderRadius: '6px' }}>
                                {displayedFood.brand}
                              </span>
                            )}
                            <span style={{ fontSize: '11.5px', color: '#64748B', fontWeight: 500 }}>
                              {displayedFood.servingSize}
                            </span>
                          </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px', flexShrink: 0 }}>
                          <span style={{
                            padding: '4px 11px',
                            borderRadius: '999px',
                            background: isViewingAlt ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.1)',
                            border: `1px solid ${isViewingAlt ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.25)'}`,
                            color: isViewingAlt ? '#059669' : '#DC2626',
                            fontSize: '13px',
                            fontWeight: 800,
                            whiteSpace: 'nowrap'
                          }}>
                            {displayedFood.calories} kcal
                          </span>
                        </div>
                      </div>

                      {/* Classification Badges: NOVA, NutriScore, Glycemic Load */}
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '11px',
                          fontWeight: 800,
                          padding: '4px 10px',
                          borderRadius: '8px',
                          background: displayedFood.novaGrade >= 4 ? '#FFE4E6' : displayedFood.novaGrade === 3 ? '#FEF3C7' : '#DCFCE7',
                          color: displayedFood.novaGrade >= 4 ? '#E11D48' : displayedFood.novaGrade === 3 ? '#D97706' : '#15803D',
                          border: `1px solid ${displayedFood.novaGrade >= 4 ? '#FECDD3' : displayedFood.novaGrade === 3 ? '#FDE68A' : '#BBF7D0'}`
                        }}>
                          ● NOVA {displayedFood.novaGrade} · {displayedFood.novaGrade >= 4 ? 'Ultra-Processed' : displayedFood.novaGrade === 3 ? 'Processed' : 'Whole / Minimal'}
                        </span>

                        {displayedFood.nutriScore && (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '11px',
                            fontWeight: 800,
                            padding: '4px 10px',
                            borderRadius: '8px',
                            background: ['A', 'B'].includes(displayedFood.nutriScore) ? '#DCFCE7' : displayedFood.nutriScore === 'C' ? '#FEF3C7' : '#FEE2E2',
                            color: ['A', 'B'].includes(displayedFood.nutriScore) ? '#15803D' : displayedFood.nutriScore === 'C' ? '#D97706' : '#DC2626',
                            border: `1px solid ${['A', 'B'].includes(displayedFood.nutriScore) ? '#BBF7D0' : displayedFood.nutriScore === 'C' ? '#FDE68A' : '#FECDD3'}`
                          }}>
                            Nutri-Score {displayedFood.nutriScore}
                          </span>
                        )}

                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '4px 9px',
                          borderRadius: '8px',
                          background: '#F0FDFA',
                          color: '#0F766E',
                          border: '1px solid #CCFBF1'
                        }}>
                          Glycemic Load: {displayedFood.glycemicImpact}
                        </span>
                      </div>

                      {/* Clinical Health Verdict Banner */}
                      <div style={{
                        background: displayedFood.isCaution ? 'rgba(254, 242, 242, 0.9)' : 'rgba(240, 253, 244, 0.9)',
                        border: `1px solid ${displayedFood.isCaution ? '#FECDD3' : '#BBF7D0'}`,
                        borderRadius: '16px',
                        padding: '12px 14px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {displayedFood.isCaution ? (
                            <AlertTriangle size={15} color="#DC2626" style={{ flexShrink: 0 }} />
                          ) : (
                            <CheckCircle2 size={15} color="#16A34A" style={{ flexShrink: 0 }} />
                          )}
                          <span style={{
                            fontSize: '12px',
                            fontWeight: 800,
                            color: displayedFood.isCaution ? '#B91C1C' : '#15803D',
                            letterSpacing: '0.2px'
                          }}>
                            {displayedFood.verdictHeadline}
                          </span>
                        </div>
                        {displayedFood.clinicalRationale && (
                          <p style={{ margin: 0, fontSize: '12px', color: '#475569', lineHeight: 1.45 }}>
                            {displayedFood.clinicalRationale}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Executive 3x3 Nutrition Matrix Card */}
                    <div style={{
                      background: '#FFFFFF',
                      borderRadius: '24px',
                      padding: '18px 14px',
                      border: '1px solid #E2E8F0',
                      boxShadow: '0 4px 16px -2px rgba(15, 23, 42, 0.05)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '13px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.2px' }}>
                          Clinical Nutrient Composition
                        </span>
                        <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>
                          {displayedFood.servingSize}
                        </span>
                      </div>

                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(3, 1fr)',
                        gap: '8px',
                        width: '100%',
                        boxSizing: 'border-box'
                      }}>
                        {/* Row 1: Energy & Core Fuel */}
                        <NutritionMatrixCell
                          title="Calories"
                          value={displayedFood.calories}
                          unit="kcal"
                          target={`Goal ${targetCalories}`}
                          color="#EF4444"
                          percent={targetCalories > 0 ? displayedFood.calories / targetCalories : 0}
                        />
                        <NutritionMatrixCell
                          title="Protein"
                          value={displayedFood.protein}
                          unit="g"
                          target={`Goal ${targetProtein}g`}
                          color="#10B981"
                          percent={targetProtein > 0 ? displayedFood.protein / targetProtein : 0}
                        />
                        <NutritionMatrixCell
                          title="Carbs"
                          value={displayedFood.carbs}
                          unit="g"
                          target={`Goal ${targetCarbs}g`}
                          color="#3B82F6"
                          percent={targetCarbs > 0 ? displayedFood.carbs / targetCarbs : 0}
                        />

                        {/* Row 2: Lipids, Sugar & Fiber */}
                        <NutritionMatrixCell
                          title="Fats"
                          value={displayedFood.fats}
                          unit="g"
                          target={`Goal ${targetFats}g`}
                          color="#F59E0B"
                          percent={targetFats > 0 ? displayedFood.fats / targetFats : 0}
                        />
                        <NutritionMatrixCell
                          title="Sugar"
                          value={displayedFood.sugar}
                          unit="g"
                          target={`Limit ${targetSugar}g`}
                          color="#E879F9"
                          percent={targetSugar > 0 ? displayedFood.sugar / targetSugar : 0}
                        />
                        <NutritionMatrixCell
                          title="Fibre"
                          value={displayedFood.fibre}
                          unit="g"
                          target={`Goal ${targetFibre}g`}
                          color="#8B5CF6"
                          percent={targetFibre > 0 ? displayedFood.fibre / targetFibre : 0}
                        />

                        {/* Row 3: Clinical Bio-Metrics & Processing */}
                        <NutritionMatrixCell
                          title="Net Carbs"
                          value={netCarbs}
                          unit="g"
                          target="Active Load"
                          color="#06B6D4"
                          percent={targetCarbs > 0 ? netCarbs / targetCarbs : 0}
                        />
                        <NutritionMatrixCell
                          title="Sodium"
                          value={displayedFood.sodium}
                          unit="mg"
                          target="Limit 2g"
                          color="#F43F5E"
                          percent={displayedFood.sodium / 2000}
                        />
                        <NutritionMatrixCell
                          title="Processing"
                          value={displayedFood.novaGrade}
                          unit="NOVA"
                          target={displayedFood.novaGrade >= 4 ? 'Ultra-Proc' : displayedFood.novaGrade <= 1 ? 'Whole Food' : 'Moderate'}
                          color={displayedFood.novaGrade >= 4 ? '#E11D48' : displayedFood.novaGrade <= 2 ? '#0D9488' : '#F59E0B'}
                          percent={displayedFood.novaGrade / 4}
                        />
                      </div>
                    </div>

                    {/* Clinically Superior Alternative Card (With Working Arrow & One-Tap Swap!) */}
                    {topAlternative && (
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => {
                          triggerHapticLight();
                          setActiveTab(prev => prev === 'scanned' ? 'alternative' : 'scanned');
                        }}
                        style={{
                          background: isViewingAlt
                            ? 'linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 100%)'
                            : 'linear-gradient(135deg, #FFFFFF 0%, #F0FDFA 100%)',
                          borderRadius: '22px',
                          padding: '16px 18px',
                          border: isViewingAlt ? '2px solid #10B981' : '1.5px solid #A7F3D0',
                          boxShadow: '0 6px 20px -2px rgba(13, 148, 136, 0.12)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '14px',
                          cursor: 'pointer',
                          transition: 'all 0.25s ease'
                        }}
                      >
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
                            <Sparkles size={13} color="#059669" />
                            <span style={{ fontSize: '10.5px', fontWeight: 800, color: '#059669', letterSpacing: '0.4px', textTransform: 'uppercase' }}>
                              {isViewingAlt ? 'Active Swap Selected' : 'Option to Consider · AI Suggestion'}
                            </span>
                          </div>
                          <div style={{ fontSize: '15.5px', fontWeight: 800, color: '#0F172A', lineHeight: 1.25 }}>
                            {topAlternative.name}
                          </div>
                          <div style={{ fontSize: '12px', color: '#475569', marginTop: '3px', lineHeight: 1.4 }}>
                            {topAlternative.reason}
                          </div>
                          {topAlternative.satisfactionMatch && (
                            <div style={{ fontSize: '11px', color: '#059669', fontWeight: 600, marginTop: '4px' }}>
                              💡 {topAlternative.satisfactionMatch}
                            </div>
                          )}
                        </div>

                        {/* Interactive Arrow & Toggle Button */}
                        <div
                          aria-label={isViewingAlt ? 'Switch back to scanned' : 'Swap to alternative'}
                          style={{
                            width: '38px',
                            height: '38px',
                            borderRadius: '19px',
                            background: isViewingAlt ? '#059669' : '#10B981',
                            color: '#FFFFFF',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            boxShadow: '0 4px 12px rgba(16, 185, 129, 0.35)',
                            transform: isViewingAlt ? 'rotate(180deg)' : 'none',
                            transition: 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
                          }}
                        >
                          <ArrowRight size={18} strokeWidth={2.5} />
                        </div>
                      </div>
                    )}

                    {/* Scraped Ingredients & Additives Section (The "Web Scraping" depth!) */}
                    <div style={{
                      background: '#FFFFFF',
                      borderRadius: '24px',
                      padding: '18px',
                      border: '1px solid #E2E8F0',
                      boxShadow: '0 4px 16px -2px rgba(15, 23, 42, 0.05)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                          <Layers size={16} color="#0D9488" />
                          <span style={{ fontSize: '14px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.2px' }}>
                            Scraped Ingredients & Additives
                          </span>
                        </div>
                        <span style={{ fontSize: '10.5px', color: '#64748B', fontWeight: 700, background: '#F1F5F9', padding: '3px 8px', borderRadius: '6px' }}>
                          Web Verified
                        </span>
                      </div>

                      {/* Scraped Ingredients List */}
                      <div style={{ background: '#F8FAFC', padding: '12px 14px', borderRadius: '16px', border: '1px solid #F1F5F9' }}>
                        <span style={{ fontSize: '10px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.4px', display: 'block', marginBottom: '6px' }}>
                          Declared Ingredients
                        </span>
                        <p style={{ margin: 0, fontSize: '12px', color: '#334155', lineHeight: 1.55 }}>
                          {analysis?.ingredientsSummary || (analysis?.ingredientsList && analysis.ingredientsList.length > 0
                            ? analysis.ingredientsList.join(', ')
                            : 'Whole food composition without packaged industrial additives.')}
                        </p>
                      </div>

                      {/* Chemical Additives & E-Numbers / INS codes */}
                      {analysis?.additives && analysis.additives.length > 0 && (
                        <div>
                          <span style={{ fontSize: '11px', fontWeight: 800, color: '#475569', display: 'block', marginBottom: '8px' }}>
                            Identified Additives & Preservatives ({analysis.additives.length})
                          </span>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {analysis.additives.map((additive, idx) => (
                              <div key={idx} style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '7px 10px',
                                borderRadius: '10px',
                                background: additive.riskLevel === 'high' ? '#FFF1F2' : additive.riskLevel === 'moderate' ? '#FEFCE8' : '#F0FDF4',
                                border: `1px solid ${additive.riskLevel === 'high' ? '#FECDD3' : additive.riskLevel === 'moderate' ? '#FEF08A' : '#DCFCE7'}`
                              }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <span style={{ fontSize: '11px', fontWeight: 800, color: '#0F172A' }}>
                                    {additive.code}
                                  </span>
                                  <span style={{ fontSize: '11.5px', color: '#475569' }}>
                                    · {additive.name} ({additive.purpose})
                                  </span>
                                </div>
                                <span style={{
                                  fontSize: '10px',
                                  fontWeight: 800,
                                  padding: '2px 7px',
                                  borderRadius: '999px',
                                  background: additive.riskLevel === 'high' ? '#E11D48' : additive.riskLevel === 'moderate' ? '#D97706' : '#16A34A',
                                  color: '#FFFFFF'
                                }}>
                                  {additive.riskLevel === 'high' ? 'High Risk' : additive.riskLevel === 'moderate' ? 'Moderate' : 'Safe'}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Allergens & Red Flags */}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', paddingTop: '4px' }}>
                        {analysis?.allergens && analysis.allergens.map((allergen, idx) => (
                          <span key={`alg-${idx}`} style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '4px 9px',
                            borderRadius: '8px',
                            background: '#FFF7ED',
                            color: '#C2410C',
                            border: '1px solid #FFEDD5'
                          }}>
                            ⚠️ {allergen}
                          </span>
                        ))}
                        {analysis?.flags && analysis.flags.map((flag, idx) => (
                          <span key={`flg-${idx}`} style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '4px 9px',
                            borderRadius: '8px',
                            background: '#FEF2F2',
                            color: '#DC2626',
                            border: '1px solid #FEE2E2'
                          }}>
                            ⛔ {flag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>

            {/* Fixed Bottom Action Deck (No Ava Button!) */}
            <div style={{
              position: 'fixed',
              bottom: 0,
              left: 0,
              right: 0,
              background: 'rgba(255, 255, 255, 0.96)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              borderTop: '1px solid #E2E8F0',
              paddingTop: '12px',
              paddingBottom: 'max(14px, env(safe-area-inset-bottom, 14px))',
              paddingLeft: '16px',
              paddingRight: '16px',
              zIndex: 60,
              boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.05)'
            }}>
              <div style={{
                display: 'flex',
                gap: '10px',
                maxWidth: '640px',
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
                  const topAlternative = analysis?.betterAlternatives?.[0] || (analysis?.betterAlternative ? {
                    name: analysis.betterAlternative.name,
                    reason: analysis.betterAlternative.reason,
                    swapType: 'whole_food' as const,
                    satisfactionMatch: 'Satisfies sensory craving with clean metabolic fuel',
                    estimatedCalories: Math.round((analysis.calories ?? 200) * 0.7),
                    protein: Math.round(((analysis.protein ?? 8) * 1.1) * 10) / 10,
                    carbs: Math.round(((analysis.carbs ?? 16) * 0.5) * 10) / 10,
                    fats: Math.round(((analysis.fats ?? 14) * 0.6) * 10) / 10,
                    sugar: Math.max(0.5, Math.round(((analysis.sugar ?? 2) * 0.4) * 10) / 10),
                    fibre: Math.max(3, Math.round(((analysis.fibre ?? 2) * 2) * 10) / 10),
                    sodium: Math.round((analysis.sodium ?? 350) * 0.35)
                  } : null);

                  const isViewingAlt = activeTab === 'alternative' && topAlternative !== null;
                  const logFoodName = isViewingAlt ? topAlternative.name : analysis.foodName;
                  const logCalories = isViewingAlt ? (topAlternative.estimatedCalories ?? Math.round((analysis.calories ?? 200) * 0.7)) : analysis.calories;
                  const logProtein = isViewingAlt ? (topAlternative.protein ?? analysis.protein) : analysis.protein;
                  const logCarbs = isViewingAlt ? (topAlternative.carbs ?? analysis.carbs) : analysis.carbs;
                  const logFats = isViewingAlt ? (topAlternative.fats ?? analysis.fats) : analysis.fats;
                  const logSugar = isViewingAlt ? (topAlternative.sugar ?? analysis.sugar) : analysis.sugar;
                  const logFibre = isViewingAlt ? (topAlternative.fibre ?? analysis.fibre) : analysis.fibre;
                  const logSodium = isViewingAlt ? (topAlternative.sodium ?? analysis.sodium) : analysis.sodium;

                  return (
                    <button
                      type="button"
                      onClick={() => {
                        triggerHapticSuccess();
                        onLogFood({
                          name: logFoodName,
                          calories: logCalories,
                          protein: logProtein,
                          carbs: logCarbs,
                          fat: logFats,
                          sugar: logSugar,
                          fibre: logFibre,
                          sodium: logSodium,
                          type: 'Snack'
                        });
                        handleClose();
                      }}
                      style={{
                        flex: 1.8,
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
                      Log {logFoodName.length > 18 ? `${logFoodName.slice(0, 16)}...` : logFoodName}
                    </button>
                  );
                })()}
              </div>
            </div>
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
