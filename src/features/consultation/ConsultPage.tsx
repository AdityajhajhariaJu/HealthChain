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
      {/* Aesthetic background blobs for Consult glass cards */}
      <div style={{ position: 'absolute', top: '5%', left: '0%', width: '300px', height: '300px', background: '#FFE4E6', borderRadius: '50%', filter: 'blur(80px)', zIndex: 0 }} />
      <div style={{ position: 'absolute', top: '30%', right: '-5%', width: '250px', height: '250px', background: '#E0F2FE', borderRadius: '50%', filter: 'blur(70px)', zIndex: 0 }} />
      <div style={{ position: 'absolute', top: '60%', left: '10%', width: '350px', height: '350px', background: '#FEF3C7', borderRadius: '50%', filter: 'blur(90px)', zIndex: 0 }} />
      <div style={{ position: 'absolute', bottom: '0%', right: '0%', width: '250px', height: '250px', background: '#D1FAE5', borderRadius: '50%', filter: 'blur(80px)', zIndex: 0 }} />
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
