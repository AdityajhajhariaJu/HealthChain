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
            alignItems: 'center',
            width: '100%',
            gap: '16px'
          }}
        >
          <div style={{ flex: 1, height: '1px', background: 'linear-gradient(90deg, transparent, rgba(15, 139, 126, 0.15))' }} />
          
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '10px',
              padding: '8px 20px',
              background: '#F8FAFC',
              borderRadius: '999px',
              border: '1px solid #E2E8F0',
              boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
              flexShrink: 0
            }}
          >
            <Network size={16} color="#10B981" />
            <span
              style={{
                fontSize: '12px',
                fontWeight: 800,
                color: '#334155',
                textTransform: 'uppercase',
                letterSpacing: '1px',
              }}
            >
              Collaborative Board
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
