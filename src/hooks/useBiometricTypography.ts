import { useEffect, useState } from 'react';

export const useBiometricTypography = () => {
  const [bpm, setBpm] = useState(72);

  useEffect(() => {
    // Simulate real-time biological variance (Apple Watch mock)
    const interval = setInterval(() => {
      // Fluctuate between 65 and 95
      setBpm(prev => {
        const delta = (Math.random() - 0.5) * 5;
        let next = prev + delta;
        if (next < 60) next = 60;
        if (next > 100) next = 100;
        return next;
      });
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Convert BPM to font-weight and letter-spacing
    // 60 BPM -> lighter, spaced (calm)
    // 100 BPM -> heavier, tighter (stressed)
    const stressFactor = (bpm - 60) / 40; // 0 to 1
    
    // Base weight 400, max weight 700
    const dynamicWeight = 400 + (stressFactor * 300);
    // Base spacing 0px, min spacing -1px
    const dynamicSpacing = 0 - (stressFactor * 1);

    document.documentElement.style.setProperty('--bio-font-weight', `${dynamicWeight}`);
    document.documentElement.style.setProperty('--bio-letter-spacing', `${dynamicSpacing}px`);
  }, [bpm]);

  return bpm;
};
