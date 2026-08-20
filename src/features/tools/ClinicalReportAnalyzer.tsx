import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText,
  UploadCloud,
  FileType,
  CheckCircle2,
  AlertCircle,
  BookOpen,
  Activity,
  Scan,
  Search,
} from 'lucide-react';
import { analyzeLabReport, runDifferentialAnalysis } from '../../services/geminiService';
import { addEvent, updateVitals, getProfile } from '../../services/ProfileEngine';
import { addEvidenceToActiveCase, updateCaseDifferentials, getActiveCase } from '../../services/CaseEngine';
import { useLocation, useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useIsMobile } from '../../hooks/useIsMobile';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';

let cachedReportAnalyzerState: any = null;

const exampleResult = {
  testName: 'MRI Cervical Dorsal Spine with Whole Spine Screening',
  date: '08-Jul-2026',
  filename: 'Patient_Spine_MRI.pdf',
  keyFindings:
    'The MRI of the spine is largely normal, with no major structural abnormalities in the dorsal or lumbar regions. The only notable finding is a diffuse disc bulge at the C5-C6 level in the neck, which gently presses against the outer protective covering of the spinal cord (thecal sac). The overall impression is reassuring, noting no other significant abnormalities.',
  interpretation:
    'The report indicates a very healthy spine overall. The mild disc bulge at the C5-C6 level in the neck is a common finding and is likely the source of the right-sided neck pain mentioned in your clinical indication. Because there is no severe nerve compression or spinal cord damage, this is not a dangerous condition.',
  recommendations:
    'Share these results with your doctor or a physical therapist. Since the bulge is mild, conservative management such as physical therapy, posture correction, and gentle neck exercises will likely help relieve your right-sided neck pain. You should seek immediate medical attention if you experience weakness, numbness, or loss of bowel/bladder control.',
  abnormalities: [
    'Diffuse disc bulge at the C5-C6 intervertebral disc level, indenting the anterior thecal sac.',
  ],
  extraTerms: [
    {
      term: 'Diffuse disc bulge',
      definition:
        'A condition where an intervertebral disc swells or extends outward evenly beyond its normal space.',
    },
    {
      term: 'Thecal sac',
      definition: 'The protective membrane sheath that surrounds the spinal cord and spinal fluid.',
    },
    {
      term: 'C5-C6',
      definition:
        'The region of the neck representing the joint between the fifth and sixth cervical vertebrae.',
    },
    { term: 'Anterior', definition: 'Refers to the front side of a structure.' },
  ],
  biomarkers: {
    'Vitamin D': { value: 15, unit: 'ng/mL', min: 30, max: 100 },
    'Vitamin B12': { value: 350, unit: 'pg/mL', min: 200, max: 900 },
    'Iron': { value: 45, unit: 'µg/dL', min: 65, max: 176 },
  }
};

export default function ClinicalReportAnalyzer() {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const location = useLocation();
  const activeCase = getActiveCase();
  const returnTo = new URLSearchParams(location.search).get('returnTo');
  const [file, setFile] = useState(cachedReportAnalyzerState?.file || null);
  const [loading, setLoading] = useState(cachedReportAnalyzerState?.loading || false);
  const [result, setResult] = useState(cachedReportAnalyzerState?.result || null);
  const fileInputRef = useRef<any>(null);

  useEffect(() => {
    return () => {
      cachedReportAnalyzerState = { file, loading: false, result };
    };
  }, [file, loading, result]);

  const handleFileChange = async (e) => {
    if (localStorage.getItem('isAuthenticated') !== 'true') {
      const currentCount = parseInt(localStorage.getItem('hc_guest_report_count') || '0', 10) || 0;
      if (currentCount >= 3) {
        window.dispatchEvent(new CustomEvent('hc_require_auth', { 
          detail: { 
            title: 'Guest Limit Reached', 
            message: 'You have reached the guest limit of 3 lab reports. Please log in or sign up to analyze more reports.' 
          } 
        }));
        return;
      }
      try { localStorage.setItem('hc_guest_report_count', (currentCount + 1).toString()); } catch(e) {}
    }

    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Check size limit (e.g. 3MB)
    const ALLOWED = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
    if (!ALLOWED.includes(selectedFile.type)) {
      alert('Unsupported file format. Please upload PDF or images.');
      return;
    }
    if (selectedFile.size > 3 * 1024 * 1024) {
      alert('File size must be less than 3MB.');
      return;
    }

    setFile(selectedFile);
    setLoading(true);
    setResult(null);

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const result = event.target?.result;
        if (typeof result !== 'string') {
          setLoading(false);
          alert('Failed to process file format.');
          return;
        }
        const base64Data = result.split(',')[1];
        const mimeType = selectedFile.type;

      const profile = getProfile() || {};
      const data = await analyzeLabReport(base64Data, mimeType, profile);

      // Add minimum scanning delay for effect (e.g. 2s) to show the cool animation
      await new Promise(r => setTimeout(r, 2000));

      if (data) {
        setResult(data);
        addEvent('lab_report', 'report_analyzer', `Analyzed ${data.testName}`, data, true);

        if (data.biomarkers && Object.keys(data.biomarkers).length > 0) {
          updateVitals(data.biomarkers, 'report_analyzer');
        }

        addEvidenceToActiveCase({
          filename: selectedFile.name,
          findings: `${data.testName}: ${data.keyFindings || data.interpretation || 'Lab report analysed.'}`,
          source: 'clinical_report_analyzer',
          type: 'clinical_report',
        });

        // Auto-trigger DDx analysis
        const activeCase = getActiveCase();
        if (activeCase) {
          runDifferentialAnalysis(activeCase.intakeData, activeCase.medicalRecords, profile).then(results => {
            if (results && Array.isArray(results)) {
              updateCaseDifferentials(activeCase.id, results);
            }
          }).catch(e => console.error('Failed auto DDx:', e));
        }
      } else {
        setResult({
          testName: 'Error reading report',
          date: 'Unknown',
          keyFindings: "We couldn't process this document right now.",
          abnormalities: [],
          interpretation:
            'Please ensure the file is clear and legible. We currently support images (JPEG/PNG) and PDFs.',
          recommendations: 'Try uploading again or consult your doctor.',
          extraTerms: [],
        });
      }
      } catch (err) {
        console.error('Analyzer error:', err);
        setResult({
          testName: 'Processing Error',
          date: 'Unknown',
          keyFindings: "An unexpected error occurred while analyzing the report.",
          abnormalities: [],
          interpretation: 'Our systems encountered an error parsing this document.',
          recommendations: 'Please try again or contact support.',
          extraTerms: [],
        });
      } finally {
        setLoading(false);
      }
    };
    reader.onerror = () => {
      setLoading(false);
      alert('Failed to read file.');
    };

    reader.readAsDataURL(selectedFile);
  };

  const captureLabReport = async () => {
    try {
      const photo = await Camera.getPhoto({
        quality: 90,
        resultType: CameraResultType.Base64,
        source: CameraSource.Prompt,
      });

      if (!photo.base64String) return;

      setLoading(true);
      setResult(null);
      setFile({ name: 'Captured_Image.' + photo.format, type: `image/${photo.format}` });

      const base64Data = photo.base64String;
      const mimeType = `image/${photo.format}`;
      const profile = getProfile() || {};
      const data = await analyzeLabReport(base64Data, mimeType, profile);

      await new Promise(r => setTimeout(r, 2000));

      if (data) {
        setResult(data);
        addEvent('lab_report', 'report_analyzer', `Analyzed ${data.testName}`, data, true);

        if (data.biomarkers && Object.keys(data.biomarkers).length > 0) {
          updateVitals(data.biomarkers, 'report_analyzer');
        }

        addEvidenceToActiveCase({
          filename: 'Captured_Image.' + photo.format,
          findings: `${data.testName}: ${data.keyFindings || data.interpretation || 'Lab report analysed.'}`,
          source: 'clinical_report_analyzer',
          type: 'clinical_report',
        });

        const activeCase = getActiveCase();
        if (activeCase) {
          runDifferentialAnalysis(activeCase.intakeData, activeCase.medicalRecords, profile).then(results => {
            if (results && Array.isArray(results)) {
              updateCaseDifferentials(activeCase.id, results);
            }
          }).catch(e => console.error('Failed auto DDx:', e));
        }
      } else {
        setResult({
          testName: 'Error reading report',
          date: 'Unknown',
          keyFindings: "We couldn't process this document right now.",
          abnormalities: [],
          interpretation:
            'Please ensure the image is clear and legible.',
          recommendations: 'Try capturing again or consult your doctor.',
          extraTerms: [],
        });
      }
    } catch (err) {
      console.error('Camera error:', err);
      setLoading(false);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e: any) => {
    if (localStorage.getItem('isAuthenticated') !== 'true') {
      const currentCount = parseInt(localStorage.getItem('hc_guest_report_count') || '0', 10) || 0;
      if (currentCount >= 3) {
        window.dispatchEvent(new CustomEvent('hc_require_auth', { 
          detail: { 
            title: 'Guest Limit Reached', 
            message: 'You have reached the guest limit of 3 lab reports. Please log in or sign up to analyze more reports.' 
          } 
        }));
        return;
      }
      try { localStorage.setItem('hc_guest_report_count', (currentCount + 1).toString()); } catch(e) {}
    }

    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      if (fileInputRef.current) {
        fileInputRef.current.files = e.dataTransfer.files;
      }
      // Manually trigger the change event
      handleFileChange({ target: { files: e.dataTransfer.files } });
    }
  };

  return (
    <div style={{ padding: '0 0 40px 0', maxWidth: '900px', margin: '0 auto' }}>
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'radial-gradient(circle at 0% 0%, rgba(219, 234, 254, 0.8) 0%, transparent 50%), radial-gradient(circle at 100% 100%, rgba(233, 213, 255, 0.8) 0%, transparent 50%), radial-gradient(circle at 100% 0%, rgba(204, 251, 241, 0.8) 0%, transparent 50%)', zIndex: -1, pointerEvents: 'none', filter: 'blur(60px)' }} />
        {/* Header Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          background: 'rgba(255, 255, 255, 0.25)', backdropFilter: 'blur(32px)',
          borderRadius: 'var(--radius-lg)',
          padding: isMobile ? '16px' : '32px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
          border: '1px solid #F1F5F9',
          marginBottom: '20px',
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          alignItems: isMobile ? 'flex-start' : 'center',
          gap: '20px',
        }}
      >
        <div
          style={{
            width: '56px',
            height: '56px',
            borderRadius: 'var(--radius-lg)',
            background: '#F0FDFA',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#10B981',
            flexShrink: 0,
          }}
        >
          <FileText size={28} />
        </div>
        <div>
          <h1
            style={{
              fontSize: isMobile ? '20px' : '24px',
              fontWeight: 800,
              color: '#0F172A',
              margin: '0 0 4px 0',
              letterSpacing: '-0.5px',
            }}
          >
            {activeCase ? 'Add evidence to your active case' : 'Lab report interpreter'}
          </h1>
          <p
            style={{
              fontSize: '12px',
              color: '#64748B',
              fontWeight: 600,
              letterSpacing: '1px',
              margin: 0,
              textTransform: 'uppercase',
            }}
          >
            {activeCase
              ? `This report will be saved to: ${activeCase.title}`
              : 'HealthChain Lab Analysis'}
          </p>
        </div>
      </motion.div>

      {/* Upload Dropzone */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        style={{
          background: '#FAFAFA',
          borderRadius: '24px',
          padding: isMobile ? '32px 16px' : '60px 40px',
          border: '2px dashed #CBD5E1',
          marginBottom: '20px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          position: 'relative',
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.borderColor = '#2DD4BF';
          e.currentTarget.style.background = '#F8FAFC';
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.borderColor = '#CBD5E1';
          e.currentTarget.style.background = '#FAFAFA';
        }}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/*,application/pdf"
          style={{ display: 'none' }}
        />

        {loading ? (
          <div
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', width: '100%', maxWidth: '300px' }}
          >
            <div style={{ position: 'relative', width: '80px', height: '100px', margin: '0 auto' }}>
              {/* Document Icon Background */}
              <div style={{ position: 'absolute', inset: 0, background: '#F1F5F9', borderRadius: '8px', border: '2px solid #E2E8F0', overflow: 'hidden' }}>
                <div style={{ width: '60%', height: '4px', background: '#CBD5E1', margin: '16px 0 0 12px', borderRadius: '2px' }} />
                <div style={{ width: '80%', height: '4px', background: '#CBD5E1', margin: '12px 0 0 12px', borderRadius: '2px' }} />
                <div style={{ width: '70%', height: '4px', background: '#CBD5E1', margin: '12px 0 0 12px', borderRadius: '2px' }} />
                <div style={{ width: '80%', height: '4px', background: '#CBD5E1', margin: '12px 0 0 12px', borderRadius: '2px' }} />
                <div style={{ width: '50%', height: '4px', background: '#CBD5E1', margin: '12px 0 0 12px', borderRadius: '2px' }} />
              </div>
              
              {/* Scanning Laser */}
              <motion.div
                animate={{ y: [0, 96, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: -10,
                  right: -10,
                  height: '4px',
                  background: '#10B981',
                  boxShadow: '0 0 12px #10B981, 0 0 24px #10B981',
                  borderRadius: '2px',
                  zIndex: 2,
                }}
              />
              
              {/* Scan Highlight Area */}
              <motion.div
                animate={{ height: [0, 96, 0], top: [0, 0, 96] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  background: 'rgba(16, 185, 129, 0.1)',
                  zIndex: 1,
                }}
              />
            </div>

            <div style={{ textAlign: 'center' }}>
              <motion.div 
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                style={{ color: '#0F172A', fontWeight: 800, fontSize: '18px', marginBottom: '8px' }}
              >
                Extracting Clinical Data...
              </motion.div>
              <div style={{ color: '#64748B', fontSize: '13px', fontWeight: 600 }}>
                Running optical character recognition & NLP analysis
              </div>
            </div>
          </div>
        ) : (
          <>
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '20px',
                background: 'rgba(255, 255, 255, 0.25)', backdropFilter: 'blur(32px)',
                boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#10B981',
                marginBottom: '24px',
              }}
            >
              <UploadCloud size={32} />
            </div>
            <h2
              style={{
                fontSize: '18px',
                fontWeight: 700,
                color: '#0F172A',
                margin: '0 0 8px 0',
                letterSpacing: '0.5px',
              }}
            >
              {activeCase ? 'ADD A REPORT TO THIS CASE' : 'UPLOAD LAB REPORT'}
            </h2>
            <p
              style={{
                fontSize: '12px',
                color: '#94A3B8',
                fontWeight: 600,
                margin: 0,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                marginBottom: '24px'
              }}
            >
              {activeCase
                ? 'WE WILL ANALYSE IT, SAVE THE FINDING, THEN YOU CAN CONTINUE COLLABORATION'
                : 'PHOTO OR PDF (CAMERA SUPPORTED)'}
            </p>
            <div style={{ display: 'flex', gap: '16px' }}>
              <button
                type="button"
                className="btn btn-outline"
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', zIndex: 10 }}
              >
                <UploadCloud size={18} /> Select File or Camera
              </button>
            </div>
          </>
        )}
      </motion.div>

      {/* Results Area */}
      <AnimatePresence mode="wait">
        {!loading && (result || !file) && (
          <motion.div
            key={result ? 'result' : 'example'}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            style={{ display: 'flex', flexDirection: 'column', gap: '16px', paddingBottom: '40px' }}
          >
            {(() => {
              const displayData = result || exampleResult;
              const isExample = !result;
              const displayFile = file ? file.name : displayData.filename;

              return (
                <>
                  {isExample && (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        marginBottom: '-8px',
                      }}
                    >
                      <span
                        style={{
                          fontSize: '13px',
                          textTransform: 'uppercase',
                          color: '#94A3B8',
                          fontWeight: 800,
                          letterSpacing: '1.5px',
                        }}
                      >
                        Example Result
                      </span>
                      <div style={{ flex: 1, height: '1px', background: '#E2E8F0' }} />
                    </div>
                  )}

                  {activeCase && !isExample && (
                    <div
                      style={{
                        padding: '16px 18px',
                        borderRadius: '14px',
                        background: '#ECFDF5',
                        border: '1px solid #A7F3D0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 16,
                        flexWrap: 'wrap',
                      }}
                    >
                      <div>
                        <strong style={{ display: 'block', color: '#065F46', fontSize: 14 }}>
                          Evidence added to {activeCase.title}
                        </strong>
                        <span style={{ color: '#047857', fontSize: 13 }}>
                          Your board correlation can now use this report with the existing Parallel
                          findings.
                        </span>
                      </div>
                      <button
                        onClick={() => navigate(returnTo || `/app/mdthub?caseId=${activeCase.id}`)}
                        style={{
                          padding: '11px 16px',
                          border: 'none',
                          borderRadius: '10px',
                          background: '#059669',
                          color: '#FFF',
                          fontWeight: 800,
                          cursor: 'pointer',
                        }}
                      >
                        Continue board correlation
                      </button>
                    </div>
                  )}

                  {/* Header Info */}
                  <div
                    style={{
                      background: 'rgba(255, 255, 255, 0.25)', backdropFilter: 'blur(32px)',
                      borderRadius: 'var(--radius-lg)',
                      padding: isMobile ? '16px' : '24px',
                      border: '1px solid #E2E8F0',
                      display: 'flex',
                      flexDirection: isMobile ? 'column' : 'row',
                      gap: '20px',
                      alignItems: isMobile ? 'flex-start' : 'center',
                    }}
                  >
                    <div
                      style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: 'var(--radius-lg)',
                        background: '#EEF2FF',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#4F46E5',
                        flexShrink: 0,
                      }}
                    >
                      <FileType size={24} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <h2
                        style={{
                          fontSize: '20px',
                          fontWeight: 700,
                          color: '#0F172A',
                          margin: '0 0 4px 0',
                        }}
                      >
                        {displayData.testName}
                      </h2>
                      <div style={{ fontSize: '13px', color: '#64748B', fontWeight: 500 }}>
                        Report Date: {displayData.date}
                      </div>
                    </div>
                    {displayFile && (
                      <div
                        style={{
                          fontSize: '12px',
                          background: '#F1F5F9',
                          padding: '6px 12px',
                          borderRadius: '99px',
                          color: '#475569',
                          fontWeight: 600,
                        }}
                      >
                        {displayFile}
                      </div>
                    )}
                  </div>

                  <div style={{ display: isMobile ? 'flex' : 'grid', flexDirection: isMobile ? 'column' : 'unset', gridTemplateColumns: isMobile ? 'unset' : '1.2fr 0.8fr', gap: '16px' }}>
                    {/* Primary Analysis */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      <div
                        style={{
                          background: 'rgba(255, 255, 255, 0.25)', backdropFilter: 'blur(32px)',
                          borderRadius: 'var(--radius-lg)',
                          padding: isMobile ? '16px' : '24px',
                          border: '1px solid #E2E8F0',
                        }}
                      >
                        <h3
                          style={{
                            fontSize: '15px',
                            fontWeight: 700,
                            color: '#0F172A',
                            marginBottom: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                          }}
                        >
                          <CheckCircle2 size={18} color="#4F46E5" /> Key Findings
                        </h3>
                        <p
                          style={{
                            fontSize: '14.5px',
                            color: '#334155',
                            lineHeight: 1.6,
                            margin: 0,
                          }}
                        >
                          {displayData.keyFindings}
                        </p>
                      </div>

                      <div
                        style={{
                          background: 'rgba(255, 255, 255, 0.25)', backdropFilter: 'blur(32px)',
                          borderRadius: 'var(--radius-lg)',
                          padding: isMobile ? '16px' : '24px',
                          border: '1px solid #E2E8F0',
                        }}
                      >
                        <h3
                          style={{
                            fontSize: '15px',
                            fontWeight: 700,
                            color: '#0F172A',
                            marginBottom: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                          }}
                        >
                          <Activity size={18} color="#10B981" /> Interpretation
                        </h3>
                        <p
                          style={{
                            fontSize: '14.5px',
                            color: '#334155',
                            lineHeight: 1.6,
                            margin: 0,
                          }}
                        >
                          {displayData.interpretation}
                        </p>
                      </div>

                      <div
                        style={{
                          background: '#F0FDF4',
                          borderRadius: 'var(--radius-lg)',
                          padding: isMobile ? '16px' : '24px',
                          border: '1px solid #BBF7D0',
                        }}
                      >
                        <h3
                          style={{
                            fontSize: '15px',
                            fontWeight: 700,
                            color: '#166534',
                            marginBottom: '12px',
                          }}
                        >
                          Next Steps & Recommendations
                        </h3>
                        <p
                          style={{
                            fontSize: '14.5px',
                            color: '#15803D',
                            lineHeight: 1.6,
                            margin: 0,
                          }}
                        >
                          {displayData.recommendations}
                        </p>
                      </div>
                    </div>

                    {/* Side Panel (Abnormalities & Terms) */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      <div
                        style={{
                          background: '#FEF2F2',
                          borderRadius: 'var(--radius-lg)',
                          padding: isMobile ? '16px' : '24px',
                          border: '1px solid #FECACA',
                        }}
                      >
                        <h3
                          style={{
                            fontSize: '15px',
                            fontWeight: 700,
                            color: '#991B1B',
                            marginBottom: '16px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                          }}
                        >
                          <AlertCircle size={18} color="#DC2626" /> Abnormalities Noted
                        </h3>
                        {displayData.abnormalities?.length > 0 ? (
                          <ul
                            style={{
                              margin: 0,
                              paddingLeft: '20px',
                              color: '#B91C1C',
                              fontSize: '14px',
                              lineHeight: 1.6,
                            }}
                          >
                            {displayData.abnormalities.map((item, i) => (
                              <li key={i} style={{ marginBottom: '8px' }}>
                                {item}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p style={{ fontSize: '14px', color: '#B91C1C', margin: 0 }}>
                            All within normal limits.
                          </p>
                        )}
                      </div>

                      {displayData.biomarkers && Object.keys(displayData.biomarkers).length > 0 && (
                        <div
                          style={{
                            background: 'rgba(255, 255, 255, 0.25)', backdropFilter: 'blur(32px)',
                            borderRadius: 'var(--radius-lg)',
                            padding: isMobile ? '16px' : '24px',
                            border: '1px solid #E2E8F0',
                          }}
                        >
                          <h3
                            style={{
                              fontSize: '15px',
                              fontWeight: 700,
                              color: '#0F172A',
                              marginBottom: '16px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                            }}
                          >
                            <Activity size={18} color="#10B981" /> Biomarker Tracking
                          </h3>
                          <div style={{ width: '100%', height: 200 }}>
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart
                                data={Object.entries(displayData.biomarkers).map(([key, data]: any) => ({
                                  name: key,
                                  value: data.value,
                                  min: data.min,
                                  max: data.max,
                                  unit: data.unit,
                                  isLow: data.value < data.min,
                                  isHigh: data.value > data.max
                                }))}
                                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                              >
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748B' }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748B' }} />
                                <Tooltip 
                                  cursor={{ fill: 'transparent' }}
                                  content={({ active, payload }) => {
                                    if (active && payload && payload.length) {
                                      const data = payload[0].payload;
                                      return (
                                        <div style={{ background: 'rgba(255, 255, 255, 0.25)', backdropFilter: 'blur(32px)', padding: '12px', border: '1px solid #E2E8F0', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
                                          <div style={{ fontWeight: 600, color: '#0F172A', marginBottom: 4 }}>{data.name}</div>
                                          <div style={{ fontSize: 13, color: data.isLow || data.isHigh ? '#DC2626' : '#059669' }}>
                                            Value: {data.value} {data.unit}
                                          </div>
                                          <div style={{ fontSize: 12, color: '#64748B' }}>
                                            Normal: {data.min} - {data.max} {data.unit}
                                          </div>
                                        </div>
                                      );
                                    }
                                    return null;
                                  }}
                                />
                                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                                  {Object.entries(displayData.biomarkers).map(([key, data]: any, index) => (
                                    <Cell key={`cell-${index}`} fill={(data.value < data.min || data.value > data.max) ? '#F87171' : '#34D399'} />
                                  ))}
                                </Bar>
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                      )}

                      {displayData.extraTerms?.length > 0 && (
                        <div
                          style={{
                            background: 'rgba(255, 255, 255, 0.25)', backdropFilter: 'blur(32px)',
                            borderRadius: 'var(--radius-lg)',
                            padding: isMobile ? '16px' : '24px',
                            border: '1px solid #E2E8F0',
                          }}
                        >
                          <h3
                            style={{
                              fontSize: '15px',
                              fontWeight: 700,
                              color: '#0F172A',
                              marginBottom: '16px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                            }}
                          >
                            <BookOpen size={18} color="#3B82F6" /> Medical Terms Used
                          </h3>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {displayData.extraTerms.map((term, i) => (
                              <div key={i}>
                                <div
                                  style={{
                                    fontSize: '13px',
                                    fontWeight: 700,
                                    color: '#1E293B',
                                    marginBottom: '2px',
                                  }}
                                >
                                  {term.term}
                                </div>
                                <div
                                  style={{ fontSize: '13px', color: '#64748B', lineHeight: 1.5 }}
                                >
                                  {term.definition}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              );
            })()}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
