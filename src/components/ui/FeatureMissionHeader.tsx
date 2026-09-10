import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldAlert,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Layers,
  CheckCircle2,
  Workflow,
  HelpCircle,
} from 'lucide-react';
import {
  FeatureId,
  getFeatureContract,
  HandoffRoute,
} from '../../services/FeatureArchitectureContract';
import { triggerHapticLight, triggerHapticSuccess } from '../../services/haptics';
import { useIsMobile } from '../../hooks/useIsMobile';

export interface FeatureMissionHeaderProps {
  featureId: FeatureId;
  activeCaseId?: string;
  customAction?: React.ReactNode;
  showHandoffs?: boolean;
  style?: React.CSSProperties;
  onNavigateTab?: (tabKey: string) => void;
}

export const FeatureMissionHeader: React.FC<FeatureMissionHeaderProps> = ({
  featureId,
  activeCaseId,
  customAction,
  showHandoffs = true,
  style,
  onNavigateTab,
}) => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const contract = getFeatureContract(featureId);
  const [isExpanded, setIsExpanded] = useState(false);

  const handleHandoffClick = (handoff: HandoffRoute) => {
    triggerHapticSuccess();
    if (handoff.targetTab && onNavigateTab) {
      onNavigateTab(handoff.targetTab);
      return;
    }

    let targetUrl = handoff.route;
    if (activeCaseId && (handoff.route.includes('/app/cases') || handoff.route.includes('/app/case-prep') || handoff.route.includes('/app/ava'))) {
      if (handoff.route === '/app/cases') {
        targetUrl = `/app/cases/${encodeURIComponent(activeCaseId)}`;
      } else if (handoff.route === '/app/case-prep') {
        targetUrl = `/app/case-prep?caseId=${encodeURIComponent(activeCaseId)}`;
      } else if (handoff.route === '/app/ava') {
        targetUrl = `/app/ava?caseId=${encodeURIComponent(activeCaseId)}`;
      }
    }
    navigate(targetUrl);
  };

  return (
    <div
      className="feature-mission-header"
      style={{
        background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.96) 0%, rgba(248, 250, 252, 0.92) 100%)',
        border: '1.5px solid #E2E8F0',
        borderRadius: 20,
        padding: isMobile ? '16px 14px' : '20px 24px',
        marginBottom: 20,
        boxShadow: '0 4px 20px rgba(15, 23, 42, 0.04), inset 0 1px 2px #FFFFFF',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        position: 'relative',
        overflow: 'hidden',
        ...style,
      }}
    >
      {/* Ambient soft glow matching feature badge accent */}
      <div
        style={{
          position: 'absolute',
          top: -40,
          right: -40,
          width: 140,
          height: 140,
          borderRadius: '50%',
          background: contract.badgeColor.accent,
          opacity: 0.07,
          filter: 'blur(40px)',
          pointerEvents: 'none',
        }}
      />

      {/* Top Meta Bar: Stage capsule + Feature Identity + Expand/Collapse */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 10,
          marginBottom: 10,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span
            style={{
              fontSize: 11,
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.6px',
              padding: '3px 10px',
              borderRadius: 999,
              background: contract.badgeColor.bg,
              color: contract.badgeColor.text,
              border: `1px solid ${contract.badgeColor.border}`,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                backgroundColor: contract.badgeColor.accent,
                display: 'inline-block',
              }}
            />
            {contract.shortLabel} • {contract.pipelineStage}
          </span>

          {activeCaseId && (
            <span
              style={{
                fontSize: 11,
                color: '#64748B',
                fontWeight: 600,
                background: '#F1F5F9',
                padding: '3px 8px',
                borderRadius: 6,
              }}
            >
              Case: <code style={{ color: '#0F172A', fontWeight: 700 }}>{activeCaseId.slice(0, 12)}</code>
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {customAction}
          <button
            type="button"
            onClick={() => {
              triggerHapticLight();
              setIsExpanded(!isExpanded);
            }}
            aria-expanded={isExpanded}
            aria-label="Toggle feature mission boundaries"
            style={{
              background: 'transparent',
              border: 'none',
              color: '#64748B',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              fontSize: 12,
              fontWeight: 600,
              padding: '4px 6px',
              borderRadius: 6,
            }}
          >
            <HelpCircle size={14} color="#64748B" />
            <span>{isExpanded ? 'Hide Specs' : 'Feature Scope'}</span>
            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
      </div>

      {/* Hero Unique Driving Question (Point 2 Core Specification) */}
      <div style={{ marginBottom: 12 }}>
        <h2
          style={{
            fontSize: isMobile ? 18 : 22,
            fontWeight: 800,
            color: '#0F172A',
            letterSpacing: '-0.3px',
            lineHeight: 1.3,
            margin: '0 0 6px 0',
          }}
        >
          <span style={{ color: contract.badgeColor.accent, marginRight: 6 }}>“</span>
          {contract.uniqueQuestion}
          <span style={{ color: contract.badgeColor.accent, marginLeft: 2 }}>”</span>
        </h2>

        {/* What it Owns & Produces (High-density concise summary) */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: isMobile ? 6 : 14,
            fontSize: 13,
            color: '#475569',
          }}
        >
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <strong style={{ color: '#0F172A', fontWeight: 700 }}>Owns:</strong>
            <span>{contract.owns}</span>
          </div>
          <span style={{ color: '#CBD5E1' }}>•</span>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <strong style={{ color: '#0F172A', fontWeight: 700 }}>Produces:</strong>
            <span>{contract.produces}</span>
          </div>
        </div>
      </div>

      {/* Strict Non-Duplication Guardrail Banner */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          background: 'rgba(241, 245, 249, 0.75)',
          border: '1px solid #E2E8F0',
          borderRadius: 10,
          padding: '8px 12px',
          fontSize: 12,
          color: '#334155',
          marginTop: 10,
          flexWrap: 'wrap',
        }}
      >
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            fontWeight: 700,
            color: '#DC2626',
            fontSize: 11,
            textTransform: 'uppercase',
            letterSpacing: '0.4px',
          }}
        >
          <ShieldAlert size={13} color="#DC2626" /> Strict Boundary:
        </span>
        <span style={{ fontWeight: 500 }}>Must NOT duplicate {contract.mustNotDuplicate}.</span>
      </div>

      {/* Expandable Technical Contract Details */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            style={{
              overflow: 'hidden',
              marginTop: 14,
              paddingTop: 14,
              borderTop: '1px dashed #CBD5E1',
            }}
          >
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
                gap: 12,
                fontSize: 12,
              }}
            >
              <div
                style={{
                  background: '#FFFFFF',
                  padding: '10px 12px',
                  borderRadius: 10,
                  border: '1px solid #E2E8F0',
                }}
              >
                <div style={{ fontWeight: 700, color: '#0F172A', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Layers size={13} color="#0F766E" /> Upstream Information Feeds
                </div>
                {contract.upstreamFeeds.map((feed, idx) => (
                  <div key={idx} style={{ color: '#64748B', lineHeight: 1.4, marginTop: 4 }}>
                    • <strong style={{ color: '#334155' }}>{feed.label}:</strong> {feed.artifactType}
                  </div>
                ))}
              </div>

              <div
                style={{
                  background: '#FFFFFF',
                  padding: '10px 12px',
                  borderRadius: 10,
                  border: '1px solid #E2E8F0',
                }}
              >
                <div style={{ fontWeight: 700, color: '#0F172A', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Workflow size={13} color="#2563EB" /> Downstream Output Consumers
                </div>
                {contract.downstreamHandoffs.map((handoff, idx) => (
                  <div key={idx} style={{ color: '#64748B', lineHeight: 1.4, marginTop: 4 }}>
                    • <strong style={{ color: '#334155' }}>{handoff.label}:</strong> {handoff.actionDescription}
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Downstream Action Handoffs Bar */}
      {showHandoffs && contract.downstreamHandoffs.length > 0 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 8,
            marginTop: 14,
            paddingTop: 12,
            borderTop: '1px solid rgba(226, 232, 240, 0.8)',
          }}
        >
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: '#64748B',
              textTransform: 'uppercase',
              letterSpacing: '0.6px',
            }}
          >
            Pipeline Next Steps:
          </span>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {contract.downstreamHandoffs.map((handoff, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleHandoffClick(handoff)}
                title={handoff.actionDescription}
                style={{
                  background: '#FFFFFF',
                  border: '1px solid #CBD5E1',
                  color: '#0F172A',
                  padding: '6px 12px',
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  boxShadow: '0 1px 3px rgba(15, 23, 42, 0.05)',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = contract.badgeColor.accent;
                  e.currentTarget.style.color = contract.badgeColor.accent;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#CBD5E1';
                  e.currentTarget.style.color = '#0F172A';
                }}
              >
                <span>{handoff.label}</span>
                <ArrowRight size={13} />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
