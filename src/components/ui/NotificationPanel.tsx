import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bell, X, CheckCircle2, Clock, Droplets, BriefcaseBusiness, 
  HeartPulse, Sparkles, ArrowRight, Plus 
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getTodayCheckin } from '../../services/ProfileEngine';
import { getActiveCase } from '../../services/CaseEngine';
import { triggerHapticLight, triggerHapticMedium } from '../../services/haptics';
import { awardPoints } from '../../services/VitalityPointsEngine';
import { useIsMobile } from '../../hooks/useIsMobile';

interface NotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function NotificationPanel({ isOpen, onClose }: NotificationPanelProps) {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [todayCheckin, setTodayCheckin] = useState<any>(null);
  const [activeCase, setActiveCase] = useState<any>(null);
  const [waterGlasses, setWaterGlasses] = useState<number>(0);

  const todayStr = new Date().toISOString().split('T')[0];

  const loadData = () => {
    try {
      setTodayCheckin(getTodayCheckin());
      setActiveCase(getActiveCase());
      const savedWater = parseInt(localStorage.getItem('hc_water_' + todayStr) || '0', 10);
      setWaterGlasses(savedWater);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, todayStr]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  const handleAddWater = () => {
    triggerHapticLight();
    const next = waterGlasses + 1;
    setWaterGlasses(next);
    try {
      localStorage.setItem('hc_water_' + todayStr, next.toString());
    } catch (e) {
      console.warn('Failed to save water glass count', e);
    }
    if (next === 4 || next === 8) {
      awardPoints(5, 'Hydration Target Milestone 💧', 'lifestyle');
    }
    window.dispatchEvent(new Event('hc_water_updated'));
  };

  const handleNavigate = (route: string) => {
    triggerHapticMedium();
    onClose();
    navigate(route);
  };

  if (!isOpen) return null;

  const pendingActionsCount = (activeCase?.actions || []).filter((a: any) => a.status !== 'completed').length;
  const isCheckinPending = !todayCheckin;

  return (
    <AnimatePresence>
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.45)',
          backdropFilter: 'blur(6px)',
          WebkitBackdropFilter: 'blur(6px)',
          zIndex: 99999,
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: isMobile ? 'flex-end' : 'stretch',
        }}
        onClick={onClose}
      >
        <motion.div
          initial={isMobile ? { y: '100%' } : { x: '100%' }}
          animate={isMobile ? { y: 0 } : { x: 0 }}
          exit={isMobile ? { y: '100%' } : { x: '100%' }}
          transition={{ type: 'spring', damping: 28, stiffness: 280 }}
          style={{
            background: 'rgba(255, 255, 255, 0.98)',
            width: isMobile ? '100%' : '420px',
            maxHeight: isMobile ? '88vh' : '100vh',
            height: isMobile ? 'auto' : '100%',
            borderRadius: isMobile ? '24px 24px 0 0' : '0',
            boxShadow: '-10px 0 35px rgba(0, 0, 0, 0.15)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div
            style={{
              padding: '20px 24px 16px',
              borderBottom: '1px solid #F1F5F9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: '#FFFFFF',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #ECFDF5, #D1FAE5)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#059669',
                }}
              >
                <Bell size={20} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.3px' }}>
                  Health Alerts & Pulse
                </h3>
                <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 500 }}>
                  Active context & daily actions
                </span>
              </div>
            </div>
            <button
              onClick={() => {
                triggerHapticLight();
                onClose();
              }}
              style={{
                background: '#F1F5F9',
                border: 'none',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#64748B',
                cursor: 'pointer',
              }}
              aria-label="Close notifications"
            >
              <X size={18} />
            </button>
          </div>

          {/* Scrollable Body */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
            }}
          >
            {/* 1. Daily Symptom Check-in Card */}
            <div
              style={{
                border: isCheckinPending ? '1px solid #FDE68A' : '1px solid #A7F3D0',
                background: isCheckinPending ? '#FFFBEB' : '#F0FDF4',
                borderRadius: '16px',
                padding: '16px',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.03)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    padding: '3px 8px',
                    borderRadius: '6px',
                    background: isCheckinPending ? '#FEF3C7' : '#DCFCE7',
                    color: isCheckinPending ? '#D97706' : '#166534',
                  }}
                >
                  {isCheckinPending ? 'Action Required' : 'Completed Today'}
                </span>
                <Clock size={14} color={isCheckinPending ? '#D97706' : '#166534'} />
              </div>

              <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                <div
                  style={{
                    width: '34px',
                    height: '34px',
                    borderRadius: '50%',
                    background: isCheckinPending ? '#FDE68A' : '#BBF7D0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    color: isCheckinPending ? '#B45309' : '#15803D',
                  }}
                >
                  {isCheckinPending ? <HeartPulse size={18} /> : <CheckCircle2 size={18} />}
                </div>
                <div style={{ flex: 1 }}>
                  <h4 style={{ margin: '0 0 4px', fontSize: '14px', fontWeight: 700, color: '#0F172A' }}>
                    {isCheckinPending ? 'Daily Symptom Check-in' : "Today's Vitals Recorded"}
                  </h4>
                  <p style={{ margin: '0 0 10px', fontSize: '12.5px', color: '#475569', lineHeight: 1.4 }}>
                    {isCheckinPending
                      ? 'Log your energy, sleep quality, and physical indicators to keep your clinical timeline up to date.'
                      : `Status: ${todayCheckin?.symptom || 'Normal'} (${todayCheckin?.severity || 'Mild'})`}
                  </p>
                  <button
                    onClick={() => handleNavigate('/app/today')}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '7px 12px',
                      borderRadius: '8px',
                      background: isCheckinPending ? '#D97706' : '#16A34A',
                      color: '#FFFFFF',
                      fontSize: '12px',
                      fontWeight: 700,
                      border: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    {isCheckinPending ? 'Start Check-in' : 'Review Daily Hub'}
                    <ArrowRight size={13} />
                  </button>
                </div>
              </div>
            </div>

            {/* 2. Active Case Context Card */}
            <div
              style={{
                border: '1px solid #E2E8F0',
                background: '#FFFFFF',
                borderRadius: '16px',
                padding: '16px',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.03)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    padding: '3px 8px',
                    borderRadius: '6px',
                    background: activeCase ? '#EFF6FF' : '#F1F5F9',
                    color: activeCase ? '#2563EB' : '#64748B',
                  }}
                >
                  {activeCase ? 'Active Clinical Case' : 'Clinical Focus'}
                </span>
                <BriefcaseBusiness size={14} color={activeCase ? '#2563EB' : '#64748B'} />
              </div>

              {activeCase ? (
                <div>
                  <h4 style={{ margin: '0 0 4px', fontSize: '14.5px', fontWeight: 700, color: '#0F172A' }}>
                    {activeCase.title}
                  </h4>
                  <p style={{ margin: '0 0 10px', fontSize: '12.5px', color: '#64748B', lineHeight: 1.4 }}>
                    {(activeCase.medicalRecords || []).length} medical records · {pendingActionsCount} pending actions
                  </p>
                  <button
                    onClick={() => handleNavigate('/app/cases/' + activeCase.id)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '7px 12px',
                      borderRadius: '8px',
                      background: '#F1F5F9',
                      color: '#0F172A',
                      fontSize: '12px',
                      fontWeight: 700,
                      border: '1px solid #CBD5E1',
                      cursor: 'pointer',
                    }}
                  >
                    Open Case File <ArrowRight size={13} />
                  </button>
                </div>
              ) : (
                <div>
                  <h4 style={{ margin: '0 0 4px', fontSize: '14px', fontWeight: 700, color: '#0F172A' }}>
                    No Active Case in Focus
                  </h4>
                  <p style={{ margin: '0 0 10px', fontSize: '12.5px', color: '#64748B', lineHeight: 1.4 }}>
                    Structure your complex symptoms and lab reports into an integrated multi-specialist file.
                  </p>
                  <button
                    onClick={() => handleNavigate('/app/consult?new=true')}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '7px 12px',
                      borderRadius: '8px',
                      background: '#0F8B7E',
                      color: '#FFFFFF',
                      fontSize: '12px',
                      fontWeight: 700,
                      border: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    Start Quick Consult <ArrowRight size={13} />
                  </button>
                </div>
              )}
            </div>

            {/* 3. Cellular Hydration Pulse */}
            <div
              style={{
                border: '1px solid #BAE6FD',
                background: '#F0F9FF',
                borderRadius: '16px',
                padding: '16px',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.03)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    padding: '3px 8px',
                    borderRadius: '6px',
                    background: '#E0F2FE',
                    color: '#0284C7',
                  }}
                >
                  Hydration Target · {waterGlasses}/8 Glasses
                </span>
                <Droplets size={14} color="#0284C7" />
              </div>

              <div style={{ marginBottom: '10px' }}>
                <div
                  style={{
                    height: '6px',
                    width: '100%',
                    background: '#BAE6FD',
                    borderRadius: '3px',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      height: '100%',
                      width: Math.min(100, (waterGlasses / 8) * 100) + '%',
                      background: 'linear-gradient(90deg, #38BDF8, #0284C7)',
                      borderRadius: '3px',
                      transition: 'width 0.3s ease',
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '12px', color: '#0369A1', fontWeight: 600 }}>
                  {waterGlasses >= 8 ? 'Daily hydration goal reached! 🎉' : (8 - waterGlasses) + ' glasses remaining today'}
                </span>
                <button
                  onClick={handleAddWater}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '5px 10px',
                    borderRadius: '6px',
                    background: '#0284C7',
                    color: '#FFFFFF',
                    fontSize: '11.5px',
                    fontWeight: 700,
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <Plus size={13} /> +1 Glass
                </button>
              </div>
            </div>

            {/* 4. Ava Medical Buddy Card */}
            <div
              style={{
                border: '1px solid #FBCFE8',
                background: '#FDF2F8',
                borderRadius: '16px',
                padding: '16px',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.03)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    padding: '3px 8px',
                    borderRadius: '6px',
                    background: '#FCE7F3',
                    color: '#BE185D',
                  }}
                >
                  Ava Clinical Buddy · Available 24/7
                </span>
                <Sparkles size={14} color="#BE185D" />
              </div>

              <p style={{ margin: '0 0 10px', fontSize: '12.5px', color: '#475569', lineHeight: 1.4 }}>
                Ask questions regarding medication interactions, lab interpretations, or symptom escalations anytime.
              </p>

              <button
                onClick={() => handleNavigate('/app/ava')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 12px',
                  borderRadius: '8px',
                  background: '#BE185D',
                  color: '#FFFFFF',
                  fontSize: '12px',
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                Chat with Ava <ArrowRight size={13} />
              </button>
            </div>
          </div>

          {/* Footer */}
          <div
            style={{
              padding: '14px 20px',
              borderTop: '1px solid #F1F5F9',
              background: '#F8FAFC',
              display: 'flex',
              justifyContent: 'flex-end',
            }}
          >
            <button
              onClick={() => {
                triggerHapticLight();
                onClose();
              }}
              style={{
                background: '#FFFFFF',
                border: '1px solid #CBD5E1',
                padding: '8px 16px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 600,
                color: '#475569',
                cursor: 'pointer',
              }}
            >
              Close
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
