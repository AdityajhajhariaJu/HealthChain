import React from 'react';
import QuickConsult from './QuickConsult';
import MDTHub from '../mdt/MDTHub';
import { motion } from 'framer-motion';
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
      }}
    >
      {/* Quick Consult Section */}
      <section style={{ position: 'relative', zIndex: 2 }}>
        <QuickConsult />
      </section>

      {/* Deep Consult Divider */}
      <div 
        style={{ 
          maxWidth: '800px', 
          margin: '-16px auto 0 auto', 
          padding: '0 20px 40px',
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
            flexDirection: 'column', 
            alignItems: 'center',
            gap: '12px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', width: '100%', gap: '24px' }}>
            <div style={{ flex: 1, height: '1px', background: 'linear-gradient(90deg, transparent, rgba(15, 139, 126, 0.15))' }} />
            
            <div 
              style={{ 
                width: '48px', 
                height: '48px', 
                borderRadius: '16px', 
                background: '#FFFFFF',
                boxShadow: '0 4px 12px rgba(15, 139, 126, 0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              <NetworkHubIcon size={24} color="var(--teal)" />
            </div>
            
            <div style={{ flex: 1, height: '1px', background: 'linear-gradient(270deg, transparent, rgba(15, 139, 126, 0.15))' }} />
          </div>
          
          <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--teal)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Deep Collaborative Review
          </span>
        </motion.div>
      </div>

      {/* Deep Consult Section */}
      <section style={{ position: 'relative', zIndex: 1 }}>
        <MDTHub />
      </section>
    </div>
  );
}
