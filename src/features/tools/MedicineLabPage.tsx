import React, { useState, useEffect } from 'react';
import PharmacyHub from './PharmacyHub';
import ClinicalReportAnalyzer from './ClinicalReportAnalyzer';
import { motion } from 'framer-motion';
import { Pill, FileText, Layers } from 'lucide-react';
import { triggerHapticLight } from '../../services/haptics';
import { useIsMobile } from '../../hooks/useIsMobile';

export default function MedicineLabPage() {
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState<'all' | 'pharmacy' | 'reports'>(() => {
    if (typeof window !== 'undefined' && window.location.hash === '#clinical-report-analyzer') {
      return 'reports';
    }
    return 'all';
  });

  useEffect(() => {
    const handleHash = () => {
      if (window.location.hash === '#clinical-report-analyzer') {
        setActiveTab('reports');
        setTimeout(() => {
          const el = document.getElementById('clinical-report-analyzer');
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 150);
      }
    };

    handleHash();
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  return (
    <div 
      className="medicine-lab-page-wrapper"
      style={{
        background: 'linear-gradient(180deg, #FFFFFF 0%, #FDFBF7 25%, #FAF7F0 100%)',
        minHeight: '100%',
        paddingBottom: '60px',
        margin: '-24px -16px',
        padding: '24px 16px 60px 16px',
      }}
    >
      {/* Tool Switcher Header Tabs */}
      <div 
        style={{ 
          maxWidth: '1000px', 
          margin: '0 auto 24px auto', 
          display: 'flex', 
          justifyContent: 'center' 
        }}
      >
        <div 
          style={{ 
            display: 'inline-flex', 
            background: 'rgba(255, 255, 255, 0.85)', 
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            padding: '4px', 
            borderRadius: '99px', 
            border: '1px solid #E2E8F0',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.04)',
            gap: '4px'
          }}
        >
          <button
            type="button"
            onClick={() => { triggerHapticLight(); setActiveTab('all'); }}
            style={{
              padding: isMobile ? '8px 14px' : '10px 20px',
              borderRadius: '99px',
              border: 'none',
              fontSize: '13px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              background: activeTab === 'all' ? '#0F172A' : 'transparent',
              color: activeTab === 'all' ? '#FFFFFF' : '#64748B',
            }}
          >
            <Layers size={15} /> All Tools
          </button>
          <button
            type="button"
            onClick={() => { triggerHapticLight(); setActiveTab('pharmacy'); }}
            style={{
              padding: isMobile ? '8px 14px' : '10px 20px',
              borderRadius: '99px',
              border: 'none',
              fontSize: '13px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              background: activeTab === 'pharmacy' ? '#059669' : 'transparent',
              color: activeTab === 'pharmacy' ? '#FFFFFF' : '#64748B',
            }}
          >
            <Pill size={15} /> Pharmacy Hub
          </button>
          <button
            type="button"
            onClick={() => { 
              triggerHapticLight(); 
              setActiveTab('reports'); 
              window.location.hash = 'clinical-report-analyzer';
            }}
            style={{
              padding: isMobile ? '8px 14px' : '10px 20px',
              borderRadius: '99px',
              border: 'none',
              fontSize: '13px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              background: activeTab === 'reports' ? '#2563EB' : 'transparent',
              color: activeTab === 'reports' ? '#FFFFFF' : '#64748B',
            }}
          >
            <FileText size={15} /> Report Analyzer
          </button>
        </div>
      </div>

      {(activeTab === 'all' || activeTab === 'pharmacy') && (
        <section style={{ position: 'relative', zIndex: 2 }}>
          <PharmacyHub />
        </section>
      )}

      {activeTab === 'all' && (
        <div 
          style={{ 
            maxWidth: '800px', 
            margin: '24px auto', 
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
              width: '100%',
              alignItems: 'center',
              gap: '16px'
            }}
          >
            <div style={{ flex: 1, height: '1px', background: 'linear-gradient(90deg, transparent, rgba(15, 139, 126, 0.15))' }} />
            
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '36px',
                height: '36px',
                background: '#F0FDF4',
                borderRadius: '50%',
                border: '1px solid #BBF7D0',
                boxShadow: '0 2px 6px rgba(187, 247, 208, 0.15)',
                flexShrink: 0
              }}
            >
              <span
                style={{
                  fontSize: '13px',
                  fontWeight: 800,
                  color: '#16A34A',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}
              >
                +
              </span>
            </div>
            
            <div style={{ flex: 1, height: '1px', background: 'linear-gradient(270deg, transparent, rgba(15, 139, 126, 0.15))' }} />
          </motion.div>
        </div>
      )}

      {(activeTab === 'all' || activeTab === 'reports') && (
        <section id="clinical-report-analyzer" style={{ position: 'relative', zIndex: 1, scrollMarginTop: '24px' }}>
          <ClinicalReportAnalyzer />
        </section>
      )}
    </div>
  );
}
