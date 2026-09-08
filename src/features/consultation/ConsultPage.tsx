import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import QuickConsult from './QuickConsult';
import { ConnectionDetectiveView } from '../../components/ui/ConnectionDetectiveView';
import { motion } from 'framer-motion';
import { Network, Sparkles, Activity, ShieldCheck, ChevronDown } from 'lucide-react';
import { triggerHapticLight } from '../../services/haptics';

export default function ConsultPage() {
  const location = useLocation();

  useEffect(() => {
    if (window.location.hash === '#clinical-data-engine') {
      setTimeout(() => {
        const el = document.getElementById('clinical-data-engine');
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 250);
    }
  }, []);

  const scrollToEngine = () => {
    triggerHapticLight();
    const el = document.getElementById('clinical-data-engine');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div 
      className="consult-page-wrapper"
      style={{
        background: 'linear-gradient(180deg, #F8FAFC 0%, #F0FDFA 35%, #F8FAFC 100%)',
        backgroundColor: '#F8FAFC',
        minHeight: '100%',
        paddingBottom: '80px',
        margin: '-24px -16px',
        padding: '24px 16px 80px 16px',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* Distinct ambient color patches for frosted glass refraction */}
      <div style={{ position: 'absolute', top: '8%', left: '15%', width: '160px', height: '160px', background: '#DBEAFE', borderRadius: '50%', filter: 'blur(50px)', zIndex: 0 }} />
      <div style={{ position: 'absolute', top: '28%', right: '10%', width: '150px', height: '150px', background: '#CCFBF1', borderRadius: '50%', filter: 'blur(50px)', zIndex: 0 }} />
      <div style={{ position: 'absolute', top: '50%', left: '8%', width: '180px', height: '180px', background: '#DCFCE7', borderRadius: '50%', filter: 'blur(60px)', zIndex: 0 }} />
      <div style={{ position: 'absolute', bottom: '15%', right: '12%', width: '200px', height: '200px', background: '#EDE9FE', borderRadius: '50%', filter: 'blur(60px)', zIndex: 0 }} />

      {/* Stage 1: Quick Consult Section */}
      <section style={{ position: 'relative', zIndex: 2 }}>
        <QuickConsult />
      </section>

      {/* Consult Divider: OR */}
      <div 
        style={{ 
          maxWidth: '800px', 
          margin: '28px auto 16px auto', 
          padding: '0 20px',
          textAlign: 'center',
          position: 'relative',
          zIndex: 2
        }}
      >
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          style={{ 
            display: 'flex', 
            alignItems: 'center',
            width: '100%',
            gap: '16px'
          }}
        >
          <div style={{ flex: 1, height: '1px', background: 'linear-gradient(90deg, transparent, rgba(15, 139, 126, 0.25))' }} />
          
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '36px',
              height: '36px',
              background: '#F0FDFA',
              borderRadius: '50%',
              border: '1px solid #99F6E4',
              boxShadow: '0 2px 8px rgba(13, 148, 136, 0.12)',
              flexShrink: 0
            }}
          >
            <span
              style={{
                fontSize: '12px',
                fontWeight: 800,
                color: '#0F766E',
                textTransform: 'uppercase',
                letterSpacing: '0.8px',
              }}
            >
              OR
            </span>
          </div>
          
          <div style={{ flex: 1, height: '1px', background: 'linear-gradient(270deg, transparent, rgba(15, 139, 126, 0.25))' }} />
        </motion.div>
      </div>

      {/* Elegant Conduit Transition Banner */}
      <div 
        id="clinical-data-engine"
        style={{ 
          maxWidth: '840px', 
          margin: '16px auto 20px auto', 
          padding: '0 8px',
          textAlign: 'center',
          position: 'relative',
          zIndex: 2
        }}
      >
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
          style={{
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(240, 253, 250, 0.85) 100%)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '1.5px solid #A7F3D0',
            borderRadius: '24px',
            padding: '24px 20px',
            boxShadow: '0 12px 32px rgba(16, 185, 129, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.9)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '10px'
          }}
        >
          {/* Top Stage Pill */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: '#ECFDF5', border: '1px solid #6EE7B7', padding: '4px 12px', borderRadius: '999px' }}>
            <Sparkles size={13} color="#059669" />
            <span style={{ fontSize: '11px', fontWeight: 800, color: '#047857', letterSpacing: '0.6px', textTransform: 'uppercase' }}>
              STAGE 2 • AUTONOMOUS CLINICAL DATA ENGINE
            </span>
          </div>

          <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 900, color: '#0F172A', letterSpacing: '-0.4px', lineHeight: 1.3 }}>
            Multi-System Causal Synthesis &amp; Biomarker Deltas
          </h2>

          <p style={{ margin: 0, fontSize: '13.5px', color: '#475569', maxWidth: '580px', lineHeight: 1.5 }}>
            When standard tests look normal, our clinical data engine correlates your symptoms, functional lab ranges, and doctor blindspots into one unified case file.
          </p>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '4px', fontSize: '12px', color: '#0D9488', fontWeight: 700 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <Activity size={14} /> 4 Data Streams
            </span>
            <span>•</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <Network size={14} /> Causal Cascade
            </span>
            <span>•</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <ShieldCheck size={14} /> Doctor-Ready SBAR
            </span>
          </div>
        </motion.div>
      </div>

      {/* Stage 2: Autonomous Clinical Data Engine */}
      <section style={{ maxWidth: '840px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
        <ConnectionDetectiveView initialTab={location.state?.tab || 'map'} />
      </section>
    </div>
  );
}
