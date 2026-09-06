import React from 'react';
import QuickConsult from './QuickConsult';
import MDTHub from '../mdt/MDTHub';
import { motion } from 'framer-motion';
import { Network } from 'lucide-react';
import { NetworkHubIcon } from '../../components/ui/NetworkHubIcon';

export default function ConsultPage() {
  return (
    <div 
      className="consult-page-wrapper"
      style={{
        background: 'linear-gradient(180deg, #F8FAFC 0%, #F0FDFA 40%, #F8FAFC 100%)',
        backgroundColor: '#F8FAFC',
        minHeight: '100%',
        paddingBottom: '60px',
        margin: '-24px -16px',
        padding: '24px 16px 60px 16px',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* Distinct ambient color patches for frosted glass refraction */}
      {/* Top Left: Behind Quick Consult (Soft Blue) */}
      <div style={{ position: 'absolute', top: '12%', left: '15%', width: '140px', height: '140px', background: '#DBEAFE', borderRadius: '50%', filter: 'blur(40px)', zIndex: 0 }} />
      {/* Middle Right: Near Quick Consult / Divider (Soft Mint/Teal) */}
      <div style={{ position: 'absolute', top: '35%', right: '12%', width: '130px', height: '130px', background: '#CCFBF1', borderRadius: '50%', filter: 'blur(40px)', zIndex: 0 }} />
      {/* Deep Collab Top Right: Behind Deep Collab Header (Emerald / Mint) */}
      <div style={{ position: 'absolute', top: '55%', right: '15%', width: '160px', height: '160px', background: '#CCFBF1', borderRadius: '50%', filter: 'blur(45px)', zIndex: 0 }} />
      {/* Deep Collab Left: Behind Deep Collab Stepper (Soft Lavender/Slate) */}
      <div style={{ position: 'absolute', top: '68%', left: '12%', width: '140px', height: '140px', background: '#EDE9FE', borderRadius: '50%', filter: 'blur(45px)', zIndex: 0 }} />
      {/* Bottom Center: Warm grounding light */}
      <div style={{ position: 'absolute', bottom: '8%', left: '30%', width: '180px', height: '180px', background: '#FEF3C7', borderRadius: '50%', filter: 'blur(50px)', zIndex: 0 }} />
      {/* Quick Consult Section */}
      <section style={{ position: 'relative', zIndex: 2 }}>
        <QuickConsult />
      </section>

      {/* Deep Consult Divider */}
      <div 
        style={{ 
          maxWidth: '800px', 
          margin: '-24px auto -8px auto', 
          padding: '0 20px 0px',
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
            gap: '16px'
          }}
        >
          <div style={{ flex: 1, height: '1px', background: 'linear-gradient(90deg, transparent, rgba(15, 139, 126, 0.2))' }} />
          
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
          
          <div style={{ flex: 1, height: '1px', background: 'linear-gradient(270deg, transparent, rgba(15, 139, 126, 0.2))' }} />
        </motion.div>
      </div>
      {/* Deep Consult Section */}
      <section style={{ position: 'relative', zIndex: 1 }}>
        <MDTHub />
      </section>
    </div>
  );
}
