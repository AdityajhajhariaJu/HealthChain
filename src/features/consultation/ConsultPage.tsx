import { useEffect } from 'react';
import { useIsMobile } from '../../hooks/useIsMobile';
import JarvisInvestigator from '../jarvis/JarvisInvestigator';

export default function ConsultPage() {
  const isMobile = useIsMobile();

  useEffect(() => {
    // Dynamic theme background for Clinical Review Symptom Workstation
    const mainContent = document.getElementById('main-content');
    if (mainContent) {
      mainContent.style.backgroundColor = '#F8F9FB';
    }
    return () => {
      if (mainContent) {
        mainContent.style.backgroundColor = '';
      }
    };
  }, []);

  return (
    <div
      className="consult-page-wrapper"
      style={{
        background: 'linear-gradient(180deg, #F8F9FB 0%, #FFF5F6 35%, #F8F9FB 100%)',
        backgroundColor: '#F8F9FB',
        minHeight: '100%',
        paddingBottom: '80px',
        margin: isMobile ? '0 -16px' : '-24px -16px',
        padding: isMobile ? '12px 12px 120px 12px' : '16px 16px 80px 16px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div style={{ position: 'relative', zIndex: 2 }}>
        <JarvisInvestigator />
      </div>
    </div>
  );
}
