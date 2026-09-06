import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Waves,
  Sparkles,
  GitMerge,
  Clock,
  Plus,
  ArrowDown,
  Check,
  ChevronRight,
  Stethoscope,
  Activity
} from 'lucide-react';
import { triggerHapticLight, triggerHapticSelection } from '../../services/haptics';

export interface RiverMoment {
  id: string;
  time: string;
  type: 'nutrition' | 'posture' | 'vascular' | 'medication' | 'symptom';
  title: string;
  items: string[];
  notes?: string;
  isCausalTrigger?: boolean;
  isCausalReaction?: boolean;
  causalConnectionId?: string;
}

interface WholeHealthRiverModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAskAvaAboutConnection?: (upstream: string, downstream: string) => void;
}

const INITIAL_MOMENTS: RiverMoment[] = [
  {
    id: 'm1',
    time: '08:15',
    type: 'nutrition',
    title: 'Breakfast & Morning Baseline',
    items: ['🥣 Steel-Cut Oats', '🫐 Blueberries', '💊 Vitamin D3 2000IU']
  },
  {
    id: 'm2',
    time: '10:30',
    type: 'vascular',
    title: 'Vascular Intake',
    items: ['☕ Double Espresso (130mg caffeine)', '💧 500ml Water']
  },
  {
    id: 'm3',
    time: '11:45',
    type: 'posture',
    title: 'Prolonged Seated Desk Slouch',
    items: ['🪑 3.5h Continuous Laptop Work', 'Anterior Pelvic Tilt'],
    notes: 'Static immobility under poor lumbar support',
    isCausalTrigger: true,
    causalConnectionId: 'link_1'
  },
  {
    id: 'm4',
    time: '14:00',
    type: 'symptom',
    title: 'Lumbar Strain & Sacral Torque',
    items: ['🦴 L4-S1 Dull Ache (Severity 4/10)'],
    notes: 'Pelvic asymmetry pulling thoracolumbar fascia',
    isCausalTrigger: true,
    causalConnectionId: 'link_1'
  },
  {
    id: 'm5',
    time: '15:30',
    type: 'symptom',
    title: 'Occipital & Temple Headache',
    items: ['⚡ Throbbing Temple Pressure (Severity 7/10)', '👁️ Retro-Orbital Ache'],
    notes: 'Referred pain from suboccipital nerve traction',
    isCausalReaction: true,
    causalConnectionId: 'link_1'
  }
];

export const WholeHealthRiverModal: React.FC<WholeHealthRiverModalProps> = ({
  isOpen,
  onClose,
  onAskAvaAboutConnection
}) => {
  const [moments, setMoments] = useState<RiverMoment[]>(INITIAL_MOMENTS);
  const [activeFilter, setActiveFilter] = useState<'all' | 'causal' | 'symptoms'>('all');
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [newType, setNewType] = useState<RiverMoment['type']>('symptom');
  const [newTitle, setNewTitle] = useState('');
  const [newItemText, setNewItemText] = useState('');

  if (!isOpen) return null;

  const filteredMoments = moments.filter(m => {
    if (activeFilter === 'causal') return m.isCausalTrigger || m.isCausalReaction;
    if (activeFilter === 'symptoms') return m.type === 'symptom';
    return true;
  });

  const handleAddMoment = () => {
    if (!newTitle.trim() && !newItemText.trim()) return;
    triggerHapticLight();
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    const newMoment: RiverMoment = {
      id: `m_${Date.now()}`,
      time: timeStr,
      type: newType,
      title: newTitle.trim() || `${newType.toUpperCase()} Entry`,
      items: newItemText.split(',').map(i => i.trim()).filter(Boolean)
    };

    setMoments(prev => [...prev, newMoment]);
    setNewTitle('');
    setNewItemText('');
    setShowAddSheet(false);
  };

  const getMomentStyle = (type: RiverMoment['type']) => {
    switch (type) {
      case 'posture':
        return { badgeBg: '#F0FDFA', badgeColor: '#0F766E', icon: '🪑', label: 'Posture & Ergonomics' };
      case 'symptom':
        return { badgeBg: '#FFF1F2', badgeColor: '#E11D48', icon: '⚡', label: 'Symptom Reported' };
      case 'vascular':
        return { badgeBg: '#FEF3C7', badgeColor: '#B45309', icon: '☕', label: 'Vascular Intake' };
      case 'medication':
        return { badgeBg: '#ECFDF5', badgeColor: '#047857', icon: '💊', label: 'Medication' };
      default:
        return { badgeBg: '#F8FAFC', badgeColor: '#334155', icon: '🥗', label: 'Nutrition & Fuel' };
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9990,
        background: 'rgba(15, 23, 42, 0.6)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
      }}
      onClick={onClose}
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 280 }}
        style={{
          width: '100%',
          maxWidth: '560px',
          maxHeight: '92vh',
          background: '#FFFFFF',
          borderTopLeftRadius: '28px',
          borderTopRightRadius: '28px',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 -16px 40px rgba(0,0,0,0.15)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Top Handle & Header */}
        <div
          style={{
            padding: '16px 20px 14px 20px',
            background: 'linear-gradient(135deg, #0F766E 0%, #0D9488 100%)',
            color: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '12px',
                background: 'rgba(255, 255, 255, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Waves size={20} color="#FFFFFF" />
            </div>
            <div>
              <span style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#CCFBF1', display: 'block' }}>
                TriggerBites Daily Stream
              </span>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.3px' }}>
                Whole Health River
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.2)',
              border: 'none',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Filter Pills & Causality Banner */}
        <div style={{ padding: '12px 20px', background: '#F0FDFA', borderBottom: '1px solid #CCFBF1', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: '6px' }}>
            {[
              { key: 'all', label: 'All Moments' },
              { key: 'causal', label: '🔗 Causal Chains' },
              { key: 'symptoms', label: '⚡ Symptoms Only' },
            ].map(tab => (
              <button
                key={tab.key}
                type="button"
                onClick={() => {
                  triggerHapticSelection();
                  setActiveFilter(tab.key as any);
                }}
                style={{
                  padding: '5px 11px',
                  borderRadius: '999px',
                  border: 'none',
                  fontSize: '11.5px',
                  fontWeight: activeFilter === tab.key ? 800 : 600,
                  background: activeFilter === tab.key ? '#0D9488' : '#FFFFFF',
                  color: activeFilter === tab.key ? '#FFFFFF' : '#0F766E',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                  cursor: 'pointer',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => {
              triggerHapticLight();
              setShowAddSheet(prev => !prev);
            }}
            style={{
              padding: '6px 12px',
              borderRadius: '12px',
              border: 'none',
              background: '#0F766E',
              color: '#FFFFFF',
              fontSize: '11.5px',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              cursor: 'pointer',
            }}
          >
            <Plus size={14} /> Add Moment
          </button>
        </div>

        {/* Quick Add Sheet (Collapsible) */}
        <AnimatePresence>
          {showAddSheet && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              style={{
                background: '#FFFFFF',
                borderBottom: '1.5px solid #E2E8F0',
                padding: '14px 20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                overflow: 'hidden',
              }}
            >
              <div style={{ display: 'flex', gap: '6px' }}>
                {(['symptom', 'posture', 'nutrition', 'vascular', 'medication'] as RiverMoment['type'][]).map(type => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setNewType(type)}
                    style={{
                      flex: 1,
                      padding: '6px 4px',
                      borderRadius: '10px',
                      border: newType === type ? '1.5px solid #0D9488' : '1px solid #E2E8F0',
                      background: newType === type ? '#F0FDFA' : '#FFFFFF',
                      color: newType === type ? '#0F766E' : '#64748B',
                      fontSize: '11px',
                      fontWeight: newType === type ? 800 : 600,
                      cursor: 'pointer',
                      textTransform: 'capitalize',
                    }}
                  >
                    {type}
                  </button>
                ))}
              </div>

              <input
                type="text"
                placeholder="Title (e.g. 4h Desk Slouch, Greek Yogurt)..."
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                style={{
                  padding: '9px 12px',
                  borderRadius: '10px',
                  border: '1px solid #E2E8F0',
                  fontSize: '13px',
                  outline: 'none',
                }}
              />

              <input
                type="text"
                placeholder="Items separated by commas (e.g. Lower Back Ache, Ocular Pain)..."
                value={newItemText}
                onChange={e => setNewItemText(e.target.value)}
                style={{
                  padding: '9px 12px',
                  borderRadius: '10px',
                  border: '1px solid #E2E8F0',
                  fontSize: '13px',
                  outline: 'none',
                }}
              />

              <button
                type="button"
                onClick={handleAddMoment}
                style={{
                  padding: '10px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #0D9488 0%, #0F766E 100%)',
                  color: '#FFFFFF',
                  fontWeight: 800,
                  fontSize: '12.5px',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                Save to Today's River
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* The Vertical River Stream */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            position: 'relative',
          }}
        >
          {/* Visual Vertical Thread Line */}
          <div
            style={{
              position: 'absolute',
              top: '20px',
              bottom: '20px',
              left: '37px',
              width: '2px',
              background: 'linear-gradient(180deg, #CCFBF1 0%, #0D9488 50%, #99F6E4 100%)',
              zIndex: 0,
            }}
          />

          {filteredMoments.map((moment, idx) => {
            const style = getMomentStyle(moment.type);
            const isHighlightedCausal = moment.isCausalTrigger || moment.isCausalReaction;

            return (
              <div
                key={moment.id}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '14px',
                  position: 'relative',
                  zIndex: 1,
                }}
              >
                {/* Time Indicator Node */}
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    background: isHighlightedCausal ? '#0D9488' : '#FFFFFF',
                    border: isHighlightedCausal ? '2.5px solid #CCFBF1' : '2px solid #E2E8F0',
                    color: isHighlightedCausal ? '#FFFFFF' : '#0F766E',
                    fontSize: '11px',
                    fontWeight: 800,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    boxShadow: isHighlightedCausal ? '0 0 12px rgba(13, 148, 136, 0.4)' : 'none',
                  }}
                >
                  {style.icon}
                </div>

                {/* River Card Box */}
                <div
                  style={{
                    flex: 1,
                    background: isHighlightedCausal ? '#F0FDFA' : '#FFFFFF',
                    border: isHighlightedCausal ? '1.5px solid #99F6E4' : '1px solid #E2E8F0',
                    borderRadius: '18px',
                    padding: '14px',
                    boxShadow: '0 2px 8px rgba(15, 23, 42, 0.04)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 800, color: '#0F766E' }}>
                        {moment.time}
                      </span>
                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: 800,
                          padding: '2px 8px',
                          borderRadius: '999px',
                          background: style.badgeBg,
                          color: style.badgeColor,
                        }}
                      >
                        {style.label}
                      </span>
                    </div>

                    {isHighlightedCausal && (
                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: 800,
                          padding: '2px 8px',
                          borderRadius: '999px',
                          background: moment.isCausalReaction ? '#FFE4E6' : '#CCFBF1',
                          color: moment.isCausalReaction ? '#E11D48' : '#0F766E',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '3px',
                        }}
                      >
                        <GitMerge size={10} />
                        {moment.isCausalReaction ? 'Downstream Reaction' : 'Upstream Causal Vector'}
                      </span>
                    )}
                  </div>

                  <div style={{ fontSize: '14px', fontWeight: 800, color: '#1E293B' }}>
                    {moment.title}
                  </div>

                  {/* Pills */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '2px' }}>
                    {moment.items.map((item, iIdx) => (
                      <span
                        key={iIdx}
                        style={{
                          padding: '4px 10px',
                          borderRadius: '999px',
                          background: '#FFFFFF',
                          border: '1px solid #E2E8F0',
                          fontSize: '12px',
                          fontWeight: 600,
                          color: '#334155',
                        }}
                      >
                        {item}
                      </span>
                    ))}
                  </div>

                  {moment.notes && (
                    <div style={{ fontSize: '11.5px', color: '#64748B', fontStyle: 'italic', marginTop: '2px' }}>
                      “{moment.notes}”
                    </div>
                  )}

                  {/* Special Link Prompt if Causal Reaction */}
                  {moment.isCausalReaction && (
                    <div
                      style={{
                        marginTop: '6px',
                        padding: '8px 10px',
                        borderRadius: '12px',
                        background: '#FFFFFF',
                        border: '1px dashed #0D9488',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div style={{ fontSize: '11px', color: '#0F766E', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <Sparkles size={12} /> Causal link: 11:45 Posture ➔ 15:30 Headache
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          triggerHapticLight();
                          onClose();
                          if (onAskAvaAboutConnection) {
                            onAskAvaAboutConnection('11:45 Desk Slouch & Lumbar Strain', '15:30 Occipital Headache');
                          }
                        }}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#0D9488',
                          fontSize: '11px',
                          fontWeight: 800,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '2px',
                        }}
                      >
                        Ask Ava <ChevronRight size={12} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer Summary */}
        <div
          style={{
            padding: '12px 20px calc(14px + env(safe-area-inset-bottom, 16px))',
            background: '#F8FAFC',
            borderTop: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 600 }}>
            {filteredMoments.length} moments tracked today · 1 active causal loop
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '10px 18px',
              borderRadius: '14px',
              background: 'linear-gradient(135deg, #0D9488 0%, #0F766E 100%)',
              color: '#FFFFFF',
              fontWeight: 800,
              fontSize: '13px',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Done
          </button>
        </div>
      </motion.div>
    </div>
  );
};
