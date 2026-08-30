import React from 'react';
import { motion } from 'framer-motion';
import { User, Stethoscope, Sparkles, MessageCircle, ArrowLeft, Pin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { triggerHapticLight } from '../../services/haptics';

export default function WarRoom() {
  const navigate = useNavigate();

  return (
    <div style={{ minHeight: '100vh', background: '#F8FAFC', paddingBottom: '100px' }}>
      
      {/* Header */}
      <div style={{
        padding: 'env(safe-area-inset-top, 44px) 24px 16px',
        background: 'rgba(255, 255, 255, 0.9)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        position: 'sticky', top: 0, zIndex: 100,
        display: 'flex', alignItems: 'center', gap: '16px',
        borderBottom: '1px solid rgba(0,0,0,0.05)'
      }}>
        <button 
          onClick={() => { triggerHapticLight(); navigate(-1); }}
          style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#F1F5F9', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <ArrowLeft size={20} color="#0F172A" />
        </button>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 700, margin: 0, color: '#0F172A', letterSpacing: '-0.5px' }}>Medical War Room</h1>
          <p style={{ margin: 0, fontSize: '13px', color: '#64748B', fontWeight: 500 }}>Collaborative Health Canvas</p>
        </div>
      </div>

      <div style={{ padding: '24px', display: 'grid', gap: '24px' }}>
        
        {/* Collaborative Node 1: AI & Nutritionist */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ background: '#FFF', borderRadius: '24px', padding: '24px', boxShadow: '0 12px 32px rgba(0,0,0,0.04)', position: 'relative' }}>
          <Pin size={20} color="#EF4444" style={{ position: 'absolute', top: '-10px', right: '20px', transform: 'rotate(15deg)' }} />
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Stethoscope size={18} color="#0F172A" />
            </div>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A' }}>Dr. Sarah Jenkins (Cardiology)</div>
              <div style={{ fontSize: '12px', color: '#64748B' }}>Added a note 2 hours ago</div>
            </div>
          </div>
          <p style={{ fontSize: '15px', color: '#334155', margin: '0 0 16px', lineHeight: 1.5 }}>
            "I reviewed the latest lipid panel. HDL is looking great, but we need to drop sodium intake this week. Ava, please monitor meals."
          </p>

          {/* AI Reply Thread */}
          <div style={{ marginLeft: '24px', paddingLeft: '16px', borderLeft: '2px solid #E2E8F0', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(244, 63, 94, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Sparkles size={14} color="#F43F5E" />
              </div>
              <div style={{ background: '#F8FAFC', padding: '12px', borderRadius: '12px', fontSize: '14px', color: '#334155', lineHeight: 1.5 }}>
                <strong style={{ display: 'block', color: '#F43F5E', fontSize: '12px', marginBottom: '4px' }}>Ava (AI Assistant)</strong>
                Logged. I have flagged the user's recent "Miso Soup" logs. I will restrict high-sodium recipes from this week's meal plan.
              </div>
            </div>
          </div>
        </motion.div>

        {/* Collaborative Node 2: User Upload */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} style={{ background: '#FFF', borderRadius: '24px', padding: '24px', boxShadow: '0 12px 32px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <User size={18} color="#0F172A" />
            </div>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A' }}>You</div>
              <div style={{ fontSize: '12px', color: '#64748B' }}>Uploaded document yesterday</div>
            </div>
          </div>
          
          <div style={{ background: '#F1F5F9', border: '1px dashed #CBD5E1', borderRadius: '16px', padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: '#3B82F6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: '#FFF', fontWeight: 700, fontSize: '12px' }}>PDF</span>
            </div>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A' }}>Q3_Bloodwork_Results.pdf</div>
              <div style={{ fontSize: '12px', color: '#64748B' }}>Processed by Ava AI</div>
            </div>
          </div>

          <div style={{ marginTop: '16px', display: 'flex', gap: '8px' }}>
            <button style={{ flex: 1, padding: '10px', borderRadius: '12px', background: '#10B981', color: '#FFF', border: 'none', fontWeight: 600, fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
              <MessageCircle size={16} /> Discuss
            </button>
          </div>
        </motion.div>

      </div>
    </div>
  );
}
