import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Activity, Brain, Loader2 } from 'lucide-react';
import { CaseItem, updateCaseDifferentials, updateCaseConnectionMap } from '../../services/CaseEngine';
import { CaseConnectionMap } from '../../components/ui/CaseConnectionMap';
import { generateCaseConnectionMap } from '../../services/geminiService';
import { useIsMobile } from '../../hooks/useIsMobile';
import { getRunScope } from '../../services/RunContext';

export default function DDxBoard({ item, profile }: { item: CaseItem; profile: any }) {
  const isMobile = useIsMobile();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const isMounted = useRef(true);
  const hasAutoRun = useRef(false);

  useEffect(() => {
    return () => { isMounted.current = false; };
  }, []);

  // Auto-generate on mount if we have pathways but no connection map
  useEffect(() => {
    if (hasAutoRun.current) return;
    const topDiagnoses = item.currentSummary?.topDiagnoses || [];
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
          try { sessionStorage.setItem(requestKey, 'done'); } catch {}
        }
      }).catch(console.error).finally(() => {
        try { if (sessionStorage.getItem(requestKey) !== 'done') sessionStorage.removeItem(requestKey); } catch {}
        if (isMounted.current) setIsAnalyzing(false);
      });
    }
  }, [item.id, item.currentSummary, item.connectionMap]);

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
          style={{ textAlign: 'center', padding: 40, border: '2px dashed #e2e8f0', borderRadius: 16, color: '#94a3b8' }}
        >
          No connections available yet. Complete a consultation first to generate your case connection map.
        </motion.div>
      )}

      {item.connectionMap && (
        <CaseConnectionMap data={item.connectionMap} isMobile={isMobile} />
      )}
    </div>
  );
}
