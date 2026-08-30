import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { HeartPulse } from 'lucide-react';
import { AmbientSyncEngine } from '../../services/AmbientSyncEngine';

export function LivingHeartIcon({ size = 24, color = '#F43F5E' }: { size?: number, color?: string }) {
  const [bpm, setBpm] = useState(62); // Default fallback

  useEffect(() => {
    const fetchBpm = async () => {
      const data = await AmbientSyncEngine.pullLiveBiometrics();
      if (data && data.heartRate) {
        setBpm(data.heartRate);
      }
    };
    fetchBpm();
  }, []);

  // Calculate duration of one beat in seconds
  const beatDuration = 60 / bpm;

  return (
    <motion.div
      animate={{ scale: [1, 1.2, 1] }}
      transition={{ 
        duration: beatDuration, 
        repeat: Infinity, 
        ease: "easeInOut",
        times: [0, 0.15, 1] // Sharp heartbeat curve
      }}
      style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
    >
      <HeartPulse size={size} color={color} strokeWidth={2.5} />
    </motion.div>
  );
}