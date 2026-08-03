import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GitMerge, Sparkles, Clock, AlertTriangle, CheckCircle, Activity, Info, X } from 'lucide-react';
import { simulatePathway } from '../../services/geminiService';
import { getProfile } from '../../services/ProfileEngine';
import { useIsMobile } from '../../hooks/useIsMobile';

export default function PathwaySimulator({ actionItem, onClose }: { actionItem: any, onClose: () => void }) {
  const isMobile = useIsMobile();
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulation, setSimulation] = useState<any>(null);
  const isMounted = useRef(true);

  useEffect(() => {
    return () => { isMounted.current = false; };
  }, []);

  const runSimulation = async () => {
    // Check sessionStorage cache first
    const cacheKey = `pathway_sim_${actionItem.step}`;
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      setSimulation(JSON.parse(cached));
      return;
    }
    // Also check if actionItem already has pre-computed simulation data from the Orchestrator
    if (actionItem.simulation && actionItem.simulation.timelineDays) {
      setSimulation(actionItem.simulation);
      sessionStorage.setItem(cacheKey, JSON.stringify(actionItem.simulation));
      return;
    }
    setIsSimulating(true);
    const profile = getProfile();
    try {
      const result = await simulatePathway(actionItem, profile);
      if (isMounted.current) {
        if (result) {
          setSimulation(result);
          sessionStorage.setItem(cacheKey, JSON.stringify(result));
        }
      }
    } catch (err) {
      console.error('Simulation failed:', err);
      alert('Failed to run simulation. Please try again.');
    } finally {
      if (isMounted.current) {
        setIsSimulating(false);
      }
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(15,23,42,0.8)',
      backdropFilter: 'blur(8px)',
      zIndex: 9999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px'
    }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        style={{
          background: '#fff',
          borderRadius: 24,
          width: '100%',
          maxWidth: 700,
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 24px 48px rgba(0,0,0,0.2)',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <div style={{ padding: '24px 32px', borderBottom: '1px solid #e2e8f0', display: 'flex', flexWrap: 'wrap', gap: '12px', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: '#fff', zIndex: 10, borderRadius: '24px 24px 0 0' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 20, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8 }}>
              <GitMerge color="#3b82f6" />
              Pathway Simulator
            </h2>
            <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 14 }}>
              Predictive simulation for: <strong>{actionItem.step}</strong>
            </p>
          </div>
          <button onClick={onClose} style={{ background: '#f1f5f9', border: 'none', width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b' }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: '32px', flex: 1 }}>
          {!simulation && !isSimulating && (
            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
              <div style={{ width: 80, height: 80, background: '#eff6ff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
                <Sparkles size={40} color="#3b82f6" />
              </div>
              <h3 style={{ fontSize: 18, margin: '0 0 12px', color: '#0f172a' }}>Simulate This Treatment</h3>
              <p style={{ color: '#64748b', fontSize: 15, maxWidth: 400, margin: '0 auto 32px', lineHeight: 1.5 }}>
                Use AI to generate a clinical forecast for this action item, including recovery timelines, risks, and estimated costs based on your profile.
              </p>
              <button 
                onClick={runSimulation}
                style={{ background: '#3b82f6', color: '#fff', border: 'none', padding: '12px 24px', borderRadius: 12, fontSize: 15, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, margin: '0 auto', boxShadow: '0 4px 12px rgba(59,130,246,0.3)' }}
              >
                <GitMerge size={18} />
                Run Simulation
              </button>
            </div>
          )}

          {isSimulating && (
            <div style={{ textAlign: 'center', padding: '60px 20px' }}>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                style={{ width: 48, height: 48, border: '3px solid #e2e8f0', borderTopColor: '#3b82f6', borderRadius: '50%', margin: '0 auto 24px' }}
              />
              <p style={{ color: '#64748b', fontSize: 15 }}>Running Bayesian forecasting models...</p>
            </div>
          )}

          <AnimatePresence>
            {simulation && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                {/* Stats Row */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 16, marginBottom: 32 }}>
                  <div style={{ background: '#f8fafc', padding: 16, borderRadius: 16, border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#64748b', fontSize: 13, marginBottom: 8, fontWeight: 600 }}>
                      <Clock size={14} /> TIMELINE
                    </div>
                    <div style={{ fontSize: 24, fontWeight: 700, color: '#0f172a' }}>{simulation.timelineDays} <span style={{ fontSize: 14, color: '#64748b' }}>days</span></div>
                  </div>
                  <div style={{ background: '#f0fdfa', padding: 16, borderRadius: 16, border: '1px solid #ccfbf1' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#0f766e', fontSize: 13, marginBottom: 8, fontWeight: 600 }}>
                      <Activity size={14} /> SUCCESS RATE
                    </div>
                    <div style={{ fontSize: 24, fontWeight: 700, color: '#0f766e' }}>{simulation.successRate}%</div>
                  </div>
                  <div style={{ background: '#fef2f2', padding: 16, borderRadius: 16, border: '1px solid #fee2e2' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#b91c1c', fontSize: 13, marginBottom: 8, fontWeight: 600 }}>
                      <AlertTriangle size={14} /> RISKS
                    </div>
                    <div style={{ fontSize: 24, fontWeight: 700, color: '#b91c1c' }}>{simulation.risks.length}</div>
                  </div>
                </div>

                {/* Timeline Tree */}
                <h4 style={{ margin: '0 0 16px', fontSize: 15, color: '#334155' }}>Expected Milestones</h4>
                <div style={{ position: 'relative', paddingLeft: 24, marginBottom: 32 }}>
                  <div style={{ position: 'absolute', left: 5, top: 8, bottom: 8, width: 2, background: '#e2e8f0', borderRadius: 2 }} />
                  {simulation.milestones.map((ms: any, i: number) => (
                    <div key={i} style={{ position: 'relative', marginBottom: i === simulation.milestones.length - 1 ? 0 : 24 }}>
                      <div style={{ position: 'absolute', left: -24, top: 4, width: 12, height: 12, background: '#3b82f6', borderRadius: '50%', border: '3px solid #fff', boxShadow: '0 0 0 1px #e2e8f0' }} />
                      <div style={{ background: '#fff', border: '1px solid #e2e8f0', padding: 16, borderRadius: 12 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: '#3b82f6', marginBottom: 4 }}>DAY {ms.day}</div>
                        <div style={{ color: '#0f172a', fontSize: 14 }}>{ms.description}</div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Details */}
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 16 }}>
                  <div style={{ background: '#f8fafc', padding: 20, borderRadius: 16 }}>
                    <h4 style={{ margin: '0 0 12px', fontSize: 13, color: '#64748b', display: 'flex', alignItems: 'center', gap: 6 }}><AlertTriangle size={14} /> IDENTIFIED RISKS</h4>
                    <ul style={{ margin: 0, paddingLeft: 16, color: '#334155', fontSize: 14, lineHeight: 1.6 }}>
                      {simulation.risks.map((r: string, i: number) => <li key={i}>{r}</li>)}
                    </ul>
                  </div>
                  <div style={{ background: '#f8fafc', padding: 20, borderRadius: 16 }}>
                    <h4 style={{ margin: '0 0 12px', fontSize: 13, color: '#64748b', display: 'flex', alignItems: 'center', gap: 6 }}><Info size={14} /> ALTERNATIVE PATH</h4>
                    <p style={{ margin: 0, color: '#334155', fontSize: 14, lineHeight: 1.6 }}>{simulation.alternative}</p>
                    
                    <h4 style={{ margin: '16px 0 12px', fontSize: 13, color: '#64748b', display: 'flex', alignItems: 'center', gap: 6 }}><Activity size={14} /> COST ESTIMATE</h4>
                    <p style={{ margin: 0, color: '#334155', fontSize: 14, lineHeight: 1.6, fontWeight: 600 }}>{simulation.costEstimate}</p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
