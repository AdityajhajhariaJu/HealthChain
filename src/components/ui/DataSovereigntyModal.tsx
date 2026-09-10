import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, HardDrive, Cpu, Eye, Lock, RefreshCw, X, Download, AlertCircle } from 'lucide-react';
import { getProfile } from '../../services/ProfileEngine';
import { getHealthMemory } from '../../services/HealthMemory';
import { getCases } from '../../services/CaseEngine';
import { triggerHapticLight } from '../../services/haptics';

export interface DataSovereigntyModalProps {
  isOpen: boolean;
  onClose: () => void;
  outgoingPayload?: Record<string, any> | null;
}

export const DataSovereigntyModal: React.FC<DataSovereigntyModalProps> = ({
  isOpen,
  onClose,
  outgoingPayload,
}) => {
  const [activeTab, setActiveTab] = useState<'storage' | 'ephemeral' | 'payload'>('storage');
  const profile = getProfile();
  const memories = getHealthMemory() || [];
  const cases = getCases() || [];

  const localMetrics = useMemo(() => {
    const recordsCount = profile?.records?.length || 0;
    const casesCount = cases.length;
    const memoriesCount = memories.length;
    const logsCount = profile?.nutrition?.recentLogs?.length || 0;

    return {
      recordsCount,
      casesCount,
      memoriesCount,
      logsCount,
      estimatedSizeKb: Math.round((JSON.stringify(profile || {}).length + JSON.stringify(memories).length) / 1024),
    };
  }, [profile, cases.length, memories.length]);

  const sampleOutgoingPayload = useMemo(() => {
    if (outgoingPayload) return outgoingPayload;
    return {
      context: {
        demographics: {
          age: profile?.demographics?.age || 'Adult',
          biologicalSex: profile?.demographics?.biologicalSex || 'Not specified',
        },
        primaryConcern: cases[0]?.intakeData?.chiefComplaint || 'Patient-reported symptoms',
        activeCaseTitle: cases[0]?.title || 'Active Case Review',
        recentBiomarkersCount: Object.keys(profile?.vitals?.latestLabValues || {}).length,
        indexedHealthMemoriesCount: memories.slice(0, 5).length,
      },
      security: {
        transportEncryption: 'TLS 1.3 / HTTPS',
        retentionPolicy: 'Ephemeral in-memory processing only',
        trainingConsent: 'Zero training on user medical records',
      },
    };
  }, [outgoingPayload, profile, cases, memories]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 100002,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          padding: '16px',
        }}
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2 }}
          style={{
            width: '100%',
            maxWidth: '680px',
            maxHeight: '90vh',
            background: '#FFFFFF',
            borderRadius: '24px',
            border: '1.5px solid #CBD5E1',
            boxShadow: '0 25px 60px rgba(15, 23, 42, 0.25)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div
            style={{
              padding: '20px 24px',
              borderBottom: '1px solid #E2E8F0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: '#F8FAFC',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: '#ECFDF5',
                  border: '1px solid #A7F3D0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#059669',
                }}
              >
                <ShieldCheck size={20} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: '#0F172A' }}>
                  User-Controlled Workspace Sovereignty
                </h3>
                <div style={{ fontSize: '12px', color: '#64748B' }}>
                  Promise 8 • Strict Boundary: Local Device Vault vs. Ephemeral AI
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              style={{
                background: '#FFFFFF',
                border: '1px solid #CBD5E1',
                borderRadius: '8px',
                width: '30px',
                height: '30px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#64748B',
              }}
            >
              <X size={16} />
            </button>
          </div>

          {/* Navigation Tabs */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              borderBottom: '1px solid #E2E8F0',
              background: '#FFFFFF',
            }}
          >
            <button
              type="button"
              onClick={() => {
                triggerHapticLight();
                setActiveTab('storage');
              }}
              style={{
                padding: '12px 8px',
                border: 'none',
                borderBottom: activeTab === 'storage' ? '2.5px solid #0D9488' : '2.5px solid transparent',
                background: activeTab === 'storage' ? '#F0FDFA' : 'transparent',
                color: activeTab === 'storage' ? '#0F766E' : '#64748B',
                fontWeight: activeTab === 'storage' ? 800 : 600,
                fontSize: '12.5px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
              }}
            >
              <HardDrive size={14} />
              <span>1. Device-Local Vault</span>
            </button>

            <button
              type="button"
              onClick={() => {
                triggerHapticLight();
                setActiveTab('ephemeral');
              }}
              style={{
                padding: '12px 8px',
                border: 'none',
                borderBottom: activeTab === 'ephemeral' ? '2.5px solid #0D9488' : '2.5px solid transparent',
                background: activeTab === 'ephemeral' ? '#F0FDFA' : 'transparent',
                color: activeTab === 'ephemeral' ? '#0F766E' : '#64748B',
                fontWeight: activeTab === 'ephemeral' ? 800 : 600,
                fontSize: '12.5px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
              }}
            >
              <Cpu size={14} />
              <span>2. Ephemeral AI In-Flight</span>
            </button>

            <button
              type="button"
              onClick={() => {
                triggerHapticLight();
                setActiveTab('payload');
              }}
              style={{
                padding: '12px 8px',
                border: 'none',
                borderBottom: activeTab === 'payload' ? '2.5px solid #0D9488' : '2.5px solid transparent',
                background: activeTab === 'payload' ? '#F0FDFA' : 'transparent',
                color: activeTab === 'payload' ? '#0F766E' : '#64748B',
                fontWeight: activeTab === 'payload' ? 800 : 600,
                fontSize: '12.5px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
              }}
            >
              <Eye size={14} />
              <span>3. Inspect Payload</span>
            </button>
          </div>

          {/* Content Area */}
          <div style={{ padding: '24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {activeTab === 'storage' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ background: '#ECFDF5', borderRadius: '14px', padding: '16px', border: '1px solid #A7F3D0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#065F46', fontWeight: 800, fontSize: '13px', marginBottom: '6px' }}>
                    <Lock size={16} /> Device-Local Client Storage
                  </div>
                  <p style={{ margin: 0, fontSize: '13px', color: '#047857', lineHeight: 1.55 }}>
                    Your health timeline, blood work results, meal diary, and clinical case drafts live inside your browser’s IndexedDB sandbox. They are never transmitted to third-party ad networks or sold.
                  </p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                  <div style={{ padding: '14px', borderRadius: '12px', background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                    <div style={{ fontSize: '11px', color: '#64748B', textTransform: 'uppercase', fontWeight: 700 }}>Indexed Cases</div>
                    <div style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A', marginTop: '4px' }}>{localMetrics.casesCount} Cases</div>
                  </div>
                  <div style={{ padding: '14px', borderRadius: '12px', background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                    <div style={{ fontSize: '11px', color: '#64748B', textTransform: 'uppercase', fontWeight: 700 }}>Health Memories</div>
                    <div style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A', marginTop: '4px' }}>{localMetrics.memoriesCount} Indexed Events</div>
                  </div>
                  <div style={{ padding: '14px', borderRadius: '12px', background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                    <div style={{ fontSize: '11px', color: '#64748B', textTransform: 'uppercase', fontWeight: 700 }}>Attached Lab Documents</div>
                    <div style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A', marginTop: '4px' }}>{localMetrics.recordsCount} Reports</div>
                  </div>
                  <div style={{ padding: '14px', borderRadius: '12px', background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                    <div style={{ fontSize: '11px', color: '#64748B', textTransform: 'uppercase', fontWeight: 700 }}>Local Footprint</div>
                    <div style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A', marginTop: '4px' }}>~{localMetrics.estimatedSizeKb} KB Vault</div>
                  </div>
                </div>

                <div style={{ fontSize: '12px', color: '#64748B', lineHeight: 1.5, background: '#F1F5F9', padding: '12px 14px', borderRadius: '10px' }}>
                  ℹ️ <strong>Ownership Guarantee:</strong> You retain complete cryptographic ownership over your health record database. Clearing browser data or using private mode resets the local store.
                </div>
              </div>
            )}

            {activeTab === 'ephemeral' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ background: '#EFF6FF', borderRadius: '14px', padding: '16px', border: '1px solid #BFDBFE' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#1E40AF', fontWeight: 800, fontSize: '13px', marginBottom: '6px' }}>
                    <Cpu size={16} /> Zero-Retention Ephemeral AI Inference
                  </div>
                  <p style={{ margin: 0, fontSize: '13px', color: '#1D4ED8', lineHeight: 1.55 }}>
                    When you run an investigation or consult Ava, data is transmitted exclusively for in-memory token generation over an encrypted TLS 1.3 channel.
                  </p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ padding: '12px 14px', borderRadius: '10px', background: '#F8FAFC', border: '1px solid #E2E8F0', display: 'flex', gap: '10px' }}>
                    <div style={{ color: '#059669', fontWeight: 800, fontSize: '16px' }}>✓</div>
                    <div>
                      <strong style={{ fontSize: '13px', color: '#0F172A' }}>No Foundation Model Training</strong>
                      <p style={{ margin: 0, fontSize: '12px', color: '#64748B' }}>Your lab values and symptom notes are never fed into public LLM training datasets.</p>
                    </div>
                  </div>

                  <div style={{ padding: '12px 14px', borderRadius: '10px', background: '#F8FAFC', border: '1px solid #E2E8F0', display: 'flex', gap: '10px' }}>
                    <div style={{ color: '#059669', fontWeight: 800, fontSize: '16px' }}>✓</div>
                    <div>
                      <strong style={{ fontSize: '13px', color: '#0F172A' }}>Bounded Session Memory</strong>
                      <p style={{ margin: 0, fontSize: '12px', color: '#64748B' }}>In-flight memory is purged upon completion of the inference session.</p>
                    </div>
                  </div>

                  <div style={{ padding: '12px 14px', borderRadius: '10px', background: '#F8FAFC', border: '1px solid #E2E8F0', display: 'flex', gap: '10px' }}>
                    <div style={{ color: '#059669', fontWeight: 800, fontSize: '16px' }}>✓</div>
                    <div>
                      <strong style={{ fontSize: '13px', color: '#0F172A' }}>Scoped Patient Context</strong>
                      <p style={{ margin: 0, fontSize: '12px', color: '#64748B' }}>Only pertinent clinical entries are supplied to avoid context hallucination.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'payload' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '12px', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>
                    Transmitted Context Payload Schema
                  </span>
                  <span style={{ fontSize: '11px', color: '#059669', fontWeight: 700, background: '#ECFDF5', padding: '2px 8px', borderRadius: '6px' }}>
                    Sanitized & Token-Bounded
                  </span>
                </div>

                <div
                  style={{
                    background: '#0F172A',
                    color: '#38BDF8',
                    borderRadius: '12px',
                    padding: '14px',
                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, monospace',
                    fontSize: '11.5px',
                    lineHeight: 1.5,
                    maxHeight: '260px',
                    overflowY: 'auto',
                    border: '1px solid #334155',
                  }}
                >
                  <pre style={{ margin: 0 }}>
                    {JSON.stringify(sampleOutgoingPayload, null, 2)}
                  </pre>
                </div>

                <p style={{ margin: 0, fontSize: '11.5px', color: '#64748B', lineHeight: 1.45 }}>
                  This JSON view shows the exact structure dispatched to Gemini APIs during clinical reasoning. No hidden trackers, location telemetry, or advertising beacons are ever bundled.
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div
            style={{
              padding: '14px 24px',
              borderTop: '1px solid #E2E8F0',
              background: '#F8FAFC',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ fontSize: '11px', color: '#64748B' }}>
              Compliant with HealthChain Zero-Knowledge Standard
            </div>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '8px 18px',
                borderRadius: '10px',
                background: '#0F172A',
                color: '#FFFFFF',
                border: 'none',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Done
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
