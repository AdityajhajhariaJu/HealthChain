import React, { useEffect, useState } from 'react';
import { motion, useSpring } from 'framer-motion';

export const AmbientGyroBackground = () => {
  // Use framer-motion springs for fluid, physics-based smoothing
  const x = useSpring(0, { stiffness: 40, damping: 25, mass: 0.5 });
  const y = useSpring(0, { stiffness: 40, damping: 25, mass: 0.5 });

  useEffect(() => {
    let ticking = false;

    const handleOrientation = (e: DeviceOrientationEvent) => {
      if (ticking) return;
      
      const gamma = e.gamma;
      const beta = e.beta;
      if (gamma !== null && beta !== null) {
        requestAnimationFrame(() => {
          // gamma is left/right (-90 to 90)
          // beta is front/back (-180 to 180). Normal holding is around 45.
          const shiftX = Math.max(-45, Math.min(45, gamma)); 
          const shiftY = Math.max(-45, Math.min(45, beta - 45)); 
          
          // Map to pixel translation (-30px to 30px)
          x.set(shiftX * 0.8);
          y.set(shiftY * 0.8);
          ticking = false;
        });
        ticking = true;
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (ticking) return;
      requestAnimationFrame(() => {
        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight / 2;
        x.set(((e.clientX - centerX) / centerX) * 20);
        y.set(((e.clientY - centerY) / centerY) * 20);
        ticking = false;
      });
      ticking = true;
    };

    window.addEventListener('deviceorientation', handleOrientation, { passive: true });
    window.addEventListener('mousemove', handleMouseMove, { passive: true });

    return () => {
      window.removeEventListener('deviceorientation', handleOrientation);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [x, y]);

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      zIndex: -1, // Sits strictly behind all content
      overflow: 'hidden',
      background: '#FBF9F6',
      pointerEvents: 'none',
      contain: 'strict' // CSS containment for max performance
    }}>
      {/* Hardware accelerated layer */}
      <motion.div
        style={{
          position: 'absolute',
          top: '-15%', left: '-15%',
          width: '130%', height: '130%',
          x, y,
          willChange: 'transform' // Tell GPU to expect transforms
        }}
      >
        {/* Glow Orb 1 - Azure/Primary */}
        <div style={{
          position: 'absolute',
          top: '5%', left: '10%',
          width: '70vw', height: '70vw',
          maxWidth: '500px', maxHeight: '500px',
          background: 'radial-gradient(circle, rgba(230,220,200,0.4) 0%, rgba(230,220,200,0) 70%)',
          borderRadius: '50%',
          filter: 'blur(60px)', transform: 'translateZ(0)', willChange: 'transform', transform: 'translateZ(0)'
        }} />
        
        {/* Glow Orb 2 - Secondary Ambient */}
        <div style={{
          position: 'absolute',
          bottom: '10%', right: '5%',
          width: '80vw', height: '80vw',
          maxWidth: '600px', maxHeight: '600px',
          background: 'radial-gradient(circle, rgba(255,255,255,0.6) 0%, rgba(255,255,255,0) 70%)',
          borderRadius: '50%',
          filter: 'blur(60px)', transform: 'translateZ(0)', willChange: 'transform', transform: 'translateZ(0)'
        }} />
      </motion.div>
    </div>
  );
};
