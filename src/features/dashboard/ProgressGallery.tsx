import { FitnessNav } from '../../components/ui/FitnessNav';
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, X, Share } from 'lucide-react';
import { useIsMobile } from '../../hooks/useIsMobile';
import { FitnessService } from '../../services/FitnessService';
import { supabase } from '../../services/supabaseClient';
import { triggerHapticLight, triggerHapticSuccess } from '../../services/haptics';

export const ProgressGallery: React.FC = () => {
  const isMobile = useIsMobile();
  const [loading, setLoading] = useState(true);
  const [showPolaroidModal, setShowPolaroidModal] = useState(false);
  
  // Mock data for transformation
  const mockBeforeImg = 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=600&q=80';
  const mockAfterImg = 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=600&q=80';

  useEffect(() => {
    // Simulate loading
    const t = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(t);
  }, []);

  const handleShare = async () => {
    triggerHapticLight();
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'My Transformation',
          text: 'Lost 14.2 kg in 4 Months on HealthChain360!',
          url: window.location.href,
        });
        triggerHapticSuccess();
      } catch (err) {
        console.error('Share failed', err);
      }
    } else {
      alert("Sharing is not supported on this browser.");
    }
  };

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: '#10B981' }}>Loading Gallery...</div>;
  }

  return (
    <div style={{
      width: '100%',
      backgroundColor: '#F8FAFC',
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      paddingBottom: isMobile ? 'calc(80px + env(safe-area-inset-bottom))' : '40px',
      overflowX: 'hidden'
    }}>
      <div style={{ paddingTop: isMobile ? "12px" : "24px", background: 'white' }}>
        <FitnessNav />
      </div>

      <div style={{ padding: '24px' }}>
        
        {/* Gallery Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '28px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.5px' }}>Progress</h1>
            <p style={{ margin: '4px 0 0', color: '#64748B', fontSize: '15px' }}>Your transformation journey</p>
          </div>
          <button 
            onClick={() => { triggerHapticLight(); setShowPolaroidModal(true); }}
            style={{ width: '48px', height: '48px', borderRadius: '24px', background: '#10B981', color: 'white', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(16,185,129,0.3)' }}
          >
            <Camera size={24} />
          </button>
        </div>

        {/* The Premium Transformation Share Card */}
        <div style={{ background: 'white', borderRadius: '32px', padding: '16px', boxShadow: '0 12px 32px rgba(0,0,0,0.06)' }}>
          {/* Card Frame */}
          <div style={{ borderRadius: '24px', overflow: 'hidden', position: 'relative', background: '#111' }}>
            <div style={{ display: 'flex', height: '400px' }}>
              <div style={{ flex: 1, position: 'relative' }}>
                <img src={mockBeforeImg} alt="Before" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <div style={{ position: 'absolute', bottom: '80px', left: 0, right: 0, textAlign: 'center', color: 'rgba(255,255,255,0.7)', fontSize: '13px', fontWeight: 600, letterSpacing: '1px' }}>
                  BEFORE
                </div>
              </div>
              <div style={{ width: '2px', background: 'rgba(255,255,255,0.2)', zIndex: 10 }} />
              <div style={{ flex: 1, position: 'relative' }}>
                <img src={mockAfterImg} alt="After" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <div style={{ position: 'absolute', bottom: '80px', left: 0, right: 0, textAlign: 'center', color: 'rgba(255,255,255,0.7)', fontSize: '13px', fontWeight: 600, letterSpacing: '1px' }}>
                  AFTER
                </div>
              </div>
            </div>
            
            {/* Stats Overlay Block */}
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(to top, rgba(15,23,42,0.95) 0%, rgba(15,23,42,0.8) 100%)', padding: '24px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', backdropFilter: 'blur(10px)' }}>
              <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '13px', fontWeight: 500 }}>Aditya J., 24 yrs</span>
              <h3 style={{ color: 'white', margin: '4px 0 12px', fontSize: '20px', fontWeight: 700 }}>Lost 14.2 kg in 4 Months</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><path d="M20 6L9 17l-5-5"></path></svg>
                </div>
                <span style={{ color: 'white', fontSize: '14px', fontWeight: 700 }}>HealthChain360</span>
              </div>
            </div>
          </div>

          {/* Stat Pills */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', padding: '16px 8px 8px' }}>
            {['-14.2 kg', '4 months', '24 yrs', 'Weight loss', 'Coach-led'].map(pill => (
              <span key={pill} style={{ padding: '6px 14px', background: '#F1F5F9', color: '#0F172A', borderRadius: '20px', fontSize: '13px', fontWeight: 600 }}>
                {pill}
              </span>
            ))}
          </div>
          
          <button 
            onClick={handleShare}
            style={{ width: '100%', marginTop: '16px', padding: '16px', borderRadius: '16px', background: '#10B981', color: 'white', border: 'none', fontSize: '16px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
          >
            <Share size={20} />
            Share Transformation
          </button>
        </div>
      </div>

      {/* Polaroid Gallery Modal */}
      <AnimatePresence>
        {showPolaroidModal && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)' }}
              onClick={() => setShowPolaroidModal(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              style={{ position: 'relative', width: '100%', maxWidth: '400px', background: '#F8FAFC', borderRadius: '32px', padding: '32px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', boxShadow: '0 24px 48px rgba(0,0,0,0.2)' }}
            >
              <button 
                onClick={() => setShowPolaroidModal(false)}
                style={{ position: 'absolute', top: '24px', right: '24px', background: 'none', border: 'none', color: '#64748B' }}
              >
                <X size={24} />
              </button>
              
              <h2 style={{ fontSize: '28px', fontWeight: 800, color: '#0F172A', textAlign: 'center', margin: '0 0 12px', lineHeight: 1.1 }}>Build Your<br/>Progress Gallery</h2>
              <p style={{ fontSize: '14px', color: '#64748B', textAlign: 'center', margin: '0 0 40px', lineHeight: 1.4 }}>
                Add a photo to your recent weight log. Every photo helps you see changes the scale can't.
              </p>

              {/* Fanned Polaroids */}
              <div style={{ position: 'relative', width: '100%', height: '220px', display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: '40px' }}>
                <div style={{ position: 'absolute', left: '10%', transform: 'rotate(-12deg)', zIndex: 1, background: 'white', padding: '10px 10px 40px', borderRadius: '12px', boxShadow: '0 12px 24px rgba(0,0,0,0.1)' }}>
                  <div style={{ width: '120px', height: '140px', background: '#e2e8f0', borderRadius: '6px', overflow: 'hidden' }}>
                    <img src="https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=400&q=80" alt="Day 1" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                  <div style={{ position: 'absolute', bottom: '10px', width: '100%', textAlign: 'center', fontFamily: '"Comic Sans MS", cursive, sans-serif', fontSize: '16px', fontWeight: 'bold' }}>Day 1</div>
                </div>
                
                <div style={{ position: 'absolute', right: '10%', transform: 'rotate(12deg)', zIndex: 2, background: 'white', padding: '10px 10px 40px', borderRadius: '12px', boxShadow: '0 12px 24px rgba(0,0,0,0.1)' }}>
                  <div style={{ width: '120px', height: '140px', background: '#e2e8f0', borderRadius: '6px', overflow: 'hidden' }}>
                    <img src="https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=400&q=80" alt="Day X" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                  <div style={{ position: 'absolute', bottom: '10px', width: '100%', textAlign: 'center', fontFamily: '"Comic Sans MS", cursive, sans-serif', fontSize: '16px', fontWeight: 'bold' }}>Day X</div>
                </div>

                <div style={{ position: 'absolute', zIndex: 3, transform: 'rotate(2deg) translateY(-10px)', background: 'white', padding: '12px 12px 50px', borderRadius: '16px', boxShadow: '0 20px 40px rgba(0,0,0,0.15)' }}>
                  <div style={{ width: '140px', height: '160px', background: '#e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                    <img src="https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400&q=80" alt="Day 15" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                  <div style={{ position: 'absolute', bottom: '15px', width: '100%', textAlign: 'center', fontFamily: '"Comic Sans MS", cursive, sans-serif', fontSize: '20px', fontWeight: 'bold' }}>Day 15</div>
                </div>
              </div>

              <button 
                onClick={() => { triggerHapticLight(); setShowPolaroidModal(false); }}
                style={{ width: '100%', padding: '16px', borderRadius: '16px', background: '#10B981', color: 'white', border: 'none', fontSize: '16px', fontWeight: 700 }}
              >
                Add Photo
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
export default ProgressGallery;
