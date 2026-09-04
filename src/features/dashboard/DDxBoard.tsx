import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Activity, Brain, Loader2, MessageCircle, RotateCcw } from 'lucide-react';
import { CaseItem, updateCaseDifferentials, updateCaseConnectionMap } from '../../services/CaseEngine';
import { CaseConnectionMap } from '../../components/ui/CaseConnectionMap';
import { generateCaseConnectionMap } from '../../services/geminiService';
import { useIsMobile } from '../../hooks/useIsMobile';
import { getRunScope } from '../../services/RunContext';
import { useToast } from '../../components/ui/ToastProvider';
import { triggerHapticLight, triggerHapticSuccess } from '../../services/haptics';
import { awardPoints } from '../../services/VitalityPointsEngine';

export default function DDxBoard({ item, profile }: { item: CaseItem; profile: any }) {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const toast = useToast();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const isMounted = useRef(true);
  const hasAutoRun = useRef(false);

  useEffect(() => {
    return () => { isMounted.current = false; };
  }, []);

  // Auto-generate on mount if we have pathways but no connection map
  useEffect(() => {
    if (hasAutoRun.current) return;
    const topDiagnoses = item.currentSummary?.topDiagnoses || item.reviews?.[0]?.report?.topDiagnoses || [];
    const requestKey = getRunScope('mdt', item.id, 'connection-map');
    let alreadyRequested = false;
    try { alreadyRequested = sessionStorage.getItem(requestKey) === 'done'; } catch {}
    if (topDiagnoses.length > 0 && !item.connectionMap && !alreadyRequested) {
      hasAutoRun.current = true;
      try { sessionStorage.setItem(requestKey, 'pending'); } catch {}
      setIsAnalyzing(true);
      generateCaseConnectionMap(topDiagnoses).then(mapData => {
        if (mapData) {
          updateCaseConnectionMap(item.id, mapData);
          awardPoints(15, 'Generated Case Connection Map', 'consult', 'ddx_map_' + item.id);
          try { sessionStorage.setItem(requestKey, 'done'); } catch {}
        }
      }).catch(console.error).finally(() => {
        try { if (sessionStorage.getItem(requestKey) !== 'done') sessionStorage.removeItem(requestKey); } catch {}
        if (isMounted.current) setIsAnalyzing(false);
      });
    }
  }, [item.id, item.currentSummary, item.connectionMap]);

  const handleManualGenerate = async () => {
    triggerHapticLight();
    const topDiagnoses = item.currentSummary?.topDiagnoses || item.reviews?.[0]?.report?.topDiagnoses || [
      { condition: item.title || 'Clinical Synthesis', specialty: 'General Medicine', rationale: 'Active clinical assessment' }
    ];
    setIsAnalyzing(true);
    try {
      const mapData = await generateCaseConnectionMap(topDiagnoses);
      if (mapData) {
        updateCaseConnectionMap(item.id, mapData);
        awardPoints(15, 'Generated Case Connection Map', 'consult', 'ddx_map_' + item.id);
        triggerHapticSuccess();
        toast.success('Connections Mapped (+15 pts)', 'Multi-component case connection map generated.');
      } else {
        toast.error('Mapping Inconclusive', 'Could not generate connections. Please try again.');
      }
    } catch (e) {
      console.error('Failed to manually generate connection map:', e);
      toast.error('Generation Failed', 'Could not generate connection map. Please try again.');
    } finally {
      if (isMounted.current) setIsAnalyzing(false);
    }
  };

  return (
    <div className="card" style={{ padding: isMobile ? 16 : 24 }}>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 22, margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Brain color="#6366F1" size={24} />
          Case Component Connections
        </h2>
        <p style={{ margin: 0, color: '#64748b', fontSize: 14 }}>
          AI-mapped relationships between your symptoms, conditions, and clinical pathways. This is not a diagnosis.
        </p>
      </div>

      {isAnalyzing && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{ textAlign: 'center', padding: 60, border: '2px dashed #E2E8F0', borderRadius: 16 }}
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
            style={{ display: 'inline-block', marginBottom: 16 }}
          >
            <Loader2 size={32} color="#6366F1" />
          </motion.div>
          <p style={{ margin: 0, color: '#6366F1', fontWeight: 700, fontSize: 16 }}>
            Mapping connections across your case...
          </p>
          <p style={{ margin: '8px 0 0', color: '#94A3B8', fontSize: 13 }}>
            Analyzing symptom clusters, causal pathways, and shared mechanisms
          </p>
        </motion.div>
      )}

      {!isAnalyzing && !item.connectionMap && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{ textAlign: 'center', padding: 48, border: '2px dashed #E2E8F0', borderRadius: 16, background: '#F8FAFC' }}
        >
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#EEF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', color: '#6366F1' }}>
            <Brain size={28} />
          </div>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1E293B', margin: '0 0 8px' }}>
            Component connections not yet mapped
          </h3>
          <p style={{ margin: '0 0 20px', color: '#64748B', fontSize: 14, maxWidth: 420, marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.5 }}>
            Synthesize relationships between your symptoms, biomarkers, conditions, and clinical pathways for doctor discussion.
          </p>
          <button
            type="button"
            onClick={handleManualGenerate}
            style={{
              padding: '12px 24px',
              fontSize: 14,
              fontWeight: 700,
              background: '#6366F1',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: 12,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(99, 102, 241, 0.25)',
              transition: 'transform 0.15s ease'
            }}
            onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.97)'}
            onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            <Sparkles size={16} /> ⚡ Generate Connection Map
          </button>
        </motion.div>
      )}

      {item.connectionMap && (
        <>
          <CaseConnectionMap data={item.connectionMap} isMobile={isMobile} />
          <div style={{ marginTop: '16px', display: 'flex', flexWrap: 'wrap', gap: '10px', justifyContent: 'flex-end', alignItems: 'center' }}>
            <button
              type="button"
              onClick={handleManualGenerate}
              disabled={isAnalyzing}
              style={{
                padding: '8px 16px',
                borderRadius: '10px',
                border: '1px solid #E2E8F0',
                background: '#FFFFFF',
                color: '#475569',
                fontSize: '13px',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                cursor: isAnalyzing ? 'not-allowed' : 'pointer'
              }}
            >
              {isAnalyzing ? <Loader2 size={14} className="spin" /> : <RotateCcw size={14} />}
              Re-analyze Map
            </button>
            <button
              type="button"
              onClick={() => {
                triggerHapticLight();
                navigate('/app/ava', {
                  state: {
                    initialPrompt: `I am reviewing my Case Component Connection Map for "${item.title || 'my clinical case'}". Can you explain the physiological links between these mapped conditions, symptoms, and potential next steps?`
                  }
                });
              }}
              style={{
                padding: '8px 18px',
                borderRadius: '10px',
                border: '1px solid #C7D2FE',
                background: '#EEF2FF',
                color: '#4F46E5',
                fontSize: '13px',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer'
              }}
            >
              <MessageCircle size={15} /> Discuss Connections with Ava
            </button>
          </div>
        </>
      )}
    </div>
  );
}
