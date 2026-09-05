import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Pill, Check, X, Sparkles, Clock, Bell } from 'lucide-react';
import { useIsMobile } from '../../hooks/useIsMobile';
import { triggerHapticLight, triggerHapticSuccess } from '../../services/haptics';
import { awardPoints } from '../../services/VitalityPointsEngine';
import { toggleVitaminTaken, getTodayDateString } from '../../services/VitaminScheduleService';

interface PillNotificationData {
  id?: string;
  name: string;
  dosage?: string;
  time?: string;
}

export default function PillNotificationBanner() {
  const [data, setData] = useState<PillNotificationData | null>(null);
  const isMobile = useIsMobile();
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const handleTrigger = (e: Event) => {
      const custom = e as CustomEvent;
      if (custom.detail) {
        if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
        triggerHapticLight();
        setData(custom.detail);

        // Auto dismiss after 10 seconds
        dismissTimerRef.current = setTimeout(() => {
          setData(null);
        }, 10000);
      }
    };

    window.addEventListener('hc_pill_reminder_triggered', handleTrigger);
    return () => {
      window.removeEventListener('hc_pill_reminder_triggered', handleTrigger);
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    };
  }, []);

  // Also check scheduled vitamins against current minute periodically
  useEffect(() => {
    const checkSchedule = () => {
      try {
        const now = new Date();
        const currentHM = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
        const lastCheckedMinute = sessionStorage.getItem('hc_last_checked_pill_minute');
        if (lastCheckedMinute === currentHM) return;
        sessionStorage.setItem('hc_last_checked_pill_minute', currentHM);

        const raw = localStorage.getItem('healthchain_vitamins_schedule_v2');
        if (raw) {
          const list = JSON.parse(raw);
          const match = list.find((v: any) => v.enabled && v.time === currentHM);
          if (match) {
            // Check if already taken today
            const today = getTodayDateString();
            const rawLogs = localStorage.getItem(`healthchain_vitamins_taken_logs_${today}`);
            const takenMap = rawLogs ? JSON.parse(rawLogs) : {};
            if (!takenMap[match.id]) {
              setData(match);
              triggerHapticLight();
            }
          }
        }
      } catch (err) {}
    };

    const interval = setInterval(checkSchedule, 25000);
    return () => clearInterval(interval);
  }, []);

  const handleTakeDose = () => {
    triggerHapticSuccess();
    if (data?.id) {
      toggleVitaminTaken(data.id);
      awardPoints(5, `Tablet taken: ${data.name}`, 'lifestyle', `pill_${data.id}_${getTodayDateString()}`);
    } else {
      awardPoints(5, `Tablet taken: ${data?.name || 'Vitamins'}`, 'lifestyle');
    }
    if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    setData(null);
  };

  const handleDismiss = () => {
    triggerHapticLight();
    if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    setData(null);
  };

  if (!data) return null;

  return (
    <AnimatePresence>
      <motion.div
        key="pill-notification-banner"
        initial={{ opacity: 0, y: -60, scale: 0.88 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -50, scale: 0.9, transition: { duration: 0.25 } }}
        transition={{ type: 'spring', damping: 22, stiffness: 320 }}
        style={{
          position: 'fixed',
          top: isMobile ? 'calc(12px + env(safe-area-inset-top, 0px))' : '24px',
          left: 0,
          right: 0,
          margin: '0 auto',
          width: isMobile ? 'calc(100% - 24px)' : 'auto',
          maxWidth: '460px',
          zIndex: 100005,
          pointerEvents: 'auto'
        }}
      >
        {/* Capsule Container with Two-Toned Pharmaceutical Aesthetic */}
        <div
          style={{
            position: 'relative',
            borderRadius: '999px',
            background: '#FFFFFF',
            border: '1.5px solid rgba(245, 158, 11, 0.4)',
            boxShadow: '0 20px 40px -10px rgba(217, 119, 6, 0.3), 0 8px 16px rgba(15, 23, 42, 0.12), inset 0 1px 0 rgba(255,255,255,1)',
            display: 'flex',
            alignItems: 'center',
            overflow: 'hidden',
            padding: '6px 8px 6px 6px'
          }}
        >
          {/* Left Pill Half: Vibrant Orange-Amber Capsule Cap */}
          <div
            style={{
              borderRadius: '999px',
              background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
              padding: isMobile ? '10px 14px' : '10px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: '#FFFFFF',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.4), 0 2px 8px rgba(217, 119, 6, 0.4)',
              flexShrink: 0
            }}
          >
            <motion.div
              animate={{ rotate: [0, 15, -15, 0] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
            >
              <Pill size={isMobile ? 18 : 20} strokeWidth={2.4} />
            </motion.div>
            <span style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '0.4px', textTransform: 'uppercase' }}>
              PILL ALERT
            </span>
          </div>

          {/* Center Details */}
          <div
            style={{
              flex: 1,
              padding: '0 12px',
              minWidth: 0,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span
                style={{
                  fontSize: isMobile ? '13px' : '14px',
                  fontWeight: 800,
                  color: '#0F172A',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}
              >
                {data.name}
              </span>
              {data.time && (
                <span
                  style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    color: '#D97706',
                    background: '#FEF3C7',
                    padding: '1px 6px',
                    borderRadius: '6px',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {data.time}
                </span>
              )}
            </div>
            <span
              style={{
                fontSize: '11.5px',
                color: '#64748B',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}
            >
              {data.dosage || 'Scheduled dose time'}
            </span>
          </div>

          {/* Right Pill Actions: Take Button & Dismiss */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
            <button
              type="button"
              onClick={handleTakeDose}
              style={{
                borderRadius: '999px',
                background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                color: '#FFFFFF',
                border: 'none',
                padding: isMobile ? '8px 12px' : '8px 14px',
                fontSize: '12px',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                boxShadow: '0 4px 10px rgba(5, 150, 105, 0.3)'
              }}
            >
              <Check size={14} strokeWidth={2.6} />
              <span>Take (+5)</span>
            </button>

            <button
              type="button"
              onClick={handleDismiss}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#94A3B8',
                cursor: 'pointer',
                padding: '6px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              aria-label="Dismiss pill notification"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
