import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldAlert,
  Info,
  CheckCircle2,
  X,
  FileText,
  Clock,
  User,
  Activity,
  Sparkles,
} from 'lucide-react';
import {
  ClinicalInformationCategory,
  CategorizedInformationItem,
  INFORMATION_CATEGORY_REGISTRY,
  validateCategorizedItem,
} from '../../services/ClinicalInformationClassifier';
import { triggerHapticLight } from '../../services/haptics';
import FocusTrap from './FocusTrap';

export interface InformationCategoryBadgeProps {
  category: ClinicalInformationCategory;
  item?: Partial<CategorizedInformationItem>;
  showRoleTooltip?: boolean;
  size?: 'sm' | 'md';
  style?: React.CSSProperties;
}

export const InformationCategoryBadge: React.FC<InformationCategoryBadgeProps> = ({
  category,
  item,
  showRoleTooltip = true,
  size = 'md',
  style,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const spec = INFORMATION_CATEGORY_REGISTRY[category] || INFORMATION_CATEGORY_REGISTRY.user_report;
  const validation = item ? validateCategorizedItem(item as any) : { isValid: true, missingFields: [] };

  const isSmall = size === 'sm';

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          triggerHapticLight();
          if (showRoleTooltip) setIsOpen(true);
        }}
        title={`Category: ${spec.name} • Allowed Role: ${spec.allowedRole}`}
        aria-label={`Clinical category: ${spec.name}. Allowed role: ${spec.allowedRole}`}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: isSmall ? '4px' : '6px',
          background: spec.badgeColors.bg,
          color: spec.badgeColors.text,
          border: `1px solid ${spec.badgeColors.border}`,
          borderRadius: '999px',
          padding: isSmall ? '2px 7px' : '3px 10px',
          fontSize: isSmall ? '10.5px' : '11.5px',
          fontWeight: 700,
          letterSpacing: '0.2px',
          cursor: showRoleTooltip ? 'pointer' : 'default',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
          transition: 'all 0.15s ease',
          ...style,
        }}
      >
        <span>{spec.icon}</span>
        <span>{spec.shortLabel}</span>
        {category === 'extracted_finding' && (item as any)?.extractionStatus === 'provisional' && (
          <span style={{ fontSize: '9.5px', opacity: 0.85, fontWeight: 800 }}>• Provisional</span>
        )}
        {showRoleTooltip && (
          <Info size={isSmall ? 10 : 12} style={{ opacity: 0.7, marginLeft: 1 }} />
        )}
      </button>

      {/* Interactive Allowed Role & Provenance Inspector Modal */}
      <AnimatePresence>
        {isOpen && (
          <FocusTrap isActive={isOpen}>
            <div
              role="dialog"
              aria-modal="true"
              aria-label={`Clinical Information Category: ${spec.name}`}
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: 11000,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(15, 23, 42, 0.55)',
                backdropFilter: 'blur(6px)',
                WebkitBackdropFilter: 'blur(6px)',
                padding: '16px',
              }}
              onClick={() => setIsOpen(false)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                transition={{ duration: 0.18 }}
                onClick={(e) => e.stopPropagation()}
                style={{
                  background: '#FFFFFF',
                  borderRadius: '20px',
                  width: '100%',
                  maxWidth: '480px',
                  boxShadow: '0 20px 40px rgba(15, 23, 42, 0.2)',
                  border: '1.5px solid #E2E8F0',
                  overflow: 'hidden',
                }}
              >
                {/* Header with Category Accent */}
                <div
                  style={{
                    background: spec.badgeColors.bg,
                    borderBottom: `1px solid ${spec.badgeColors.border}`,
                    padding: '16px 20px',
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
                        borderRadius: '10px',
                        background: '#FFFFFF',
                        border: `1px solid ${spec.badgeColors.border}`,
                        display: 'grid',
                        placeItems: 'center',
                        fontSize: '18px',
                      }}
                    >
                      {spec.icon}
                    </div>
                    <div>
                      <div style={{ fontSize: '10.5px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.6px', color: spec.badgeColors.text }}>
                        CLINICAL EPISTEMIC CATEGORY
                      </div>
                      <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#0F172A' }}>
                        {spec.name}
                      </h3>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    style={{
                      background: 'rgba(255, 255, 255, 0.8)',
                      border: '1px solid #CBD5E1',
                      borderRadius: '8px',
                      width: '30px',
                      height: '30px',
                      display: 'grid',
                      placeItems: 'center',
                      cursor: 'pointer',
                    }}
                  >
                    <X size={16} color="#64748B" />
                  </button>
                </div>

                {/* Body Details */}
                <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  
                  {/* Primary Invariant: Allowed Role */}
                  <div
                    style={{
                      background: '#F8FAFC',
                      border: '1.5px solid #E2E8F0',
                      borderRadius: '12px',
                      padding: '14px 16px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                      <ShieldAlert size={15} color={spec.badgeColors.accent} />
                      <span style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.6px', color: '#0F172A' }}>
                        System Invariant: Allowed Role
                      </span>
                    </div>
                    <p style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: spec.badgeColors.text, lineHeight: 1.4 }}>
                      “{spec.allowedRole}”
                    </p>
                    <p style={{ margin: '6px 0 0 0', fontSize: '12px', color: '#64748B', lineHeight: 1.45 }}>
                      This information cannot be conflated with diagnostic ground truth or converted into an unverified diagnosis.
                    </p>
                  </div>

                  {/* Real-World Clinical Example */}
                  <div style={{ fontSize: '12.5px', color: '#475569', lineHeight: 1.5 }}>
                    <strong style={{ color: '#0F172A', display: 'block', marginBottom: '4px' }}>Representative Example:</strong>
                    <div style={{ background: '#F1F5F9', padding: '8px 12px', borderRadius: '8px', fontStyle: 'italic', color: '#334155' }}>
                      {spec.example}
                    </div>
                  </div>

                  {/* Required Information Checklist */}
                  <div>
                    <strong style={{ color: '#0F172A', fontSize: '12px', display: 'block', marginBottom: '6px' }}>
                      Required Provenance Metadata:
                    </strong>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {spec.requiredFields.map((field) => {
                        const isPresent = item && (item as any)[field] !== undefined;
                        return (
                          <span
                            key={field}
                            style={{
                              fontSize: '11px',
                              padding: '3px 8px',
                              borderRadius: '6px',
                              background: isPresent ? '#ECFDF5' : '#F1F5F9',
                              color: isPresent ? '#047857' : '#64748B',
                              border: isPresent ? '1px solid #A7F3D0' : '1px solid #E2E8F0',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontWeight: 600,
                            }}
                          >
                            <CheckCircle2 size={11} color={isPresent ? '#10B981' : '#94A3B8'} />
                            <code>{field}</code>
                          </span>
                        );
                      })}
                    </div>
                  </div>

                  {/* Foundational Rule Citation */}
                  <div
                    style={{
                      borderTop: '1px dashed #CBD5E1',
                      paddingTop: '12px',
                      fontSize: '11px',
                      color: '#64748B',
                      lineHeight: 1.4,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    <span>🛡️</span>
                    <span>
                      <strong>HealthChain Clinical Rule:</strong> A source, an interpretation and a conclusion are different objects—even when they use similar words.
                    </span>
                  </div>
                </div>
              </motion.div>
            </div>
          </FocusTrap>
        )}
      </AnimatePresence>
    </>
  );
};
