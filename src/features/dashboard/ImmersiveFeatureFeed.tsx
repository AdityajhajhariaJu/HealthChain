import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { getProfile } from '../../services/ProfileEngine';
import { useNavigate } from 'react-router-dom';
import { Sparkles, ArrowRight } from 'lucide-react';

interface FeedCard {
  id: string;
  image: string;
  title: string;
  subtitle: string;
  route: string;
  priority: number;
}

export const ImmersiveFeatureFeed: React.FC = () => {
  const navigate = useNavigate();
  const [cards, setCards] = useState<FeedCard[]>([]);

  useEffect(() => {
    const profile = getProfile();
    const hour = new Date().getHours();
    
    let feed: FeedCard[] = [
      {
        id: 'streak',
        image: '/images/immersive/streak-rewards.png',
        title: 'Master your health, one day at a time.',
        subtitle: 'Answer questions. Build your streak. Unlock rewards.',
        route: '/app/today',
        priority: 10,
      },
      {
        id: 'meal-personalized',
        image: '/images/immersive/personalized-meal.png',
        title: 'Personalized For You',
        subtitle: 'Your cortisol is down. I\'ve updated your meal plan.',
        route: '/app/dietician',
        priority: 20,
      }
    ];

    if (hour >= 13 && hour <= 16) {
      feed.push({
        id: 'focus-boost',
        image: '/images/immersive/focus-boost.png',
        title: '2 PM Focus Boost',
        subtitle: 'Add these for cognitive energy.',
        route: '/app/dietician',
        priority: 100, 
      });
    }

    if (profile.medicalConditions?.some(c => c.toLowerCase().includes('diabetes'))) {
      feed.push({
        id: 'glucose-spike',
        image: '/images/immersive/doctor-biomarker.png',
        title: 'Post-Meal Spike Detected',
        subtitle: 'Let\'s take a 10-minute walk to stabilize glucose.',
        route: '/app/today',
        priority: 90, 
      });
    }
    
    feed.sort((a, b) => b.priority - a.priority);
    setCards(feed); // Only take top 3 for the fanned layout
  }, []);

  const getCardStyle = (index: number, total: number) => {
    if (total === 3) {
      if (index === 0) return { rotate: -15, x: 40, y: 10, zIndex: 1, scale: 0.9 };
      if (index === 1) return { rotate: 0, x: 0, y: -10, zIndex: 10, scale: 1.05 };
      if (index === 2) return { rotate: 15, x: -40, y: 10, zIndex: 1, scale: 0.9 };
    }
    if (total === 2) {
      if (index === 0) return { rotate: -8, x: 20, y: 0, zIndex: 1, scale: 0.95 };
      if (index === 1) return { rotate: 8, x: -20, y: 0, zIndex: 2, scale: 1.0 };
    }
    return { rotate: 0, x: 0, y: 0, zIndex: 1, scale: 1 };
  };

  if (cards.length === 0) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <div style={{ marginBottom: '16px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 2px', color: '#0F172A', letterSpacing: '-0.5px' }}>Discover Insights</h2>
        <p style={{ fontSize: '14px', color: '#64748B', margin: 0 }}>Personalized AI-driven health discoveries.</p>
      </div>
      
      <div className="hide-scrollbar scrollable-row" style={{ display: 'flex', gap: '16px', overflowX: 'auto', padding: '0 24px 16px', scrollbarWidth: 'none', margin: '0 -24px', WebkitOverflowScrolling: 'touch' }}>
        {cards.map((card, index) => (
          <motion.div
            key={card.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: index * 0.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate(card.route)}
            style={{
              flexShrink: 0,
              position: 'relative',
              width: '160px',
              height: '220px',
              borderRadius: '20px',
              overflow: 'hidden',
              cursor: 'pointer',
              backgroundColor: '#0F172A',
              boxShadow: '0 8px 24px -8px rgba(0,0,0,0.15)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'flex-end',
            }}
          >
            <img 
              src={card.image} 
              alt={card.title}
              style={{
                position: 'absolute',
                top: 0, left: 0, width: '100%', height: '100%',
                objectFit: 'cover',
                zIndex: 0
              }}
            />
            <div 
              style={{
                position: 'absolute',
                inset: 0,
                background: 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.3) 60%, transparent 100%)',
                zIndex: 1
              }}
            />

            <div style={{ position: 'relative', zIndex: 2, padding: '16px' }}>
              <h3 style={{ color: '#FFFFFF', fontSize: '15px', fontWeight: 700, margin: '0 0 4px 0', lineHeight: '1.2' }}>
                {card.title}
              </h3>
              <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '12px', margin: '0 0 12px 0', lineHeight: '1.4', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                {card.subtitle}
              </p>
              <div style={{ display: 'inline-flex', alignItems: 'center', background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)', padding: '6px 12px', borderRadius: '99px', color: '#FFFFFF', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', gap: '4px' }}>
                <Sparkles size={12} />
                <span>Explore</span>
                <ArrowRight size={12} />
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};
