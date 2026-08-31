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
        route: '/app/nutrition',
        priority: 20,
      }
    ];

    if (hour >= 13 && hour <= 16) {
      feed.push({
        id: 'focus-boost',
        image: '/images/immersive/focus-boost.png',
        title: '2 PM Focus Boost',
        subtitle: 'Add these for cognitive energy.',
        route: '/app/nutrition',
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
    setCards(feed.slice(0, 3)); // Only take top 3 for the fanned layout
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
    <div style={{ 
      background: '#FFFFFF', 
      borderRadius: '24px', 
      padding: '32px 16px',
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center',
      boxShadow: '0 4px 20px rgba(0,0,0,0.03)'
    }}>
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', position: 'relative', height: '220px', width: '100%', marginBottom: '24px' }}>
        {cards.map((card, index) => {
          const styleConfig = getCardStyle(index, cards.length);
          return (
            <motion.div
              key={card.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: styleConfig.y, x: styleConfig.x, rotate: styleConfig.rotate, scale: styleConfig.scale }}
              whileHover={{ scale: styleConfig.scale * 1.05, zIndex: 20, y: styleConfig.y - 10 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              onClick={() => navigate(card.route)}
              style={{ 
                position: 'absolute',
                width: '140px',
                height: '190px',
                borderRadius: '16px',
                overflow: 'hidden',
                cursor: 'pointer',
                backgroundColor: '#0F172A',
                boxShadow: '0 15px 30px -10px rgba(0,0,0,0.3)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'flex-end',
                zIndex: styleConfig.zIndex
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
                  top: 0, left: 0, right: 0, height: '40%',
                  background: 'linear-gradient(to bottom, rgba(0,0,0,0.4) 0%, transparent 100%)',
                  zIndex: 1
                }}
              />
              <div 
                style={{
                  position: 'absolute',
                  bottom: 0, left: 0, right: 0, height: '70%',
                  background: 'linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.6) 50%, transparent 100%)',
                  zIndex: 2
                }}
              />

              <div style={{ position: 'relative', zIndex: 3, padding: '12px' }}>
                <h2 style={{ color: '#FFFFFF', fontSize: '13px', fontWeight: 800, margin: '0 0 4px 0', lineHeight: '1.2' }}>
                  {card.title}
                </h2>
                <div style={{ display: 'flex', alignItems: 'center', color: '#34D399', fontWeight: 700, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.5px', gap: '4px' }}>
                  <Sparkles size={12} />
                  <span>Explore</span>
                  <ArrowRight size={12} />
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
      
      <div style={{ textAlign: 'center' }}>
        <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: 700, color: '#0F172A' }}>Discover Insights</h3>
        <p style={{ margin: 0, fontSize: '14px', color: '#64748B', maxWidth: '280px' }}>Tap a card above to uncover personalized AI-driven health discoveries.</p>
      </div>
    </div>
  );
};
