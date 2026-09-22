import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import PharmacyHub from './PharmacyHub';
import ClinicalReportAnalyzer from './ClinicalReportAnalyzer';
import { motion } from 'framer-motion';
import { Pill, FileText, ArrowLeft } from 'lucide-react';
import { triggerHapticLight } from '../../services/haptics';
import { useIsMobile } from '../../hooks/useIsMobile';
import { safeNavigateBack } from '../../services/navigation';

export default function MedicineLabPage() {
  const isMobile = useIsMobile();
  const location = useLocation();
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(location.search);
  const returnTo = searchParams.get('returnTo');
  const [activeTab, setActiveTab] = useState<'pharmacy' | 'reports'>(() => {
    if (typeof window !== 'undefined' && (window.location.hash === '#clinical-report-analyzer' || location.hash === '#clinical-report-analyzer')) {
      return 'reports';
    }
    return 'pharmacy';
  });

  const handleTabSwitch = (tab: 'pharmacy' | 'reports') => {
    triggerHapticLight();
    setActiveTab(tab);
    if (typeof window !== 'undefined') {
      if (tab === 'reports') {
        window.history.replaceState(null, '', window.location.pathname + window.location.search + '#clinical-report-analyzer');
        setTimeout(() => {
          const el = document.getElementById('clinical-report-analyzer');
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 150);
      } else {
        window.history.replaceState(null, '', window.location.pathname + window.location.search);
      }
    }
  };

  useEffect(() => {
    const handleHash = () => {
      const isReportHash = location.hash === '#clinical-report-analyzer' || (typeof window !== 'undefined' && window.location.hash === '#clinical-report-analyzer');
      if (isReportHash) {
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
  }, [location.hash]);

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
      {/* Optional Back Button */}
      {(returnTo || (typeof window !== 'undefined' && window.history?.state?.idx > 0)) && (
        <div style={{ maxWidth: '1000px', margin: '0 auto 16px auto' }}>
          <button
            type="button"
            onClick={() => {
              triggerHapticLight();
              if (returnTo && returnTo.startsWith('/app/')) {
                navigate(returnTo);
              } else {
                safeNavigateBack(navigate, '/app/today');
              }
            }}
            style={{
              background: 'rgba(255, 255, 255, 0.9)',
              border: '1px solid #E2E8F0',
              borderRadius: '999px',
              padding: '6px 14px',
              fontSize: '13px',
              fontWeight: 600,
              color: '#475569',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 2px 6px rgba(0, 0, 0, 0.04)'
            }}
          >
            <ArrowLeft size={15} /> Back
          </button>
        </div>
      )}

      {/* Tool switcher */}
      <div 
        style={{ 
          maxWidth: '1000px', 
          margin: '0 auto 24px auto', 
          display: 'flex', 
          justifyContent: 'center' 
        }}
      >
        <div 
          role="tablist"
          aria-label="Medicine and Lab Tools"
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
            role="tab"
            aria-selected={activeTab === 'pharmacy'}
            onClick={() => handleTabSwitch('pharmacy')}
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
            <Pill size={15} /> Pharmacy
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'reports'}
            onClick={() => handleTabSwitch('reports')}
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
              background: activeTab === 'reports' ? '#0D9488' : 'transparent',
              color: activeTab === 'reports' ? '#FFFFFF' : '#64748B',
            }}
          >
            <FileText size={15} /> Reports
          </button>
        </div>
      </div>

      {activeTab === 'pharmacy' && (
        <section style={{ position: 'relative', zIndex: 2 }}>
          <PharmacyHub />
        </section>
      )}

      {activeTab === 'reports' && (
        <section id="clinical-report-analyzer" style={{ position: 'relative', zIndex: 1, scrollMarginTop: '24px' }}>
          <ClinicalReportAnalyzer />
        </section>
      )}
    </div>
  );
}
