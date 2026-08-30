import React from 'react';
import PharmacyHub from './PharmacyHub';
import ClinicalReportAnalyzer from './ClinicalReportAnalyzer';
import { motion } from 'framer-motion';

export default function MedicineLabPage() {
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
      <section style={{ position: 'relative', zIndex: 2 }}>
        <PharmacyHub />
      </section>

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

      <section style={{ position: 'relative', zIndex: 1 }}>
        <ClinicalReportAnalyzer />
      </section>
    </div>
  );
}
