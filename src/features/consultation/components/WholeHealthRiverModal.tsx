import { AnimatePresence, motion } from 'framer-motion';
import { ChevronRight, GitMerge, Plus, Sparkles, Waves, X } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import type { Observation } from '../../../domain/observations/types';
import { triggerHapticLight, triggerHapticSelection } from '../../../services/haptics';
import {
  captureHealthMemoryScope,
  isHealthMemoryScopeCurrent,
} from '../../../services/HealthMemory';
import {
  captureObservationScope,
  createObservation,
  listObservations,
} from '../../../services/HealthObservationService';
import { getProfile } from '../../../services/ProfileEngine';

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

export const getInitialRiverMoments = (records?: Observation[]): RiverMoment[] => {
  if (records)
    return records
      .filter((record) => !record.deletedAt)
      .map((record) => {
        const payload = record.payload;
        const time =
          record.occurredAt && ['exact', 'approximate'].includes(record.timePrecision)
            ? new Date(record.occurredAt).toLocaleString([], {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })
            : record.localDate
              ? record.localDate + ' · time not recorded'
              : 'Time not recorded';
        const title =
          payload.kind === 'meal'
            ? payload.description
            : payload.kind === 'symptom'
              ? payload.symptom
              : payload.kind === 'context'
                ? payload.description
                : payload.kind === 'daily_checkin'
                  ? 'Daily check-in'
                  : 'Bowel observation';
        const type: RiverMoment['type'] =
          payload.kind === 'meal'
            ? 'nutrition'
            : payload.kind === 'context' && payload.contextType === 'medication'
              ? 'medication'
              : 'symptom';
        const items =
          payload.kind === 'symptom'
            ? [
                payload.severity
                  ? 'Severity: ' + payload.severity.value + '/' + payload.severity.max
                  : 'Severity not recorded',
              ]
            : payload.kind === 'daily_checkin'
              ? Object.entries(payload.answers).map(([key, value]) => key + ': ' + value)
              : [];
        return {
          id: record.id,
          time,
          type,
          title,
          items,
          notes: 'Canonical observation · ' + record.source,
        };
      });
  const profile = getProfile();
  const list: RiverMoment[] = [];

  const recentLogs = profile?.nutrition?.recentLogs || [];
  recentLogs.slice(-4).forEach((log: any, idx: number) => {
    const time = log.loggedAt
      ? new Date(log.loggedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : 'Time not recorded';
    list.push({
      id: `nut_${idx}_${log.name || 'meal'}`,
      time,
      type: 'nutrition',
      title: log.name || 'Nutrition Intake',
      items: log.tags && log.tags.length > 0 ? log.tags : [log.name || 'Logged Intake'],
      notes: log.slot ? `Logged under ${log.slot}` : undefined,
    });
  });

  const checkins = profile?.dailyCheckins || [];
  checkins.slice(0, 3).forEach((chk: any, idx: number) => {
    if (chk.symptom && chk.severity !== 'None') {
      const time = chk.timestamp
        ? new Date(chk.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : 'Time not recorded';
      list.push({
        id: `sym_${idx}_${chk.symptom}`,
        time,
        type: 'symptom',
        title: chk.symptom,
        items: [
          `Severity: ${chk.severity ?? 'Not recorded'}`,
          `Score: ${chk.score ?? 'Not recorded'}/10`,
        ],
        notes: chk.notes || 'Recorded via Daily Check-in',
      });
    }
  });

  // Sort chronologically if times exist
  list.sort((a, b) => a.time.localeCompare(b.time));

  return list;
};

export const WholeHealthRiverModal: React.FC<WholeHealthRiverModalProps> = ({
  isOpen,
  onClose,
  onAskAvaAboutConnection,
}) => {
  const [moments, setMoments] = useState<RiverMoment[]>(() => getInitialRiverMoments());
  const [activeFilter, setActiveFilter] = useState<'all' | 'causal' | 'symptoms'>('all');
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [newType, setNewType] = useState<RiverMoment['type']>('symptom');
  const [newTitle, setNewTitle] = useState('');
  const [newItemText, setNewItemText] = useState('');

  const [saveError, setSaveError] = useState('');
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (!isOpen) return;
    const scope = captureHealthMemoryScope();
    let active = true;
    const refresh = () => {
      void listObservations().then((records) => {
        if (active && isHealthMemoryScopeCurrent(scope))
          setMoments(getInitialRiverMoments(records));
      });
    };
    refresh();
    window.addEventListener('hc_observations_updated', refresh);
    return () => {
      active = false;
      window.removeEventListener('hc_observations_updated', refresh);
    };
  }, [isOpen]);
  if (!isOpen) return null;

  const filteredMoments = moments.filter((m) => {
    if (activeFilter === 'causal') return m.isCausalTrigger || m.isCausalReaction;
    if (activeFilter === 'symptoms') return m.type === 'symptom';
    return true;
  });

  const handleAddMoment = async () => {
    if (saving || !newTitle.trim()) return;
    setSaving(true);
    setSaveError('');
    const owner = captureHealthMemoryScope();
    try {
      const scope = await captureObservationScope();
      if (!scope || !isHealthMemoryScopeCurrent(owner))
        throw new Error('Account changed. Please retry.');
      const payload: any =
        newType === 'nutrition'
          ? { kind: 'meal', description: newTitle.trim(), note: newItemText.trim() || undefined }
          : newType === 'symptom'
            ? { kind: 'symptom', symptom: newTitle.trim(), note: newItemText.trim() || undefined }
            : {
                kind: 'context',
                contextType: newType === 'medication' ? 'medication' : 'other',
                description: [newTitle.trim(), newItemText.trim()].filter(Boolean).join(': '),
              };
      const now = new Date();
      const localDate = [
        now.getFullYear(),
        String(now.getMonth() + 1).padStart(2, '0'),
        String(now.getDate()).padStart(2, '0'),
      ].join('-');
      const result = await createObservation({
        ...scope,
        payload,
        occurredAt: null,
        localDate,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        timePrecision: 'date_only',
        source: 'ava',
        evidenceType: 'user_report',
        idempotencyKey: crypto.randomUUID(),
      });
      if (!isHealthMemoryScopeCurrent(owner)) return;
      if (!result.ok) throw new Error(result.details?.join(' ') || 'Could not save.');
      setMoments(getInitialRiverMoments(await listObservations()));
      setNewTitle('');
      setNewItemText('');
      setShowAddSheet(false);
      if (result.sync === 'queue_failed')
        setSaveError('Saved on this device; account sync needs retry.');
    } catch (error: any) {
      setSaveError(error.message);
    } finally {
      setSaving(false);
    }
  };

  const getMomentStyle = (type: RiverMoment['type']) => {
    switch (type) {
      case 'posture':
        return {
          badgeBg: '#F0FDFA',
          badgeColor: '#0F766E',
          icon: '🪑',
          label: 'Posture & Ergonomics',
        };
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
        onClick={(e) => e.stopPropagation()}
      >
        {saveError && (
          <p role="alert" style={{ padding: 12 }}>
            {saveError}
          </p>
        )}
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
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  color: '#CCFBF1',
                  display: 'block',
                }}
              >
                TriggerBites Daily Stream
              </span>
              <h3
                style={{
                  margin: 0,
                  fontSize: '18px',
                  fontWeight: 800,
                  color: '#FFFFFF',
                  letterSpacing: '-0.3px',
                }}
              >
                Whole Health River
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              width: '44px',
              height: '44px',
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
        <div
          style={{
            padding: '12px 20px',
            background: '#F0FDFA',
            borderBottom: '1px solid #CCFBF1',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', gap: '6px' }}>
            {[
              { key: 'all', label: 'All Moments' },
              { key: 'causal', label: '🔗 Recorded links' },
              { key: 'symptoms', label: '⚡ Symptoms Only' },
            ].map((tab) => (
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
              setShowAddSheet((prev) => !prev);
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
                {(
                  [
                    'symptom',
                    'posture',
                    'nutrition',
                    'vascular',
                    'medication',
                  ] as RiverMoment['type'][]
                ).map((type) => (
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
                onChange={(e) => setNewTitle(e.target.value)}
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
                onChange={(e) => setNewItemText(e.target.value)}
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
          {filteredMoments.length > 0 && (
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
          )}

          {filteredMoments.length === 0 ? (
            <div
              style={{
                padding: '48px 24px',
                textAlign: 'center',
                background: '#F8FAFC',
                borderRadius: '20px',
                border: '1.5px dashed #CBD5E1',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '14px',
                margin: 'auto 0',
              }}
            >
              <div
                style={{
                  width: '52px',
                  height: '52px',
                  borderRadius: '50%',
                  background: '#F0FDFA',
                  border: '1px solid #CCFBF1',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#0D9488',
                }}
              >
                <Waves size={26} />
              </div>
              <div>
                <div
                  style={{
                    fontSize: '1rem',
                    fontWeight: 800,
                    color: '#0F172A',
                    marginBottom: '6px',
                  }}
                >
                  No River Moments Logged Today
                </div>
                <p
                  style={{
                    fontSize: '0.82rem',
                    color: '#64748B',
                    maxWidth: '360px',
                    margin: '0 auto',
                    lineHeight: 1.5,
                  }}
                >
                  The Whole Health River chronologically maps nutrition, posture, physical stress,
                  and symptoms to review recorded timing. Timing alone does not establish a cause.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddSheet(true)}
                style={{
                  background: 'linear-gradient(135deg, #0D9488 0%, #0F766E 100%)',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '10px 18px',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer',
                  marginTop: '4px',
                  boxShadow: '0 4px 12px rgba(13, 148, 136, 0.25)',
                }}
              >
                <Plus size={15} />
                <span>Add First Moment</span>
              </button>
            </div>
          ) : (
            filteredMoments.map((moment, _idx) => {
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
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '11px', fontWeight: 800, color: '#0F766E' }}>
                          {moment.time}
                        </span>
                        <span
                          style={{
                            fontSize: '10px',
                            fontWeight: 700,
                            padding: '2px 7px',
                            borderRadius: '6px',
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
                            color: '#0D9488',
                            background: '#CCFBF1',
                            padding: '2px 6px',
                            borderRadius: '6px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '3px',
                          }}
                        >
                          <GitMerge size={10} /> Causal Node
                        </span>
                      )}
                    </div>

                    <div style={{ fontSize: '13.5px', fontWeight: 800, color: '#0F172A' }}>
                      {moment.title}
                    </div>

                    {/* Chips */}
                    <div
                      style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginTop: '2px' }}
                    >
                      {moment.items.map((item, i) => (
                        <span
                          key={i}
                          style={{
                            fontSize: '11px',
                            padding: '3px 8px',
                            borderRadius: '8px',
                            background: isHighlightedCausal ? '#FFFFFF' : '#F1F5F9',
                            color: '#334155',
                            fontWeight: 600,
                            border: isHighlightedCausal ? '1px solid #CCFBF1' : 'none',
                          }}
                        >
                          {item}
                        </span>
                      ))}
                    </div>

                    {moment.notes && (
                      <div
                        style={{
                          fontSize: '11.5px',
                          color: '#64748B',
                          fontStyle: 'italic',
                          marginTop: '2px',
                        }}
                      >
                        “{moment.notes}”
                      </div>
                    )}

                    {/* Special Link Prompt if Causal Reaction */}
                    {moment.isCausalReaction &&
                      (() => {
                        const linkedTrigger = moments.find(
                          (m) =>
                            m.causalConnectionId === moment.causalConnectionId && m.isCausalTrigger
                        );
                        const triggerLabel = linkedTrigger
                          ? `${linkedTrigger.time} ${linkedTrigger.title}`
                          : 'Upstream trigger';
                        const reactionLabel = `${moment.time} ${moment.title}`;
                        return (
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
                            <div
                              style={{
                                fontSize: '11px',
                                color: '#0F766E',
                                fontWeight: 700,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '5px',
                              }}
                            >
                              <Sparkles size={12} /> Causal link: {triggerLabel} ➔ {reactionLabel}
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                triggerHapticLight();
                                onClose();
                                if (onAskAvaAboutConnection) {
                                  onAskAvaAboutConnection(triggerLabel, reactionLabel);
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
                        );
                      })()}
                  </div>
                </div>
              );
            })
          )}
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
            {filteredMoments.length} moment{filteredMoments.length === 1 ? '' : 's'} tracked today
            {moments.some((m) => m.isCausalReaction) ? ' · recorded link' : ''}
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
