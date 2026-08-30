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
    } else if (hour >= 21 || hour <= 4) {
      feed.push({
        id: 'midnight-craving',
        image: '/images/immersive/midnight-craving.png',
        title: 'Craving sugar?',
        subtitle: 'Your body actually needs sleep. Try this instead.',
        route: '/app/nutrition', // Route to nutrition for now
        priority: 100,
      });
    } else {
      feed.push({
        id: 'grocery-scanner',
        image: '/images/immersive/grocery-scanner.png',
        title: 'Grocery Intelligence',
        subtitle: 'Scan for glycemic spikes and better alternatives.',
        route: '/app/nutrition',
        priority: 40,
      });
    }

    const hasSevereCondition = profile?.conditions?.some((c: string) => 
      ['cancer', 'tumor', 'spondylitis', 'autoimmune', 'severe'].some(kw => c.toLowerCase().includes(kw))
    );

    if (hasSevereCondition || profile?.goal === 'Manage chronic illness') {
      feed.push({
        id: 'clinical-trials',
        image: '/images/immersive/clinical-trials.png',
        title: 'Standard treatments stopped working?',
        subtitle: 'Connect with clinical trials worldwide.',
        route: '/app/trials',
        priority: 200, 
      });
    }

    feed.sort((a, b) => b.priority - a.priority);
    setCards(feed);
  }, []);

  return (
    <div className="hide-scrollbar" style={{ display: 'flex', overflowX: 'auto', gap: '16px', width: '100vw', padding: '0 24px 24px 24px', marginLeft: '-24px', scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch' }}>
      {cards.map((card, index) => (
        <motion.div
          key={card.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: index * 0.1 }}
          onClick={() => navigate(card.route)}
          style={{ 
            position: 'relative',
            width: '180px',
            minWidth: '180px',
            height: '240px',
            scrollSnapAlign: 'center',
            borderRadius: '28px',
            overflow: 'hidden',
            cursor: 'pointer',
            backgroundColor: '#0F172A',
            boxShadow: '0 20px 40px -15px rgba(0,0,0,0.3)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-end'
          }}
        >
          {/* Background Image */}
          <div 
            style={{ 
              position: 'absolute',
              top: 0, left: 0, right: 0, bottom: 0,
              backgroundImage: "url(" + card.image + ")",
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              zIndex: 1
            }}
          />
          
          {/* Gradient Overlay for Text Legibility */}
          <div 
            style={{
              position: 'absolute',
              bottom: 0, left: 0, right: 0, height: '60%',
              background: 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.4) 60%, transparent 100%)',
              zIndex: 2
            }}
          />

          {/* Text Content at Bottom */}
          <div style={{ position: 'relative', zIndex: 3, padding: '16px', paddingBottom: '20px' }}>
            <div 
              style={{
                padding: '0px 8px',
              }}
            >
              <h2 style={{ color: '#FFFFFF', fontSize: '18px', fontWeight: 800, margin: '0 0 8px 0', lineHeight: '1.2' }}>
                {card.title}
              </h2>
              <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: '14px', fontWeight: 500, margin: '0 0 16px 0', lineHeight: '1.4' }}>
                {card.subtitle}
              </p>
              
              <div style={{ display: 'flex', alignItems: 'center', color: '#34D399', fontWeight: 700, fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px', gap: '6px' }}>
                <Sparkles size={16} />
                <span>Tap to Explore</span>
                <ArrowRight size={16} />
              </div>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
};