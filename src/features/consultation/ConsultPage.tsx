import React, { useEffect } from 'react';
import JarvisInvestigator from '../jarvis/JarvisInvestigator';

export default function ConsultPage() {
  useEffect(() => {
    // Dynamic theme background for Clinical Data Engine workstation
    const mainContent = document.getElementById('main-content');
    if (mainContent) {
      mainContent.style.backgroundColor = '#FFFDFB';
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
        background: 'linear-gradient(180deg, #FFFDFB 0%, #FFF7ED 35%, #FFFDFB 100%)',
        backgroundColor: '#FFFDFB',
        minHeight: '100%',
        paddingBottom: '80px',
        margin: '-24px -16px',
        padding: '16px 16px 80px 16px',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* Warm ambient color patches for frosted glass refraction */}
      <div style={{ position: 'absolute', top: '8%', left: '12%', width: '220px', height: '220px', background: '#FFEDD5', borderRadius: '50%', filter: 'blur(70px)', zIndex: 0, opacity: 0.7 }} />
      <div style={{ position: 'absolute', top: '35%', right: '10%', width: '200px', height: '200px', background: '#FED7AA', borderRadius: '50%', filter: 'blur(70px)', zIndex: 0, opacity: 0.5 }} />
      <div style={{ position: 'absolute', bottom: '15%', left: '15%', width: '240px', height: '240px', background: '#FEF3C7', borderRadius: '50%', filter: 'blur(80px)', zIndex: 0, opacity: 0.6 }} />

      <div style={{ position: 'relative', zIndex: 2 }}>
        <JarvisInvestigator />
      </div>
    </div>
  );
}
