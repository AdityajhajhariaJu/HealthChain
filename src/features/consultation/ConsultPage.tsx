import React, { useEffect } from 'react';
import JarvisInvestigator from '../jarvis/JarvisInvestigator';

export default function ConsultPage() {
  useEffect(() => {
    // Dynamic theme background for Clinical Data Engine workstation
    const mainContent = document.getElementById('main-content');
    if (mainContent) {
      mainContent.style.backgroundColor = '#F8FAFC';
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
        background: 'linear-gradient(180deg, #F8FAFC 0%, #F0FDFA 35%, #F8FAFC 100%)',
        backgroundColor: '#F8FAFC',
        minHeight: '100%',
        paddingBottom: '80px',
        margin: '-24px -16px',
        padding: '16px 16px 80px 16px',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* Calm ambient medical refraction glows */}
      <div style={{ position: 'absolute', top: '5%', left: '8%', width: '280px', height: '280px', background: 'rgba(153, 246, 228, 0.45)', borderRadius: '50%', filter: 'blur(90px)', zIndex: 0, pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', top: '30%', right: '8%', width: '260px', height: '260px', background: 'rgba(167, 243, 208, 0.40)', borderRadius: '50%', filter: 'blur(90px)', zIndex: 0, pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '15%', left: '15%', width: '280px', height: '280px', background: 'rgba(224, 231, 255, 0.35)', borderRadius: '50%', filter: 'blur(100px)', zIndex: 0, pointerEvents: 'none' }} />

      <div style={{ position: 'relative', zIndex: 2 }}>
        <JarvisInvestigator />
      </div>
    </div>
  );
}
