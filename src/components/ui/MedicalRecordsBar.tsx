import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Plus, X, UploadCloud, CheckCircle2, FileUp } from 'lucide-react';

export function MedicalRecordsBar({ records = [], onAddRecord, onRemoveRecord }) {
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [findings, setFindings] = useState('');
  const fileInputRef = useRef<any>(null);

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setIsUploading(true);
    }
  };

  const handleSaveRecord = () => {
    if (selectedFile && findings.trim()) {
      onAddRecord({
        id: Date.now().toString(),
        filename: selectedFile.name,
        findings: findings.trim(),
      });
      setIsUploading(false);
      setSelectedFile(null);
      setFindings('');
    }
  };

  return (
    <div
      style={{
        marginTop: '24px',
        background: '#FFFFFF',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid #E2E8F0',
        padding: '20px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              padding: '8px',
              background: '#F0FDF4',
              borderRadius: '10px',
              color: '#16A34A',
            }}
          >
            <FileText size={20} />
          </div>
          <div>
            <h3
              style={{ fontSize: '15px', fontWeight: 700, color: '#1E293B', margin: '0 0 2px 0' }}
            >
              Medical Records & Diagnostics
            </h3>
            <p style={{ fontSize: '12px', color: '#64748B', margin: 0 }}>
              Upload blood tests, MRIs, etc. These act as an "extra doctor" during correlation.
            </p>
          </div>
        </div>
        <button
          onClick={() => fileInputRef.current?.click()}
          style={{
            padding: '10px 16px',
            background: '#F8FAFC',
            border: '1px dashed #94A3B8',
            borderRadius: '10px',
            color: '#475569',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'all 0.2s',
          }}
        >
          <Plus size={16} /> Add Record
        </button>
        <input
          type="file"
          ref={fileInputRef}
          style={{ opacity: 0, width: 0, height: 0, position: 'absolute' }}
          onChange={handleFileSelect}
          accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
        />
      </div>

      <AnimatePresence>
        {isUploading && (
          <motion.div
            key="upload_panel"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            style={{ overflow: 'hidden' }}
          >
            <div
              style={{
                padding: '16px',
                background: '#F8FAFC',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid #E2E8F0',
                marginBottom: '16px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '12px',
                  color: '#1E293B',
                  fontWeight: 600,
                  fontSize: '13px',
                }}
              >
                <FileUp size={16} color="#6366F1" />
                {selectedFile?.name} uploaded successfully.
              </div>
              <p style={{ fontSize: '12px', color: '#64748B', marginBottom: '8px', marginTop: 0 }}>
                To assist the AI, please summarize the key findings or abnormal results from this
                document:
              </p>
              <textarea
                value={findings}
                onChange={(e) => setFindings(e.target.value)}
                placeholder="e.g., Elevated WBC count, mild disc bulge at L4-L5..."
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  fontSize: '13px',
                  minHeight: '60px',
                  outline: 'none',
                  fontFamily: 'inherit',
                  resize: 'vertical',
                }}
              />
              <div
                style={{
                  display: 'flex',
                  gap: '8px',
                  marginTop: '12px',
                  justifyContent: 'flex-end',
                }}
              >
                <button
                  onClick={() => {
                    setIsUploading(false);
                    setSelectedFile(null);
                    setFindings('');
                  }}
                  style={{
                    padding: '8px 16px',
                    background: '#FFFFFF',
                    border: '1px solid #E2E8F0',
                    borderRadius: '8px',
                    color: '#64748B',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveRecord}
                  disabled={!findings.trim()}
                  style={{
                    padding: '8px 16px',
                    background: '#6366F1',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#FFF',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: findings.trim() ? 'pointer' : 'not-allowed',
                    opacity: findings.trim() ? 1 : 0.6,
                  }}
                >
                  Save Findings
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {records?.length > 0 && (
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          {records.map((record) => (
            <div
              key={record.id}
              style={{
                display: 'flex',
                flexDirection: 'column',
                padding: '12px',
                background: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: 'var(--radius-lg)',
                flexBasis: '200px',
                flexGrow: 1,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  marginBottom: '8px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '12px',
                    fontWeight: 700,
                    color: '#334155',
                  }}
                >
                  <CheckCircle2 size={14} color="#10B981" />
                  {record.filename}
                </div>
                <button
                  onClick={() => onRemoveRecord(record.id)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#94A3B8',
                    cursor: 'pointer',
                    padding: '2px',
                  }}
                  aria-label="Remove record"
                >
                  <X size={14} />
                </button>
              </div>
              <div
                style={{
                  fontSize: '12px',
                  color: '#64748B',
                  lineHeight: 1.4,
                  background: '#FFFFFF',
                  padding: '8px',
                  borderRadius: '8px',
                  border: '1px solid #F1F5F9',
                }}
              >
                <strong style={{ color: '#475569' }}>Findings:</strong> {record.findings}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
