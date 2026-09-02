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
        background: 'linear-gradient(180deg, #FFFFFF 0%, #FDFBF7 25%, #FAF7F0 100%)',
        minHeight: '100%',
        paddingBottom: '60px',
        margin: '-24px -16px',
        padding: '24px 16px 60px 16px',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* Small, distinct patches of color perfectly matched to the Consult Page context (Soft Blue & Slate) */}
        {/* Top Left: Near 'Attach Lab Reports' and 'Quick Consult' (Soft Blue) */}
        <div style={{ position: 'absolute', top: '15%', left: '15%', width: '120px', height: '120px', background: '#DBEAFE', borderRadius: '50%', filter: 'blur(35px)', transform: 'translateZ(0)', willChange: 'transform', zIndex: 0 }} />
        {/* Middle Right: Near 'Deploy AI Agents' (Soft Slate/Blue) */}
        <div style={{ position: 'absolute', top: '45%', right: '15%', width: '120px', height: '120px', background: '#E2E8F0', borderRadius: '50%', filter: 'blur(35px)', transform: 'translateZ(0)', willChange: 'transform', zIndex: 0 }} />
        {/* Bottom Left: Near 'Collaborative Cases' (Soft Creme/White) */}
        <div style={{ position: 'absolute', bottom: '15%', left: '20%', width: '120px', height: '120px', background: '#F8FAFC', borderRadius: '50%', filter: 'blur(35px)', transform: 'translateZ(0)', willChange: 'transform', zIndex: 0 }} />
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
          <div style={{ flex: 1, height: '1px', background: 'linear-gradient(90deg, transparent, rgba(15, 139, 126, 0.15))' }} />
          
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '36px',
              height: '36px',
              background: '#FFF9F0',
              borderRadius: '50%',
              border: '1px solid #FED7AA',
              boxShadow: '0 2px 6px rgba(253, 186, 116, 0.15)',
              flexShrink: 0
            }}
          >
            <span
              style={{
                fontSize: '13px',
                fontWeight: 800,
                color: '#EA580C',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}
            >
              OR
            </span>
          </div>
          
          <div style={{ flex: 1, height: '1px', background: 'linear-gradient(270deg, transparent, rgba(15, 139, 126, 0.15))' }} />
        </motion.div>
      </div>
      {/* Deep Consult Section */}
      <section style={{ position: 'relative', zIndex: 1 }}>
        <MDTHub />
      </section>
    </div>
  );
}
