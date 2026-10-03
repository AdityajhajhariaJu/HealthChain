import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertTriangle,
  Camera,
  Image as ImageIcon,
  RefreshCw,
  Scan,
  Sparkles,
  Upload,
  X,
} from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { FoodAnalysisResult, analyzeFoodImage } from '../../services/geminiService';
import {
  triggerHapticLight,
  triggerHapticSuccess,
  triggerHapticWarning,
} from '../../services/haptics';

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

function compressCanvas(
  imgSource: CanvasImageSource,
  origWidth: number,
  origHeight: number,
  maxDim = 1024
): { base64: string; canvas: HTMLCanvasElement } {
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
  if (!ctx) throw new Error('This browser could not process the image. Try another photo.');
  ctx.drawImage(imgSource, 0, 0, width, height);
  return {
    base64: canvas.toDataURL('image/jpeg', 0.82),
    canvas,
  };
}

export interface NormalizedNutrition {
  name: string;
  foodType: 'packaged' | 'meal';
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  sugar: number;
  fibre: number;
  sodium: number;
  servingSize: string;
  portionGrams?: number;
  packSizeNote?: string;
  warning?: string | null;
  subtitle?: string;
}

export function normalizeNutritionTo100g(food: {
  foodName?: string;
  name?: string;
  foodType?: 'packaged' | 'meal';
  nutritionBasis?: 'per_100g' | 'per_serving';
  servingGrams?: number;
  portionGrams?: number;
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
  const requiredNumber = (value: unknown, label: string): number => {
    if (value === null || value === undefined || value === '' || typeof value === 'boolean')
      throw new Error(`Missing ${label}`);
    const number = Number(value);
    if (!Number.isFinite(number) || number < 0) throw new Error(`Invalid ${label}`);
    return number;
  };
  const rawCalories = requiredNumber(food.calories ?? food.estimatedCalories, 'calories');
  const rawProtein = requiredNumber(food.protein, 'protein');
  const rawCarbs = requiredNumber(food.carbs, 'carbs');
  const rawFats = requiredNumber(food.fats, 'fats');
  const rawSugar = requiredNumber(food.sugar, 'sugar');
  const rawFibre = requiredNumber(food.fibre, 'fibre');
  const rawSodium = requiredNumber(food.sodium, 'sodium');

  if (food.foodType !== 'packaged' && food.foodType !== 'meal')
    throw new Error('Unknown food type');
  if (food.nutritionBasis !== 'per_100g' && food.nutritionBasis !== 'per_serving')
    throw new Error('Unknown nutrition basis');
  if (food.foodType === 'meal' && food.nutritionBasis !== 'per_100g')
    throw new Error('Meal basis must be per 100g');
  const servingGrams =
    food.nutritionBasis === 'per_serving'
      ? requiredNumber(food.servingGrams, 'serving weight')
      : 100;
  if (servingGrams < 1 || servingGrams > 5000) throw new Error('Invalid serving weight');
  const factor = 100 / servingGrams;
  const portionGrams =
    food.portionGrams === undefined
      ? undefined
      : requiredNumber(food.portionGrams, 'portion weight');
  if (portionGrams !== undefined && (portionGrams < 1 || portionGrams > 5000))
    throw new Error('Invalid portion weight');

  const calories = Math.round(rawCalories * factor);
  const protein = Math.round(rawProtein * factor * 10) / 10;
  const carbs = Math.round(rawCarbs * factor * 10) / 10;
  const fats = Math.round(rawFats * factor * 10) / 10;
  const sugar = Math.round(rawSugar * factor * 10) / 10;
  const fibre = Math.round(rawFibre * factor * 10) / 10;
  const sodium = Math.round(rawSodium * factor);
  if (
    calories > 900 ||
    [protein, carbs, fats, sugar, fibre].some((value) => value > 100) ||
    sodium > 40000
  ) {
    throw new Error('Nutrition values are not plausible per 100g');
  }

  const packSizeNote = portionGrams
    ? food.foodType === 'meal'
      ? `Photo-estimated portion: ~${portionGrams}g`
      : `Pack: ${portionGrams}g`
    : undefined;

  return {
    name,
    foodType: food.foodType,
    calories,
    protein,
    carbs,
    fats,
    sugar,
    fibre,
    sodium,
    servingSize: '100g',
    portionGrams,
    packSizeNote,
    warning: food.warning || null,
    subtitle: food.subtitle,
  };
}

export function scaleNutritionForPortion(food: NormalizedNutrition, grams: number) {
  if (!Number.isFinite(grams) || grams < 1 || grams > 5000)
    throw new Error('Choose a portion between 1g and 5000g');
  const factor = grams / 100;
  return {
    calories: Math.round(food.calories * factor),
    protein: Math.round(food.protein * factor * 10) / 10,
    carbs: Math.round(food.carbs * factor * 10) / 10,
    fats: Math.round(food.fats * factor * 10) / 10,
    sugar: Math.round(food.sugar * factor * 10) / 10,
    fibre: Math.round(food.fibre * factor * 10) / 10,
    sodium: Math.round(food.sodium * factor),
  };
}

export const ARGroceryLens = ({
  onClose,
  onLogFood,
}: {
  onClose: () => void;
  onLogFood?: (food: any) => boolean | Promise<boolean>;
}) => {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [cameraAttempt, setCameraAttempt] = useState(0);
  const [isScanning, setIsScanning] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [shutterFlash, setShutterFlash] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scanError, setScanError] = useState<{ title: string; message: string } | null>(null);
  const [portionGrams, setPortionGrams] = useState(100);
  const [estimateConfirmed, setEstimateConfirmed] = useState(false);
  const [isLogging, setIsLogging] = useState(false);
  const [logError, setLogError] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const scanSequenceRef = useRef(0);
  const scanActiveRef = useRef(false);
  const activeRequestRef = useRef<AbortController | null>(null);
  const readerRef = useRef<FileReader | null>(null);
  const [analysis, setAnalysis] = useState<FoodAnalysisResult | null>(null);

  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.classList.add('lens-active');
    document.body.style.overflow = 'hidden';
    dialogRef.current?.focus();
    return () => {
      scanSequenceRef.current++;
      activeRequestRef.current?.abort();
      readerRef.current?.readyState === FileReader.LOADING && readerRef.current.abort();
      document.body.classList.remove('lens-active');
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, []);

  useEffect(() => {
    let activeStream: MediaStream | null = null;
    let isCancelled = false;

    // Start camera
    if (navigator.mediaDevices?.getUserMedia) {
      navigator.mediaDevices
        .getUserMedia({ video: { facingMode: { ideal: facingMode } } })
        .then((s) => {
          if (isCancelled) {
            s.getTracks().forEach((t) => t.stop());
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
          console.error('Camera access denied or unavailable', err);
          setCameraError(
            'Camera is unavailable or permission was not granted. You can upload a photo of the food or nutrition facts label instead.'
          );
        });
    } else {
      setCameraError(
        'Camera is unavailable on this device. You can upload a photo from your gallery.'
      );
    }

    return () => {
      isCancelled = true;
      if (activeStream) {
        activeStream.getTracks().forEach((t) => t.stop());
      }
    };
  }, [facingMode, cameraAttempt]);

  const scanFailure = (error: unknown) => {
    const message = error instanceof Error ? error.message : '';
    if (message === 'Offline')
      return {
        title: 'You are offline',
        message: 'Connect to the internet, then try the scan again.',
      };
    if (message === 'QUOTA_EXCEEDED')
      return {
        title: 'Scan limit reached',
        message: 'Your AI scan limit has been reached. Please try again later.',
      };
    if (message.includes('AbortError')) return null;
    return {
      title: 'Scan Inconclusive',
      message:
        'We could not analyze this photo. Try a clearer meal photo or a readable nutrition panel.',
    };
  };

  const beginScan = () => {
    if (scanActiveRef.current) return null;
    scanActiveRef.current = true;
    const sequence = ++scanSequenceRef.current;
    const controller = new AbortController();
    activeRequestRef.current = controller;
    setIsScanning(true);
    setScanError(null);
    setShowResults(false);
    setAnalysis(null);
    setEstimateConfirmed(false);
    setLogError('');
    return { sequence, controller };
  };

  const finishScan = async (
    base64: string,
    canvas: HTMLCanvasElement,
    sequence: number,
    controller: AbortController
  ) => {
    try {
      if (checkCanvasBrightness(canvas) < 16) {
        setScanError({
          title: 'Photo is Too Dark',
          message: 'Try again in better light with the meal or nutrition panel in focus.',
        });
        setShowResults(true);
        triggerHapticWarning();
        return;
      }
      const result = await analyzeFoodImage(base64, {}, controller.signal);
      if (sequence !== scanSequenceRef.current || controller.signal.aborted) return;
      if (!result.detected || !result.foodName) {
        setScanError({
          title: 'Nutrition Not Clear',
          message: result.errorMessage || 'Try a clearer nutrition panel or meal photo.',
        });
        setShowResults(true);
        triggerHapticWarning();
        return;
      }
      const normalized = normalizeNutritionTo100g(result);
      setPortionGrams(normalized.portionGrams ?? 0);
      setAnalysis(result);
      setShowResults(true);
      triggerHapticSuccess();
    } catch (error) {
      if (sequence !== scanSequenceRef.current || controller.signal.aborted) return;
      console.warn('Clinical Lens scan failed', error);
      const failure = scanFailure(error);
      if (failure) {
        setScanError(failure);
        setShowResults(true);
        triggerHapticWarning();
      }
    } finally {
      if (sequence === scanSequenceRef.current) {
        scanActiveRef.current = false;
        activeRequestRef.current = null;
        setIsScanning(false);
      }
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || scanActiveRef.current) return;
    if (!file.type.startsWith('image/')) {
      setScanError({
        title: 'Unsupported photo',
        message: 'Choose an image file such as JPEG, PNG, or HEIC.',
      });
      setShowResults(true);
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      setScanError({ title: 'Image too large', message: 'Use an image file under 20 MB.' });
      setShowResults(true);
      return;
    }
    const operation = beginScan();
    if (!operation) return;
    triggerHapticLight();
    try {
      const rawData = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        readerRef.current = reader;
        reader.onload = () =>
          typeof reader.result === 'string'
            ? resolve(reader.result)
            : reject(new Error('Empty image'));
        reader.onerror = () => reject(reader.error || new Error('Image read failed'));
        reader.onabort = () => reject(new DOMException('Image read cancelled', 'AbortError'));
        reader.readAsDataURL(file);
      });
      if (operation.sequence !== scanSequenceRef.current) return;
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error('Image decode failed'));
        image.src = rawData;
      });
      if (operation.sequence !== scanSequenceRef.current) return;
      const { base64, canvas } = compressCanvas(img, img.naturalWidth, img.naturalHeight);
      setCapturedPhoto(base64);
      videoRef.current?.pause();
      await finishScan(base64, canvas, operation.sequence, operation.controller);
    } catch (error) {
      if (operation.sequence !== scanSequenceRef.current) return;
      const failure = scanFailure(error);
      if (failure) {
        setScanError(failure);
        setShowResults(true);
      }
      scanActiveRef.current = false;
      activeRequestRef.current = null;
      setIsScanning(false);
    } finally {
      readerRef.current = null;
    }
  };

  const handleResumeCamera = () => {
    scanSequenceRef.current++;
    activeRequestRef.current?.abort();
    if (readerRef.current?.readyState === FileReader.LOADING) readerRef.current.abort();
    scanActiveRef.current = false;
    setCapturedPhoto(null);
    setIsScanning(false);
    setShowResults(false);
    setScanError(null);
    setAnalysis(null);
    setEstimateConfirmed(false);
    setLogError('');
    setCameraError(null);
    if (videoRef.current && stream)
      videoRef.current.play().catch(() => setCameraAttempt((value) => value + 1));
    else setCameraAttempt((value) => value + 1);
  };

  const handleScan = async () => {
    if (!videoRef.current || scanActiveRef.current) return;
    if (!videoRef.current.videoWidth || !videoRef.current.videoHeight) {
      setScanError({
        title: 'Camera is warming up',
        message: 'Wait a moment, then choose Try Again.',
      });
      setShowResults(true);
      return;
    }
    const operation = beginScan();
    if (!operation) return;
    triggerHapticLight();
    try {
      const { base64, canvas } = compressCanvas(
        videoRef.current,
        videoRef.current.videoWidth,
        videoRef.current.videoHeight
      );
      setShutterFlash(true);
      window.setTimeout(() => setShutterFlash(false), 220);
      setCapturedPhoto(base64);
      videoRef.current.pause();
      await finishScan(base64, canvas, operation.sequence, operation.controller);
    } catch (error) {
      if (operation.sequence !== scanSequenceRef.current) return;
      const failure = scanFailure(error);
      if (failure) {
        setScanError(failure);
        setShowResults(true);
      }
      scanActiveRef.current = false;
      activeRequestRef.current = null;
      setIsScanning(false);
    }
  };

  const handleToggleFacingMode = () => {
    triggerHapticLight();
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      setStream(null);
    }
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  const handleClose = () => {
    scanSequenceRef.current++;
    activeRequestRef.current?.abort();
    if (readerRef.current?.readyState === FileReader.LOADING) readerRef.current.abort();
    scanActiveRef.current = false;
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
    }
    onClose();
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleClose();
      } else if (e.key === 'Tab' && dialogRef.current) {
        const controls = Array.from(
          dialogRef.current.querySelectorAll<HTMLElement>(
            'button:not([disabled]), input:not([disabled]):not([type="file"]), a[href], [tabindex]:not([tabindex="-1"])'
          )
        ).filter((element) => element.getClientRects().length > 0);
        if (!controls.length) {
          e.preventDefault();
          dialogRef.current.focus();
          return;
        }
        const first = controls[0];
        const last = controls[controls.length - 1];
        if (
          e.shiftKey &&
          (document.activeElement === first || document.activeElement === dialogRef.current)
        ) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [stream]);

  return createPortal(
    <div
      ref={dialogRef}
      tabIndex={-1}
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
        height: 'var(--app-viewport-height)',
        background: '#000000',
        zIndex: 999999,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Live Camera Feed */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        onError={() => setCameraError('Video stream could not be loaded')}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          zIndex: 0,
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
            zIndex: 1,
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
              pointerEvents: 'none',
            }}
          />
        )}
      </AnimatePresence>

      {/* Header - Camera Mode Only */}
      {!showResults && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            paddingTop: 'max(16px, var(--safe-area-top, 0px))',
            paddingLeft: 'max(20px, var(--safe-area-left, 0px))',
            paddingRight: 'max(20px, var(--safe-area-right, 0px))',
            paddingBottom: '16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            zIndex: 40,
            background: 'linear-gradient(180deg, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0) 100%)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                background: '#10B981',
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                boxShadow: '0 0 10px #10B981',
              }}
            />
            <span
              style={{
                color: '#FFFFFF',
                fontWeight: 800,
                fontSize: '13.5px',
                letterSpacing: '0.6px',
                textTransform: 'uppercase',
              }}
            >
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
              cursor: 'pointer',
            }}
          >
            <X size={20} />
          </button>
        </div>
      )}

      {/* Themed Minimal Guidance Pill */}
      {!showResults && (
        <div
          style={{
            position: 'absolute',
            top: 'max(68px, calc(var(--safe-area-top, 0px) + 52px))',
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
            pointerEvents: 'auto',
          }}
        >
          <Sparkles size={13} color="#34D399" style={{ flexShrink: 0 }} />
          <span
            style={{
              color: '#F1F5F9',
              fontSize: '11.5px',
              fontWeight: 600,
              letterSpacing: '0.1px',
              textAlign: 'center',
              lineHeight: 1.3,
              whiteSpace: 'normal',
            }}
          >
            {isScanning
              ? 'Snapshot captured · Analyzing nutrition...'
              : 'Photograph food or a readable nutrition label. Your photo is sent to Google Gemini via HealthChain.'}{' '}
            <a
              href="/privacy"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: '#A7F3D0', textDecoration: 'underline' }}
            >
              Privacy details
            </a>
          </span>
        </div>
      )}

      {/* Center AR Reticle Viewfinder */}
      {!showResults && !cameraError && (
        <div
          style={{
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
            justifyContent: 'center',
          }}
        >
          {/* Top-Left Corner */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '28px',
              height: '28px',
              borderTop: '3px solid #34D399',
              borderLeft: '3px solid #34D399',
              borderTopLeftRadius: '14px',
              filter: 'drop-shadow(0 0 6px rgba(52, 211, 153, 0.6))',
            }}
          />
          {/* Top-Right Corner */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              width: '28px',
              height: '28px',
              borderTop: '3px solid #34D399',
              borderRight: '3px solid #34D399',
              borderTopRightRadius: '14px',
              filter: 'drop-shadow(0 0 6px rgba(52, 211, 153, 0.6))',
            }}
          />
          {/* Bottom-Left Corner */}
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              width: '28px',
              height: '28px',
              borderBottom: '3px solid #34D399',
              borderLeft: '3px solid #34D399',
              borderBottomLeftRadius: '14px',
              filter: 'drop-shadow(0 0 6px rgba(52, 211, 153, 0.6))',
            }}
          />
          {/* Bottom-Right Corner */}
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              right: 0,
              width: '28px',
              height: '28px',
              borderBottom: '3px solid #34D399',
              borderRight: '3px solid #34D399',
              borderBottomRightRadius: '14px',
              filter: 'drop-shadow(0 0 6px rgba(52, 211, 153, 0.6))',
            }}
          />

          {/* Frame Label */}
          <span
            style={{
              color: 'rgba(255, 255, 255, 0.75)',
              fontSize: '11px',
              fontWeight: 600,
              letterSpacing: '0.4px',
              textTransform: 'uppercase',
              textAlign: 'center',
              background: 'rgba(0, 0, 0, 0.35)',
              padding: '4px 10px',
              borderRadius: '999px',
              backdropFilter: 'blur(6px)',
            }}
          >
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
            position: 'absolute',
            top: 0,
            left: '10%',
            right: '10%',
            height: '2px',
            willChange: 'transform',
            background: '#10B981',
            boxShadow: '0 0 20px 4px rgba(16, 185, 129, 0.5)',
            zIndex: 5,
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
              background: 'linear-gradient(180deg, #FFFFFF 0%, #FFFAFA 40%, #FFF7F8 100%)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              height: '100%',
              width: '100%',
            }}
          >
            {/* Warm Porcelain Header */}
            <header
              style={{
                flexShrink: 0,
                paddingTop: 'max(14px, var(--safe-area-top, 0px))',
                paddingBottom: '12px',
                paddingLeft: '20px',
                paddingRight: '20px',
                background: 'rgba(255, 255, 255, 0.94)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                borderBottom: '1px solid #F1E5E7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                zIndex: 10,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div
                  style={{
                    background: '#10B981',
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    boxShadow: '0 0 8px #10B981',
                  }}
                />
                <span
                  style={{
                    color: '#0F172A',
                    fontWeight: 800,
                    fontSize: '13.5px',
                    letterSpacing: '0.6px',
                    textTransform: 'uppercase',
                  }}
                >
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
                  border: '1px solid #F1E5E7',
                  background: '#FFFAFA',
                  color: '#64748B',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
              >
                <X size={18} />
              </button>
            </header>

            {/* Scrollable Single-Page Body with Native Inertia & Pan-Y Touch Action */}
            <div
              style={{
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
                boxSizing: 'border-box',
              }}
            >
              {/* Non-Detection / Scan Error Card */}
              {scanError ? (
                <div
                  style={{
                    background: '#FFFFFF',
                    borderRadius: '24px',
                    padding: '32px 20px',
                    border: '1px solid #F1E5E7',
                    boxShadow: '0 4px 16px -2px rgba(15, 23, 42, 0.05)',
                    textAlign: 'center',
                  }}
                >
                  <div
                    style={{
                      width: '56px',
                      height: '56px',
                      borderRadius: '50%',
                      background: '#FEF2F2',
                      border: '1.5px solid #FCA5A5',
                      margin: '0 auto 16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#DC2626',
                    }}
                  >
                    <AlertTriangle size={28} />
                  </div>
                  <h3
                    style={{
                      margin: '0 0 8px',
                      fontSize: '18px',
                      fontWeight: 800,
                      color: '#0F172A',
                    }}
                  >
                    {scanError.title || 'No Food or Label Detected'}
                  </h3>
                  <p
                    style={{
                      margin: '0 0 24px',
                      fontSize: '13px',
                      color: '#64748B',
                      lineHeight: 1.5,
                      maxWidth: '380px',
                      marginLeft: 'auto',
                      marginRight: 'auto',
                    }}
                  >
                    {scanError.message ||
                      'Position the camera directly in front of the grocery item, barcode, or ingredient table.'}
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
                        boxShadow: '0 8px 24px rgba(16, 185, 129, 0.25)',
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
                        background: '#FFFAFA',
                        color: '#475569',
                        border: '1.5px solid #F1E5E7',
                        fontSize: '13.5px',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      Upload Photo
                    </button>
                  </div>
                </div>
              ) : (
                analysis &&
                (() => {
                  const food = normalizeNutritionTo100g(analysis);
                  const suggestion = analysis.betterAlternatives?.[0]?.name;
                  const isPackaged = food.foodType === 'packaged';
                  const shown = isPackaged
                    ? food
                    : portionGrams >= 1 && portionGrams <= 5000
                      ? scaleNutritionForPortion(food, portionGrams)
                      : null;
                  const nutrients: Array<[string, string]> = shown
                    ? [
                        ['Calories', `${shown.calories} kcal`],
                        ['Protein', `${shown.protein} g`],
                        ['Carbs', `${shown.carbs} g`],
                        ['Fat', `${shown.fats} g`],
                        ['Sugar', `${shown.sugar} g`],
                        ['Fibre', `${shown.fibre} g`],
                        ['Sodium', `${shown.sodium} mg`],
                      ]
                    : [];
                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <section
                        style={{
                          background: '#FFFFFF',
                          border: '1px solid #F1E5E7',
                          borderRadius: '24px',
                          padding: '18px',
                          boxShadow: '0 4px 16px rgba(15,23,42,0.04)',
                        }}
                      >
                        <div
                          style={{
                            display: 'inline-flex',
                            padding: '5px 10px',
                            borderRadius: '999px',
                            background: '#FFF1F2',
                            color: '#BE123C',
                            fontWeight: 800,
                            fontSize: '11px',
                            letterSpacing: '0.3px',
                          }}
                        >
                          {isPackaged
                            ? 'PACKAGE LABEL READ · PER 100 G'
                            : shown
                              ? `MEAL ESTIMATE · ${portionGrams} G PORTION`
                              : 'MEAL ESTIMATE · ENTER PORTION'}
                        </div>
                        <h2
                          style={{
                            margin: '12px 0 5px',
                            color: '#0F172A',
                            fontSize: '21px',
                            lineHeight: 1.25,
                          }}
                        >
                          {food.name}
                        </h2>
                        <p
                          style={{
                            margin: '0 0 15px',
                            color: '#64748B',
                            fontSize: '12px',
                            lineHeight: 1.5,
                          }}
                        >
                          {isPackaged
                            ? 'Per 100 g, converted from the photographed nutrition panel when needed. Compare every number with the package label before relying on it.'
                            : 'For the amount shown below. Calories and nutrients are estimated from the photo and the portion weight; recipe and cooking method can change them.'}{' '}
                          This scan cannot determine allergens or your glucose response.
                        </p>
                        {!shown && (
                          <p style={{ margin: '0 0 14px', color: '#475569', fontSize: '13px' }}>
                            Enter the grams you ate below to calculate this meal's calories and
                            nutrients.
                          </p>
                        )}
                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                            gap: '8px',
                          }}
                        >
                          {nutrients.map(([label, value]) => (
                            <div
                              key={label}
                              style={{
                                background: '#FFFAFA',
                                border: '1px solid #F1E5E7',
                                borderRadius: '12px',
                                padding: '10px 11px',
                              }}
                            >
                              <div style={{ color: '#64748B', fontSize: '11px', fontWeight: 700 }}>
                                {label}
                              </div>
                              <div
                                style={{
                                  color: '#0F172A',
                                  fontSize: '16px',
                                  fontWeight: 800,
                                  marginTop: '2px',
                                }}
                              >
                                {value}
                              </div>
                            </div>
                          ))}
                        </div>
                        {food.packSizeNote && (
                          <p style={{ margin: '12px 0 0', color: '#475569', fontSize: '12px' }}>
                            {food.packSizeNote}. Confirm the amount you actually consumed below.
                          </p>
                        )}
                      </section>
                      {suggestion && (
                        <section
                          style={{
                            background: '#F0FDF4',
                            border: '1px solid #BBF7D0',
                            borderRadius: '18px',
                            padding: '13px 16px',
                          }}
                        >
                          <div
                            style={{
                              color: '#047857',
                              fontSize: '10px',
                              fontWeight: 800,
                              letterSpacing: '0.4px',
                            }}
                          >
                            OPTION TO CONSIDER · AI SUGGESTION
                          </div>
                          <div
                            style={{
                              color: '#0F172A',
                              fontSize: '15px',
                              fontWeight: 800,
                              marginTop: '4px',
                            }}
                          >
                            {suggestion}
                          </div>
                          <div
                            style={{
                              color: '#475569',
                              fontSize: '12px',
                              lineHeight: 1.4,
                              marginTop: '3px',
                            }}
                          >
                            Compare its real ingredient list and nutrition label before choosing it.
                            It is not logged from this scan.
                          </div>
                        </section>
                      )}
                    </div>
                  );
                })()
              )}
            </div>

            {/* Pinned Bottom Action Footer (Sleek, Ergonomic, Non-Intrusive) */}
            <footer
              style={{
                flexShrink: 0,
                background: 'rgba(255, 255, 255, 0.95)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                borderTop: '1px solid #F1E5E7',
                paddingTop: '10px',
                paddingBottom: 'max(12px, var(--safe-area-bottom, 0px))',
                paddingLeft: '16px',
                paddingRight: '16px',
                zIndex: 20,
                boxShadow: '0 -2px 12px rgba(0, 0, 0, 0.04)',
              }}
            >
              <div
                style={{
                  maxWidth: '480px',
                  margin: '0 auto',
                  width: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}
              >
                {logError && (
                  <p
                    role="alert"
                    style={{ margin: 0, color: '#B91C1C', fontSize: '12px', fontWeight: 700 }}
                  >
                    {logError}
                  </p>
                )}
                {onLogFood && analysis?.foodName && (
                  <>
                    <label
                      htmlFor="clinical-lens-portion"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '10px',
                        color: '#334155',
                        fontSize: '12px',
                        fontWeight: 700,
                      }}
                    >
                      Amount you ate (grams)
                      <input
                        id="clinical-lens-portion"
                        type="number"
                        min="1"
                        max="5000"
                        step="1"
                        value={portionGrams || ''}
                        placeholder="Enter g"
                        onChange={(event) => {
                          setPortionGrams(Number(event.target.value));
                          setEstimateConfirmed(false);
                        }}
                        style={{
                          width: '88px',
                          height: '34px',
                          borderRadius: '9px',
                          border: '1px solid #CBD5E1',
                          padding: '0 8px',
                          color: '#0F172A',
                          background: '#FFFFFF',
                        }}
                      />
                    </label>
                    <label
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        color: '#475569',
                        fontSize: '11px',
                        lineHeight: 1.35,
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={estimateConfirmed}
                        onChange={(event) => setEstimateConfirmed(event.target.checked)}
                      />
                      I checked this estimate and the amount. I will use the real label for allergy
                      decisions.
                    </label>
                  </>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => {
                      triggerHapticLight();
                      handleResumeCamera();
                    }}
                    style={{
                      flex: '0 0 auto',
                      height: '42px',
                      padding: '0 13px',
                      background: '#FFFAFA',
                      color: '#475569',
                      border: '1px solid #F1E5E7',
                      borderRadius: '12px',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <RefreshCw size={14} /> Scan Another
                  </button>
                  {onLogFood && analysis?.foodName && (
                    <button
                      type="button"
                      disabled={
                        !estimateConfirmed ||
                        !Number.isFinite(portionGrams) ||
                        portionGrams < 1 ||
                        portionGrams > 5000 ||
                        isLogging
                      }
                      onClick={async () => {
                        if (!analysis || !onLogFood || isLogging) return;
                        setIsLogging(true);
                        try {
                          const food = normalizeNutritionTo100g(analysis);
                          const scaled = scaleNutritionForPortion(food, portionGrams);
                          const hour = new Date().getHours();
                          const mealType =
                            hour < 11
                              ? 'Breakfast'
                              : hour < 14
                                ? 'Lunch'
                                : hour < 18
                                  ? 'Evening Snack'
                                  : 'Dinner';
                          const saved = await onLogFood({
                            name: food.name,
                            ...scaled,
                            fat: scaled.fats,
                            servingSize: `${portionGrams}g consumed`,
                            portion: `${portionGrams}g consumed`,
                            portionGrams,
                            foodType: food.foodType,
                            nutritionBasis:
                              food.foodType === 'packaged'
                                ? 'label_photo_per_100g'
                                : 'meal_estimate_per_100g',
                            originalNutritionBasis: analysis.nutritionBasis,
                            originalServingGrams: analysis.servingGrams,
                            originalLabelNutrients:
                              food.foodType === 'packaged'
                                ? {
                                    calories: analysis.calories,
                                    protein: analysis.protein,
                                    carbs: analysis.carbs,
                                    fat: analysis.fats,
                                    sugar: analysis.sugar,
                                    fibre: analysis.fibre,
                                    sodium: analysis.sodium,
                                  }
                                : undefined,
                            per100Nutrients: {
                              calories: food.calories,
                              protein: food.protein,
                              carbs: food.carbs,
                              fat: food.fats,
                              sugar: food.sugar,
                              fibre: food.fibre,
                              sodium: food.sodium,
                            },
                            type: mealType,
                          });
                          if (saved !== true) throw new Error('Meal was not saved');
                          triggerHapticSuccess();
                          handleClose();
                        } catch (error) {
                          console.warn('Clinical Lens meal log failed', error);
                          setLogError(
                            'Meal not saved. Please try again; your scan is still available.'
                          );
                        } finally {
                          setIsLogging(false);
                        }
                      }}
                      style={{
                        flex: 1,
                        height: '42px',
                        padding: '0 12px',
                        background: '#047857',
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: 800,
                        opacity: estimateConfirmed ? 1 : 0.55,
                        cursor: estimateConfirmed ? 'pointer' : 'not-allowed',
                      }}
                    >
                      Log estimate
                    </button>
                  )}
                </div>
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
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            zIndex: 15,
          }}
        >
          <div
            style={{
              background: 'rgba(15, 23, 42, 0.85)',
              backdropFilter: 'blur(20px)',
              borderRadius: '24px',
              padding: '32px 24px',
              maxWidth: '420px',
              textAlign: 'center',
              border: '1px solid rgba(255,255,255,0.15)',
              color: '#FFF',
            }}
          >
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                background: 'rgba(239, 68, 68, 0.15)',
                color: '#F87171',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
              }}
            >
              <Camera size={28} />
            </div>
            <h3 style={{ margin: '0 0 8px', fontSize: '18px', fontWeight: 800 }}>
              Camera Not Available
            </h3>
            <p style={{ margin: '0 0 24px', fontSize: '14px', color: '#94A3B8', lineHeight: 1.5 }}>
              {cameraError}
            </p>
            <p style={{ color: '#CBD5E1', fontSize: '12px', lineHeight: 1.5 }}>
              Uploaded photos are sent to Google Gemini via HealthChain for nutrition estimation.{' '}
              <a
                href="/privacy"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: '#A7F3D0' }}
              >
                Privacy details
              </a>
            </p>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="btn btn-primary"
              style={{
                padding: '12px 24px',
                borderRadius: '12px',
                fontSize: '14px',
                fontWeight: 700,
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              <Upload size={16} /> Choose Photo from Device
            </button>
            <button
              type="button"
              onClick={() => {
                setCameraError(null);
                setCameraAttempt((value) => value + 1);
              }}
              style={{
                marginTop: 12,
                padding: '12px 24px',
                borderRadius: 12,
                width: '100%',
                border: '1px solid rgba(255,255,255,.35)',
                color: '#fff',
                background: 'transparent',
                cursor: 'pointer',
              }}
            >
              Retry Camera
            </button>
          </div>
        </div>
      )}

      {/* Capture & Upload Bar */}
      {!showResults && !cameraError && (
        <div
          style={{
            position: 'absolute',
            bottom: 'max(28px, calc(var(--safe-area-bottom, 0px) + 20px))',
            left: 0,
            right: 0,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '36px',
            zIndex: 20,
            padding: '0 24px',
          }}
        >
          {/* Left: Gallery Upload Button */}
          <div
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}
          >
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
                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)',
              }}
            >
              <ImageIcon size={22} />
            </motion.button>
            <span
              style={{
                color: 'rgba(255, 255, 255, 0.85)',
                fontSize: '10.5px',
                fontWeight: 600,
                letterSpacing: '0.2px',
              }}
            >
              Gallery
            </span>
          </div>

          {/* Center: Tactile Capture Shutter Button */}
          <div
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}
          >
            <motion.button
              type="button"
              onClick={handleScan}
              disabled={isScanning}
              whileTap={{ scale: 0.92 }}
              aria-label={isScanning ? 'Scanning...' : 'Capture and analyze food'}
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
                position: 'relative',
              }}
            >
              {isScanning ? (
                <RefreshCw size={28} color="#0D9488" className="animate-spin" />
              ) : (
                <Scan size={30} color="#0F172A" strokeWidth={2.4} />
              )}
            </motion.button>
            <span
              style={{
                color: '#FFFFFF',
                fontSize: '11px',
                fontWeight: 700,
                letterSpacing: '0.3px',
              }}
            >
              {isScanning ? 'Scanning...' : 'Capture'}
            </span>
          </div>

          {/* Right: Camera Flip Button */}
          <div
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}
          >
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
                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)',
              }}
            >
              <RefreshCw size={20} />
            </motion.button>
            <span
              style={{
                color: 'rgba(255, 255, 255, 0.85)',
                fontSize: '10.5px',
                fontWeight: 600,
                letterSpacing: '0.2px',
              }}
            >
              Flip
            </span>
          </div>
        </div>
      )}
    </div>,
    document.body
  );
};
