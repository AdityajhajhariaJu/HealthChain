import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { getProfile } from '../../services/ProfileEngine';
import { useNavigate } from 'react-router-dom';
import { Sparkles, ArrowRight, Activity, Beaker } from 'lucide-react';

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
    
    // Baseline Cards
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

    // Contextual Injection: Time-based
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
        route: '/app/sleep',
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

    // Contextual Injection: Clinical State
    const hasSevereCondition = profile?.conditions?.some((c: string) => 
      ['cancer', 'tumor', 'spondylitis', 'autoimmune', 'severe'].some(kw => c.toLowerCase().includes(kw))
    );

    if (hasSevereCondition || profile?.goal === 'Manage chronic illness') {
      feed.push({
        id: 'clinical-trials',
        image: '/images/immersive/clinical-trials.png',
        title: 'When standard treatments stop working...',
        subtitle: 'Connect with clinical trials worldwide.',
        route: '/app/clinical-trials',
        priority: 200, 
      });
    }

    // Sort by priority descending
    feed.sort((a, b) => b.priority - a.priority);
    setCards(feed);
  }, []);

  return (
    <div className="w-full flex flex-col gap-6 pb-24 pt-4 px-4 bg-[#020617] min-h-screen">
      {cards.map((card, index) => (
        <motion.div
          key={card.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: index * 0.1 }}
          onClick={() => navigate(card.route)}
          className="relative w-full rounded-[28px] overflow-hidden cursor-pointer shadow-2xl"
          style={{ 
            aspectRatio: '4/5',
            backgroundColor: '#0F172A',
            boxShadow: '0 20px 40px -15px rgba(0,0,0,0.5)'
          }}
        >
          {/* Background Image */}
          <div 
            className="absolute inset-0 bg-cover bg-center transition-transform duration-700 hover:scale-105"
            style={{ backgroundImage: "url(" + card.image + ")" }}
          />
          
          {/* Gradient Overlay for Text Legibility */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />

          {/* Floating Glass Content at Bottom */}
          <div className="absolute bottom-6 left-6 right-6">
            <div 
              className="p-5 rounded-2xl border border-white/10"
              style={{
                backdropFilter: 'blur(24px)',
                WebkitBackdropFilter: 'blur(24px)',
                background: 'rgba(255, 255, 255, 0.05)',
                boxShadow: '0 4px 30px rgba(0, 0, 0, 0.1)'
              }}
            >
              <h2 className="text-white text-2xl font-black tracking-tight leading-tight mb-2">
                {card.title}
              </h2>
              <p className="text-white/80 text-sm font-medium leading-snug mb-4">
                {card.subtitle}
              </p>
              
              <div className="flex items-center text-emerald-400 font-bold text-sm tracking-wide uppercase gap-2">
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