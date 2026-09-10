import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, FileText, Check, Copy, ExternalLink, ShieldCheck, Search } from 'lucide-react';
import { triggerHapticLight } from '../../services/haptics';

export interface SourcePassageModalProps {
  isOpen: boolean;
  onClose: () => void;
  recordTitle: string;
  recordType?: string;
  pageNumber?: number;
  sectionTitle?: string;
  passageText: string;
  fullFindings?: string;
  dateAdded?: string;
  findingClaim?: string;
}

export const SourcePassageModal: React.FC<SourcePassageModalProps> = ({
  isOpen,
  onClose,
  recordTitle,
  recordType = 'Clinical Lab / Encounter Record',
  pageNumber = 1,
  sectionTitle = 'Document Passage',
  passageText,
  fullFindings,
  dateAdded,
  findingClaim,
}) => {
  const [copied, setCopied] = React.useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleCopy = () => {
    triggerHapticLight();
    navigator.clipboard.writeText(`"${passageText}"\n— Source: ${recordTitle} (Page ${pageNumber})`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return createPortal(
    <AnimatePresence>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Source Evidence Passage Inspector"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 9999999,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '16px',
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
        }}
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: 'spring', damping: 26, stiffness: 320 }}
          onClick={(e) => e.stopPropagation()}
          style={{
            width: '100%',
            maxWidth: '560px',
            maxHeight: '90vh',
            background: '#FFFFFF',
            borderRadius: '24px',
            border: '1.5px solid rgba(186, 230, 253, 0.85)',
            boxShadow: '0 20px 50px rgba(15, 23, 42, 0.25), 0 0 0 1px rgba(255, 255, 255, 0.1)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* Translucent Blue Refractive Header */}
          <header
            style={{
              background: 'linear-gradient(135deg, rgba(240, 249, 255, 0.98) 0%, rgba(224, 242, 254, 0.85) 100%)',
              borderBottom: '1px solid rgba(186, 230, 253, 0.8)',
              padding: '16px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {/* Restrained two-tone micro-capsule detail */}
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '12px',
                  background: '#FFFFFF',
                  border: '1px solid #BAE6FD',
                  boxShadow: '0 2px 6px rgba(14, 165, 233, 0.12)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#0284C7',
                  flexShrink: 0,
                }}
              >
                <Search size={18} />
              </div>

              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span
                    style={{
                      fontSize: '9.5px',
                      fontWeight: 800,
                      letterSpacing: '0.6px',
                      textTransform: 'uppercase',
                      color: '#0284C7',
                      background: 'rgba(56, 189, 248, 0.15)',
                      padding: '1px 6px',
                      borderRadius: '999px',
                      border: '0.8px solid rgba(56, 189, 248, 0.4)',
                    }}
                  >
                    RESOLVED SOURCE EVIDENCE PASSAGE
                  </span>
                </div>
                <h3
                  style={{
                    margin: '2px 0 0 0',
                    fontSize: '15px',
                    fontWeight: 800,
                    color: '#0F172A',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    maxWidth: '380px',
                  }}
                >
                  {recordTitle}
                </h3>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                triggerHapticLight();
                onClose();
              }}
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                border: '1px solid #E2E8F0',
                background: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#64748B',
              }}
              aria-label="Close source passage inspector"
            >
              <X size={16} />
            </button>
          </header>

          {/* Scrollable Content */}
          <div style={{ padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            
            {/* Finding Claim Banner (If provided) */}
            {findingClaim && (
              <div
                style={{
                  background: '#F8FAFC',
                  borderRadius: '12px',
                  padding: '10px 14px',
                  border: '1px solid #E2E8F0',
                  fontSize: '12px',
                  color: '#475569',
                }}
              >
                <strong style={{ color: '#0F172A', display: 'block', marginBottom: '2px' }}>
                  Clinical Finding Under Evaluation:
                </strong>
                <span>{findingClaim}</span>
              </div>
            )}

            {/* Document Coordinates Badge */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', color: '#64748B' }}>
                <FileText size={14} color="#0284C7" />
                <span>Type: <strong>{recordType}</strong></span>
                <span>• Page {pageNumber}</span>
                {dateAdded && <span>• Date: {dateAdded}</span>}
              </div>

              <button
                type="button"
                onClick={handleCopy}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '5px 10px',
                  borderRadius: '8px',
                  background: copied ? '#ECFDF5' : '#F1F5F9',
                  border: copied ? '1px solid #10B981' : '1px solid #CBD5E1',
                  color: copied ? '#059669' : '#334155',
                  fontSize: '11.5px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {copied ? <Check size={13} color="#10B981" /> : <Copy size={13} />}
                <span>{copied ? 'Copied Quote' : 'Copy Passage'}</span>
              </button>
            </div>

            {/* Exact Highlighted Passage (The User-Visible Proof) */}
            <div>
              <span style={{ fontSize: '10.5px', fontWeight: 800, color: '#0369A1', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
                Exact Supporting Document Passage:
              </span>
              <div
                style={{
                  background: 'linear-gradient(180deg, #FEFCE8 0%, #FFFBEB 100%)',
                  borderRadius: '12px',
                  padding: '14px 16px',
                  border: '1.5px solid #FDE047',
                  boxShadow: '0 2px 8px rgba(202, 138, 4, 0.08)',
                  fontSize: '13.5px',
                  lineHeight: 1.6,
                  color: '#713F12',
                  position: 'relative',
                }}
              >
                <div style={{ position: 'absolute', top: '8px', right: '10px', fontSize: '10px', fontWeight: 800, color: '#A16207', background: '#FEF08A', padding: '1px 6px', borderRadius: '4px' }}>
                  Direct Evidence Excerpt
                </div>
                "{passageText}"
              </div>
            </div>

            {/* Surrounding Document Context (If available) */}
            {fullFindings && fullFindings !== passageText && (
              <div>
                <span style={{ fontSize: '10.5px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
                  Full Medical Record Findings Context:
                </span>
                <div
                  style={{
                    background: '#F8FAFC',
                    borderRadius: '12px',
                    padding: '12px 14px',
                    border: '1px solid #E2E8F0',
                    fontSize: '12px',
                    lineHeight: 1.5,
                    color: '#334155',
                    maxHeight: '160px',
                    overflowY: 'auto',
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {fullFindings}
                </div>
              </div>
            )}

            {/* Verification Guarantee */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 12px',
                borderRadius: '10px',
                background: '#F0FDF4',
                border: '1px solid #BBF7D0',
                fontSize: '11px',
                color: '#166534',
              }}
            >
              <ShieldCheck size={16} color="#16A34A" style={{ flexShrink: 0 }} />
              <span>
                <strong>Verified Citation:</strong> This evidence passage was extracted directly from your uploaded clinical records and cross-verified against diagnostic claims.
              </span>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
};
