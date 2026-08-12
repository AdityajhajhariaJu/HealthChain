import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, ArrowUp, ArrowDown, Minus, Activity, TestTube, Clock } from 'lucide-react';
import { CaseItem, updateCaseDifferentials } from '../../services/CaseEngine';
import { runDifferentialAnalysis } from '../../services/geminiService';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useIsMobile } from '../../hooks/useIsMobile';

export default function DDxBoard({ item, profile }: { item: CaseItem; profile: any }) {
  const isMobile = useIsMobile();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const isMounted = useRef(true);

  useEffect(() => {
    return () => { isMounted.current = false; };
  }, []);

  const handleRunDDx = async () => {
    setIsAnalyzing(true);
    try {
      const results = await runDifferentialAnalysis(item.intakeData, item.medicalRecords, profile);
      if (results && Array.isArray(results)) {
        updateCaseDifferentials(item.id, results);
      }
    } catch (e) {
      console.error('Failed to run DDx:', e);
    } finally {
      if (isMounted.current) setIsAnalyzing(false);
    }
  };

  const differentials = item.differentials || [];
  
  // Transform differentialHistory into a format recharts can use
  const historyData = (item.differentialHistory || []).slice().reverse().map((hist, index) => {
    const dataPoint: any = { 
      name: `Run ${index + 1}`,
      date: new Date(hist.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    hist.differentials.forEach(d => {
      dataPoint[d.condition] = d.probability;
    });
    return dataPoint;
  });

  // Add the current differentials as the latest data point if history exists
  if (historyData.length > 0 && differentials.length > 0) {
    const currentPoint: any = {
      name: `Current`,
      date: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    differentials.forEach(d => {
      currentPoint[d.condition] = d.probability;
    });
    historyData.push(currentPoint);
  }

  // Get unique conditions to generate lines
  const uniqueConditions = Array.from(new Set(
    (item.differentialHistory || []).flatMap(h => h.differentials.map(d => d.condition))
      .concat(differentials.map(d => d.condition))
  ));

  const colors = ['#10B981', '#ef4444', '#f59e0b', '#3b82f6', '#8b5cf6', '#ec4899'];

  return (
    <div className="card" style={{ padding: isMobile ? 16 : 24 }}>
      <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'stretch' : 'flex-start', marginBottom: 24, gap: isMobile ? 16 : 0 }}>
        <div>
          <h2 style={{ fontSize: 22, margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Activity color="#10B981" size={24} />
            Differential Diagnosis (DDx)
          </h2>
          <p style={{ margin: 0, color: '#64748b', fontSize: 14 }}>
            AI-driven hypothesis tracker based on active symptoms and lab findings.
          </p>
        </div>
        <button
          className="btn btn-primary"
          onClick={handleRunDDx}
          disabled={isAnalyzing}
          style={{ background: '#10B981', color: '#fff', border: 'none', display: 'flex', alignItems: 'center', gap: 8, cursor: isAnalyzing ? 'not-allowed' : 'pointer' }}
        >
          {isAnalyzing ? (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
            >
              <Sparkles size={16} />
            </motion.div>
          ) : (
            <Sparkles size={16} />
          )}
          {isAnalyzing ? 'Analyzing Data...' : 'Run DDx Analysis'}
        </button>
      </div>

      {historyData.length > 0 && (
        <div style={{ marginBottom: 20, background: '#f8fafc', padding: isMobile ? 16 : 24, borderRadius: 16, border: '1px solid #e2e8f0' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 16, color: '#334155', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Clock size={18} />
            Differential Evolution
          </h3>
          <div style={{ height: 250, width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={historyData}>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} />
                <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} tickFormatter={(val) => `${val}%`} />
                <Tooltip 
                  contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  labelStyle={{ fontWeight: 600, color: '#334155', marginBottom: 4 }}
                />
                <Legend wrapperStyle={{ paddingTop: 16, fontSize: 13 }} />
                {uniqueConditions.map((condition, index) => (
                  <Line 
                    key={condition} 
                    type="monotone" 
                    dataKey={condition} 
                    stroke={colors[index % colors.length]} 
                    strokeWidth={3}
                    dot={{ r: 4, strokeWidth: 2 }}
                    activeDot={{ r: 6 }}
                    connectNulls
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gap: 16 }}>
        <AnimatePresence>
          {differentials.length === 0 && !isAnalyzing && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{ textAlign: 'center', padding: 40, border: '2px dashed #e2e8f0', borderRadius: 16, color: '#94a3b8' }}
            >
              No active differential hypotheses. Run the DDx analysis to generate hypotheses.
            </motion.div>
          )}

          {differentials.map((ddx, idx) => {
            const isHigh = ddx.probability >= 70;
            const isMedium = ddx.probability >= 30 && ddx.probability < 70;
            const progressColor = isHigh ? '#ef4444' : isMedium ? '#f59e0b' : '#10b981';

            return (
              <motion.div
                key={ddx.id || idx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: 16,
                  padding: 20,
                  display: isMobile ? 'flex' : 'grid',
                  flexDirection: isMobile ? 'column' : 'unset',
                  gridTemplateColumns: isMobile ? 'unset' : '300px 1fr',
                  gap: 16,
                }}
              >
                {/* Left Column: Probability & Core Info */}
                <div style={{ borderRight: isMobile ? 'none' : '1px solid #e2e8f0', paddingRight: isMobile ? 0 : 24, borderBottom: isMobile ? '1px solid #e2e8f0' : 'none', paddingBottom: isMobile ? 24 : 0, marginBottom: isMobile ? 0 : 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <h3 style={{ margin: 0, fontSize: 18, color: '#0f172a' }}>{ddx.condition}</h3>
                    <div
                      style={{
                        padding: '4px 8px',
                        borderRadius: 8,
                        background: ddx.trend === 'up' ? '#fee2e2' : ddx.trend === 'down' ? '#d1fae5' : '#f1f5f9',
                        color: ddx.trend === 'up' ? '#ef4444' : ddx.trend === 'down' ? '#10b981' : '#64748b',
                      }}
                    >
                      {ddx.trend === 'up' ? <ArrowUp size={16} /> : ddx.trend === 'down' ? <ArrowDown size={16} /> : <Minus size={16} />}
                    </div>
                  </div>

                  <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between', fontSize: 14, fontWeight: 600, color: progressColor }}>
                    <span>Probability</span>
                    <span>{ddx.probability}%</span>
                  </div>
                  
                  {/* Progress Bar */}
                  <div style={{ width: '100%', height: 8, background: '#e2e8f0', borderRadius: 4, overflow: 'hidden', marginBottom: 20 }}>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${ddx.probability}%` }}
                      transition={{ duration: 1, ease: 'easeOut' }}
                      style={{ height: '100%', background: progressColor, borderRadius: 4 }}
                    />
                  </div>

                  <div>
                    <h4 style={{ margin: '0 0 8px', fontSize: 13, textTransform: 'uppercase', color: '#64748b', letterSpacing: 0.5 }}>Next Best Tests</h4>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {ddx.nextBestTests.map((test, i) => (
                        <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, padding: '4px 8px', background: '#e0f2fe', color: '#0369a1', borderRadius: 8, fontWeight: 500 }}>
                          <TestTube size={12} /> {test}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Right Column: Evidence */}
                <div>
                  <div style={{ marginBottom: 16 }}>
                    <h4 style={{ margin: '0 0 8px', fontSize: 13, textTransform: 'uppercase', color: '#64748b', letterSpacing: 0.5 }}>Supporting Evidence</h4>
                    <ul style={{ margin: 0, paddingLeft: 16, color: '#334155', fontSize: 14 }}>
                      {ddx.supportingEvidence.map((ev, i) => (
                        <li key={i} style={{ marginBottom: 4 }}>{ev}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4 style={{ margin: '0 0 8px', fontSize: 13, textTransform: 'uppercase', color: '#64748b', letterSpacing: 0.5 }}>Refuting Evidence</h4>
                    {ddx.refutingEvidence.length > 0 ? (
                      <ul style={{ margin: 0, paddingLeft: 16, color: '#334155', fontSize: 14 }}>
                        {ddx.refutingEvidence.map((ev, i) => (
                          <li key={i} style={{ marginBottom: 4 }}>{ev}</li>
                        ))}
                      </ul>
                    ) : (
                      <span style={{ fontSize: 14, color: '#94a3b8' }}>None currently identified.</span>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
