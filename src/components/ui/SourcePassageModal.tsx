import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  FileText,
  Check,
  Copy,
  ExternalLink,
  ShieldCheck,
  Search,
  AlertTriangle,
  UploadCloud,
  Edit3,
  RotateCcw,
} from 'lucide-react';
import { getCase, updateExtractedFindingCorrection } from '../../services/CaseEngine';
import { loadOriginalCaseFile, reattachOriginalCaseFile, FileStorageError } from '../../services/caseRecordFiles';
import { triggerHapticLight, triggerHapticSuccess } from '../../services/haptics';
import FocusTrap from './FocusTrap';

export interface SourcePassageModalProps {
  isOpen: boolean;
  caseId?: string | null;
  recordId?: string | null;
  findingId?: string | null;
  onClose: () => void;
  recordTitle: string;
  recordType?: string;
  pageNumber?: number;
  sectionTitle?: string;
  passageText: string;
  fullFindings?: string;
  dateAdded?: string;
  findingClaim?: string;
  extractedBiomarker?: {
    biomarker?: string;
    value?: string;
    unit?: string;
    standardRange?: string;
    reportDate?: string;
  };
  onCorrectionSaved?: (updatedText: string) => void;
}

export const SourcePassageModal: React.FC<SourcePassageModalProps> = ({
  isOpen,
  caseId,
  recordId,
  findingId,
  onClose,
  recordTitle,
  recordType = 'Clinical Lab / Encounter Record',
  pageNumber,
  sectionTitle = 'Document Passage',
  passageText: initialPassageText,
  fullFindings,
  dateAdded,
  findingClaim,
  extractedBiomarker,
  onCorrectionSaved,
}) => {
  const [copied, setCopied] = useState(false);
  const [originalUrl, setOriginalUrl] = useState<string | null>(null);
  const [fileAvailable, setFileAvailable] = useState<boolean | null>(null);
  const [isReattaching, setIsReattaching] = useState(false);
  const [reattachError, setReattachError] = useState<string | null>(null);
  const [reattachSuccess, setReattachSuccess] = useState(false);

  // Correction state
  const [currentPassageText, setCurrentPassageText] = useState(initialPassageText);
  const [isEditing, setIsEditing] = useState(false);
  const [editMarker, setEditMarker] = useState(extractedBiomarker?.biomarker || '');
  const [editValue, setEditValue] = useState(extractedBiomarker?.value || '');
  const [editUnit, setEditUnit] = useState(extractedBiomarker?.unit || '');
  const [editRange, setEditRange] = useState(extractedBiomarker?.standardRange || '');
  const [editPassageText, setEditPassageText] = useState(initialPassageText);
  const [editNote, setEditNote] = useState('');
  const [correctionSavedNotice, setCorrectionSavedNotice] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setCurrentPassageText(initialPassageText);
    setEditPassageText(initialPassageText);
  }, [initialPassageText]);

  useEffect(() => {
    let active = true;
    let objectUrl: string | undefined;
    setOriginalUrl(null);
    setFileAvailable(null);
    setReattachError(null);
    setReattachSuccess(false);

    const currentCase = caseId ? getCase(caseId) : null;
    const resolvedRecord = currentCase?.medicalRecords?.find(
      r => r.id === recordId || r.filename === recordTitle || (recordId && r.id === recordId)
    );

    if (resolvedRecord && caseId && isOpen) {
      loadOriginalCaseFile(caseId, resolvedRecord.id)
        .then(file => {
          if (!active) return;
          if (file) {
            objectUrl = URL.createObjectURL(file);
            setOriginalUrl(objectUrl);
            setFileAvailable(true);
          } else {
            setFileAvailable(false);
          }
        })
        .catch(() => {
          if (active) setFileAvailable(false);
        });
    } else if (isOpen) {
      setFileAvailable(false);
    }

    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [caseId, recordId, recordTitle, isOpen]);

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
    const pageLabel = (pageNumber !== undefined && pageNumber !== null && Number.isInteger(pageNumber) && pageNumber > 0)
      ? `Page ${pageNumber}`
      : 'Page unknown';
    navigator.clipboard.writeText(`"${currentPassageText}"\n— Source: ${recordTitle} (${pageLabel})`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !caseId) return;

    setIsReattaching(true);
    setReattachError(null);

    const currentCase = getCase(caseId);
    const resolvedRecord = currentCase?.medicalRecords?.find(
      r => r.id === recordId || r.filename === recordTitle
    );
    const targetRecordId = resolvedRecord?.id || recordId;

    if (!targetRecordId) {
      setReattachError('Cannot identify the record for this document.');
      setIsReattaching(false);
      return;
    }

    try {
      await reattachOriginalCaseFile(caseId, targetRecordId, file);
      const newUrl = URL.createObjectURL(file);
      setOriginalUrl(newUrl);
      setFileAvailable(true);
      setReattachSuccess(true);
      triggerHapticSuccess();
      setTimeout(() => setReattachSuccess(false), 3000);
    } catch (err: any) {
      if (err instanceof FileStorageError) {
        setReattachError(err.message);
      } else {
        setReattachError('Could not save original document on this device.');
      }
    } finally {
      setIsReattaching(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSaveCorrection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!caseId) return;

    const currentCase = getCase(caseId);
    const resolvedRecord = currentCase?.medicalRecords?.find(
      r => r.id === recordId || r.filename === recordTitle
    );
    const targetRecordId = resolvedRecord?.id || recordId || recordTitle;
    const targetFindingId = findingId || resolvedRecord?.passages?.[0]?.id || targetRecordId;

    const updatedCase = updateExtractedFindingCorrection(caseId, targetRecordId, targetFindingId, {
      correctedText: editPassageText.trim(),
      biomarker: editMarker.trim(),
      value: editValue.trim(),
      unit: editUnit.trim(),
      standardRange: editRange.trim(),
      note: editNote.trim(),
    });

    if (updatedCase) {
      triggerHapticSuccess();
      setCurrentPassageText(editPassageText.trim());
      setIsEditing(false);
      setCorrectionSavedNotice(true);
      onCorrectionSaved?.(editPassageText.trim());
      setTimeout(() => setCorrectionSavedNotice(false), 3000);
    }
  };

  const hasValidPage = pageNumber !== undefined && pageNumber !== null && Number.isInteger(pageNumber) && pageNumber > 0;

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
            maxWidth: '600px',
            maxHeight: '92vh',
            background: '#FFFFFF',
            borderRadius: '24px',
            border: '1.5px solid rgba(186, 230, 253, 0.85)',
            boxShadow: '0 20px 50px rgba(15, 23, 42, 0.25), 0 0 0 1px rgba(255, 255, 255, 0.1)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          <FocusTrap isActive={isOpen} onEscape={onClose} style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
            {/* Refractive Translucent Header */}
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

            {/* Device Storage Status & Reattach Callout */}
            {fileAvailable === true && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  borderRadius: '12px',
                  background: '#F0FDF4',
                  border: '1px solid #BBF7D0',
                  fontSize: '11.5px',
                  color: '#166534',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ShieldCheck size={16} color="#16A34A" style={{ flexShrink: 0 }} />
                  <span>Original file stored locally on this device.</span>
                </div>
                {originalUrl && (
                  <a
                    href={originalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      color: '#0284C7',
                      fontWeight: 700,
                      textDecoration: 'none',
                      fontSize: '11px',
                    }}
                  >
                    <span>View original</span>
                    <ExternalLink size={12} />
                  </a>
                )}
              </div>
            )}

            {fileAvailable === false && (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  padding: '12px 14px',
                  borderRadius: '12px',
                  background: '#FFFBEB',
                  border: '1px solid #FDE68A',
                  fontSize: '12px',
                  color: '#92400E',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                  <AlertTriangle size={16} color="#D97706" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <div style={{ flex: 1 }}>
                    <strong style={{ display: 'block', color: '#B45309' }}>Original file unavailable on this device</strong>
                    <span style={{ fontSize: '11.5px', color: '#78350F' }}>
                      This document was uploaded on another device or storage was cleared. Extracted findings and case reasoning remain intact.
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px' }}>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isReattaching}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '6px 12px',
                      borderRadius: '8px',
                      background: '#F59E0B',
                      color: '#FFFFFF',
                      border: 'none',
                      fontSize: '11.5px',
                      fontWeight: 700,
                      cursor: isReattaching ? 'wait' : 'pointer',
                    }}
                  >
                    <UploadCloud size={14} />
                    <span>{isReattaching ? 'Reattaching...' : 'Reattach original file'}</span>
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="application/pdf,image/jpeg,image/png,image/webp"
                    style={{ display: 'none' }}
                    onChange={handleFileSelect}
                  />
                  {reattachSuccess && (
                    <span style={{ fontSize: '11.5px', color: '#16A34A', fontWeight: 700 }}>
                      Original reattached!
                    </span>
                  )}
                  {reattachError && (
                    <span style={{ fontSize: '11.5px', color: '#DC2626', fontWeight: 600 }}>
                      {reattachError}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Structured Extraction Overview Banner */}
            <div
              style={{
                background: '#F8FAFC',
                borderRadius: '12px',
                padding: '12px 14px',
                border: '1px solid #E2E8F0',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '10.5px', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>
                  Structured Extracted Information
                </span>
                {!isEditing && (
                  <button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '11px',
                      fontWeight: 700,
                      color: '#0284C7',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '2px 6px',
                      borderRadius: '6px',
                    }}
                  >
                    <Edit3 size={13} />
                    <span>Correct extraction</span>
                  </button>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px', fontSize: '12px' }}>
                <div>
                  <span style={{ color: '#64748B', display: 'block', fontSize: '10px', textTransform: 'uppercase' }}>Marker / Finding</span>
                  <strong style={{ color: '#0F172A' }}>{editMarker || findingClaim || 'General Finding'}</strong>
                </div>
                <div>
                  <span style={{ color: '#64748B', display: 'block', fontSize: '10px', textTransform: 'uppercase' }}>Extracted Value</span>
                  <strong style={{ color: '#0F172A' }}>{editValue || 'See text'}</strong>
                </div>
                <div>
                  <span style={{ color: '#64748B', display: 'block', fontSize: '10px', textTransform: 'uppercase' }}>Unit</span>
                  <strong style={{ color: '#0F172A' }}>{editUnit || '—'}</strong>
                </div>
                <div>
                  <span style={{ color: '#64748B', display: 'block', fontSize: '10px', textTransform: 'uppercase' }}>Reference Range</span>
                  <strong style={{ color: '#0F172A' }}>{editRange || 'Not provided'}</strong>
                </div>
                <div>
                  <span style={{ color: '#64748B', display: 'block', fontSize: '10px', textTransform: 'uppercase' }}>Report Date</span>
                  <strong style={{ color: '#0F172A' }}>{dateAdded || 'Preserved string'}</strong>
                </div>
                {hasValidPage && (
                  <div>
                    <span style={{ color: '#64748B', display: 'block', fontSize: '10px', textTransform: 'uppercase' }}>Page</span>
                    <strong style={{ color: '#0F172A' }}>Page {pageNumber}</strong>
                  </div>
                )}
              </div>

              {correctionSavedNotice && (
                <div style={{ fontSize: '11px', color: '#16A34A', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Check size={14} />
                  <span>Correction saved to case. Original document wording remains untouched.</span>
                </div>
              )}
            </div>

            {/* Document Metadata Bar */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', color: '#64748B' }}>
                <FileText size={14} color="#0284C7" />
                <span>Type: <strong>{recordType}</strong></span>
                {hasValidPage && <span>• Page {pageNumber}</span>}
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

            {/* Non-Destructive User Correction Form */}
            {isEditing ? (
              <form
                onSubmit={handleSaveCorrection}
                style={{
                  background: '#F0FDF4',
                  borderRadius: '12px',
                  padding: '14px',
                  border: '1.5px solid #86EFAC',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '11px', fontWeight: 800, color: '#166534', textTransform: 'uppercase' }}>
                    Edit Extracted Details (Non-Destructive)
                  </span>
                  <span style={{ fontSize: '10px', color: '#4ADE80', fontWeight: 600 }}>
                    Raw source document is never altered
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div>
                    <label style={{ fontSize: '10.5px', fontWeight: 700, color: '#15803D', display: 'block', marginBottom: '2px' }}>
                      Marker / Finding Name
                    </label>
                    <input
                      type="text"
                      value={editMarker}
                      onChange={(e) => setEditMarker(e.target.value)}
                      placeholder="e.g. Glucose"
                      style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #BBF7D0', fontSize: '12px' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '10.5px', fontWeight: 700, color: '#15803D', display: 'block', marginBottom: '2px' }}>
                      Numeric / Extracted Value
                    </label>
                    <input
                      type="text"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      placeholder="e.g. 12"
                      style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #BBF7D0', fontSize: '12px' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div>
                    <label style={{ fontSize: '10.5px', fontWeight: 700, color: '#15803D', display: 'block', marginBottom: '2px' }}>
                      Unit (exact printed)
                    </label>
                    <input
                      type="text"
                      value={editUnit}
                      onChange={(e) => setEditUnit(e.target.value)}
                      placeholder="e.g. mg/dL"
                      style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #BBF7D0', fontSize: '12px' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '10.5px', fontWeight: 700, color: '#15803D', display: 'block', marginBottom: '2px' }}>
                      Printed Reference Interval
                    </label>
                    <input
                      type="text"
                      value={editRange}
                      onChange={(e) => setEditRange(e.target.value)}
                      placeholder="e.g. 70 - 99"
                      style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #BBF7D0', fontSize: '12px' }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '10.5px', fontWeight: 700, color: '#15803D', display: 'block', marginBottom: '2px' }}>
                    Corrected Passage Text
                  </label>
                  <textarea
                    rows={3}
                    value={editPassageText}
                    onChange={(e) => setEditPassageText(e.target.value)}
                    style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #BBF7D0', fontSize: '12px' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '10.5px', fontWeight: 700, color: '#15803D', display: 'block', marginBottom: '2px' }}>
                    Correction Reason / Note (Optional)
                  </label>
                  <input
                    type="text"
                    value={editNote}
                    onChange={(e) => setEditNote(e.target.value)}
                    placeholder="e.g. Corrected OCR typo on printed value"
                    style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #BBF7D0', fontSize: '12px' }}
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'flex-end', marginTop: '4px' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditing(false);
                      setEditPassageText(currentPassageText);
                    }}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '8px',
                      border: '1px solid #CBD5E1',
                      background: '#FFFFFF',
                      fontSize: '11.5px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    style={{
                      padding: '6px 14px',
                      borderRadius: '8px',
                      background: '#16A34A',
                      color: '#FFFFFF',
                      border: 'none',
                      fontSize: '11.5px',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    Save Correction
                  </button>
                </div>
              </form>
            ) : (
              /* Exact Highlighted Passage */
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
                  "{currentPassageText}"
                </div>
              </div>
            )}

            {/* Surrounding Document Context (If available) */}
            {fullFindings && fullFindings !== currentPassageText && (
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
                <strong>Source context:</strong> Check this text against the original record. A stored summary or AI extraction is not independent clinical verification.
              </span>
            </div>
          </div>
          </FocusTrap>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
};
