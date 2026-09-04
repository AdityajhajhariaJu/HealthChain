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
  MessageCircle,
} from 'lucide-react';
import { analyzeLabReport, runDifferentialAnalysis } from '../../services/geminiService';
import { addEvent, updateVitals, getProfile } from '../../services/ProfileEngine';
import { addEvidenceToActiveCase, updateCaseDifferentials, getActiveCase, setActiveCase, saveReviewSnapshot } from '../../services/CaseEngine';
import { useLocation, useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useIsMobile } from '../../hooks/useIsMobile';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { getRunScope } from '../../services/RunContext';
import { getActiveSession } from '../../services/authSession';
import { openTrialModal } from '../../services/TrialEngine';
import { useToast } from '../../components/ui/ToastProvider';
import { awardPoints } from '../../services/VitalityPointsEngine';
import { triggerHapticLight, triggerHapticSuccess } from '../../services/haptics';

const cachedReportAnalyzerState: Record<string, any> = {};
const fileReportCache: Record<string, any> = {};

export default function ClinicalReportAnalyzer() {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const searchParams = new URLSearchParams(location.search);
  const caseIdParam = searchParams.get('caseId');
  const returnTo = searchParams.get('returnTo');

  useEffect(() => {
    if (caseIdParam) {
      setActiveCase(caseIdParam);
    }
  }, [caseIdParam]);

  const activeCase = getActiveCase();
  const reportCacheKey = getRunScope('lab', 'draft', 'ui');
  const cached = cachedReportAnalyzerState[reportCacheKey];
  const [file, setFile] = useState(cached?.file || null);
  const [loading, setLoading] = useState(cached?.loading || false);
  const [result, setResult] = useState(cached?.result || null);
  const fileInputRef = useRef<any>(null);

  useEffect(() => {
    return () => {
      cachedReportAnalyzerState[reportCacheKey] = { file, loading: false, result };
    };
  }, [file, loading, result, reportCacheKey]);

  const handleFileChange = async (e) => {
    if (loading) return;
    if (!(await getActiveSession())) {
      navigate('/login');
      return;
    }

    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (selectedFile.size === 0) {
      toast.error('Invalid File', 'The selected file is empty (0 bytes).');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const profile = getProfile();
    const isVip = typeof localStorage !== 'undefined' && (localStorage.getItem('hc_vp_sig') === 'a6564a23f9738db13c830d57ebb6beede82dcb7d1bcf83239a006089de3ba40a');
    if (!profile?.isPro && !isVip) {
      openTrialModal('Lab Report & Scan PDF Analyzer');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    // Check size limit (e.g. 3MB)
    const ALLOWED = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
    if (!ALLOWED.includes(selectedFile.type)) {
      toast.error('Unsupported Format', 'Please upload a PDF or image (JPEG/PNG/WEBP).');
      return;
    }
    if (selectedFile.size > 3 * 1024 * 1024) {
      toast.error('File Too Large', 'Maximum allowed file size is 3MB.');
      return;
    }

    setFile(selectedFile);
    setLoading(true);
    setResult(null);

    const fileHash = `${selectedFile.name}-${selectedFile.size}-${selectedFile.lastModified}`;
    
    if (fileReportCache[fileHash]) {
      // CACHE HIT: Save API tokens!
      setLoading(true);
      await new Promise(r => setTimeout(r, 1000)); // Brief animation for UX
      setResult(fileReportCache[fileHash]);
      setLoading(false);
      return;
    }

    
    if (selectedFile.size > 4 * 1024 * 1024) {
      setLoading(false);
      toast.error("File Too Large", "Please select a document under 4MB.");
      return;
    }
    
    const reader = new FileReader();
    reader.onerror = () => {
      setLoading(false);
      toast.error('File Error', 'Failed to read document from disk.');
    };
    reader.onload = async (event) => {
      try {
        const result = event.target?.result;
        if (typeof result !== 'string') {
          setLoading(false);
          toast.error('Processing Failed', 'Failed to process file format.');
          return;
        }
        const base64Data = result.split(',')[1];
        const mimeType = selectedFile.type;

      const profile = getProfile() || {};
      const data = await analyzeLabReport(base64Data, mimeType, profile);

      // Add minimum scanning delay for effect (e.g. 2s) to show the cool animation
      await new Promise(r => setTimeout(r, 2000));

      if (data) {
        fileReportCache[fileHash] = data; // Cache the result!
        setResult(data);
        awardPoints(15, `Analyzed Clinical Lab Report: ${data.testName || 'Lab Data'}`, 'research', `lab_report_${Date.now()}`);
        triggerHapticSuccess();
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

        // Auto-trigger DDx analysis & save Snapshot
        const activeCase = getActiveCase();
        if (activeCase) {
          saveReviewSnapshot({
            caseId: activeCase.id,
            type: 'lab_report',
            report: {
              executiveSummary: `Lab Report Analysis: ${data.testName}`,
              keyFindings: data.keyFindings,
              interpretation: data.interpretation,
              nextSteps: data.recommendations,
              abnormalitiesNoted: data.abnormalities?.map((a: any) => `${a.marker}: ${a.value}`) || [],
              medicalTerms: data.extraTerms || []
            },
            specialists: ['Lab AI'],
            basedOnEvidenceIds: [] // A new evidence ID would normally go here if returned synchronously
          });

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
      toast.error('File Error', 'Failed to read file from your device.');
    };

    reader.readAsDataURL(selectedFile);
  };

  const captureLabReport = async () => {
    if (loading) return;

    const profile = getProfile();
    const isVip = typeof localStorage !== 'undefined' && (localStorage.getItem('hc_vp_sig') === 'a6564a23f9738db13c830d57ebb6beede82dcb7d1bcf83239a006089de3ba40a');
    if (!profile?.isPro && !isVip) {
      openTrialModal('Lab Report & Scan PDF Analyzer');
      return;
    }

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
          saveReviewSnapshot({
            caseId: activeCase.id,
            type: 'lab_report',
            report: {
              executiveSummary: `Lab Report Analysis: ${data.testName}`,
              keyFindings: data.keyFindings,
              interpretation: data.interpretation,
              nextSteps: data.recommendations,
              abnormalitiesNoted: data.abnormalities?.map((a: any) => `${a.marker}: ${a.value}`) || [],
              medicalTerms: data.extraTerms || []
            },
            specialists: ['Lab AI'],
            basedOnEvidenceIds: []
          });

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
      
        {/* Header Card */}
      <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            position: 'relative',
            overflow: 'hidden',
            borderRadius: '24px',
            background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
            border: '1px solid #f1f5f9',
            padding: isMobile ? '24px' : '32px',
            marginBottom: '32px',
            boxShadow: '0 10px 40px -10px rgba(15, 23, 42, 0.05)'
          }}
        >
          {/* Background glowing orbs */}
          <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '200px', height: '200px', background: '#10B981', filter: 'blur(80px)', opacity: 0.1, borderRadius: '50%' }} />
          <div style={{ position: 'absolute', bottom: '-40px', left: '10%', width: '200px', height: '200px', background: '#0ea5e9', filter: 'blur(100px)', opacity: 0.05, borderRadius: '50%' }} />

          <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '20px', alignItems: isMobile ? 'flex-start' : 'center', position: 'relative', zIndex: 1 }}>
            <div style={{
              width: '64px', height: '64px', borderRadius: '18px', background: '#ffffff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 8px 16px -4px rgba(16, 185, 129, 0.15), inset 0 0 0 1px rgba(16, 185, 129, 0.1)',
              color: '#10B981',
              flexShrink: 0
            }}>
              <FileText size={32} strokeWidth={2.5} />
            </div>
            
            <div style={{ flex: 1 }}>
              <h1 style={{
                fontSize: isMobile ? '26px' : '32px',
                fontWeight: 800,
                color: '#0f172a',
                margin: '0 0 6px 0',
                letterSpacing: '-0.03em',
              }}>
                {activeCase ? 'Add evidence to your active case' : 'Lab report interpreter'}
              </h1>
              <p style={{ margin: 0, fontSize: '15px', color: '#64748B', fontWeight: 500, lineHeight: 1.5, maxWidth: '600px' }}>
                {activeCase
                  ? `This report will be securely saved to: ${activeCase.title}`
                  : 'HealthChain Lab Analysis'}
              </p>
            </div>
          </div>
        </motion.div>

      {/* Upload Dropzone */}
      <motion.div
        role="button"
        tabIndex={0}
        aria-label={activeCase ? 'Upload clinical report to this case' : 'Upload lab report or medical scan'}
        onClick={() => fileInputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            fileInputRef.current?.click();
          }
        }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
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
                animate={{ y: [0, 96, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  background: 'rgba(16, 185, 129, 0.1)', height: '40px',
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
                letterSpacing: '-0.2px',
              }}
            >
              {activeCase ? 'Add a report to this case' : 'Upload lab report'}
            </h2>
            <p
              style={{
                fontSize: '13px',
                color: '#64748B',
                fontWeight: 500,
                margin: 0,
                marginBottom: '24px',
                lineHeight: 1.4,
              }}
            >
              {activeCase
                ? 'We will analyse it, extract key biomarkers, and integrate the findings into your case timeline'
                : 'Photo or PDF (camera and files supported)'}
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
        {!loading && result && (
          <motion.div
            key={result ? 'result' : 'example'}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            style={{ display: 'flex', flexDirection: 'column', gap: '16px', paddingBottom: '40px' }}
          >
            {(() => {
              const displayData = result;
              
              const displayFile = file ? file.name : displayData.filename;

              return (
                <>


                  {activeCase && (
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
                        onClick={() => navigate(returnTo || (activeCase ? `/app/cases/${activeCase.id}` : '/app/my-cases'))}
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
                        <button
                          type="button"
                          onClick={() => {
                            triggerHapticLight();
                            const recText = typeof displayData.recommendations === 'string' ? displayData.recommendations : JSON.stringify(displayData.recommendations);
                            navigate('/app/ava', {
                              state: {
                                initialPrompt: `My clinical report (${displayData.testName || 'Lab Report'}) recommended the following next steps: "${recText.slice(0, 300)}". Can you help me break this down into an actionable preparation checklist for my doctor?`
                              }
                            });
                          }}
                          style={{
                            marginTop: '14px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '8px 14px',
                            background: '#FFFFFF',
                            color: '#166534',
                            border: '1px solid #BBF7D0',
                            borderRadius: '10px',
                            fontSize: '12.5px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            boxShadow: '0 2px 6px rgba(22, 101, 52, 0.08)'
                          }}
                        >
                          <MessageCircle size={14} /> Discuss Next Steps with Ava
                        </button>
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
                          <>
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
                            <button
                              type="button"
                              onClick={() => {
                                triggerHapticLight();
                                const abnList = displayData.abnormalities.slice(0, 3).join('; ');
                                navigate('/app/ava', {
                                  state: {
                                    initialPrompt: `My clinical lab report flagged the following abnormalities: ${abnList}. Can you explain what physiological mechanisms might cause these variations and what follow-up questions I should ask my doctor?`
                                  }
                                });
                              }}
                              style={{
                                marginTop: '14px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '8px 14px',
                                background: '#FFFFFF',
                                color: '#DC2626',
                                border: '1px solid #FECACA',
                                borderRadius: '10px',
                                fontSize: '12.5px',
                                fontWeight: 700,
                                cursor: 'pointer',
                                boxShadow: '0 2px 6px rgba(220, 38, 38, 0.08)'
                              }}
                            >
                              <MessageCircle size={14} /> Discuss Abnormalities with Ava
                            </button>
                          </>
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
