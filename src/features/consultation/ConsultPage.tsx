import React, { useEffect } from 'react';
import JarvisInvestigator from '../jarvis/JarvisInvestigator';

export default function ConsultPage() {
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
        margin: '-24px -16px',
        padding: '16px 16px 80px 16px',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* Calm ambient rose-coral medical refraction glows */}
      <div style={{ position: 'absolute', top: '5%', left: '8%', width: '300px', height: '300px', background: 'rgba(254, 205, 211, 0.45)', borderRadius: '50%', filter: 'blur(90px)', zIndex: 0, pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', top: '30%', right: '8%', width: '280px', height: '280px', background: 'rgba(254, 215, 170, 0.35)', borderRadius: '50%', filter: 'blur(90px)', zIndex: 0, pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '15%', left: '15%', width: '280px', height: '280px', background: 'rgba(255, 228, 230, 0.40)', borderRadius: '50%', filter: 'blur(100px)', zIndex: 0, pointerEvents: 'none' }} />

      <div style={{ position: 'relative', zIndex: 2 }}>
        <JarvisInvestigator />
      </div>
    </div>
  );
}

