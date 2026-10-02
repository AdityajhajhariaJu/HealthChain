import React, { useEffect, useRef } from 'react';
import { useVisualActivity } from '../../hooks/useVisualActivity';

export type AtmosphereTheme =
  'meditation' | 'sleep' | 'focus' | 'energy' | 'rain' | 'frequency' | 'forest';

interface LivingAtmosphereCanvasProps {
  theme: AtmosphereTheme;
  isPlaying: boolean;
}

export const LivingAtmosphereCanvas: React.FC<LivingAtmosphereCanvasProps> = ({
  theme,
  isPlaying,
}) => {
  const animate = useVisualActivity(isPlaying);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number | undefined;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    interface Particle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      baseSize: number;
      alpha: number;
      baseAlpha: number;
      color: string;
      pulseOffset: number;
      length?: number;
    }

    const particles: Particle[] = [];
    const count =
      theme === 'rain'
        ? 130
        : theme === 'sleep'
          ? 90
          : theme === 'forest'
            ? 55
            : theme === 'frequency'
              ? 40
              : 65;

    let shootingStar: {
      x: number;
      y: number;
      length: number;
      speed: number;
      opacity: number;
      active: boolean;
    } = {
      x: 0,
      y: 0,
      length: 120,
      speed: 16,
      opacity: 0,
      active: false,
    };

    const triggerShootingStar = () => {
      if (theme !== 'sleep' || shootingStar.active) return;
      shootingStar = {
        x: Math.random() * width * 0.7,
        y: Math.random() * (height * 0.35),
        length: 80 + Math.random() * 80,
        speed: 12 + Math.random() * 8,
        opacity: 0.9,
        active: true,
      };
    };

    const shootingStarInterval =
      theme === 'sleep' && animate
        ? setInterval(() => {
            if (Math.random() > 0.4) triggerShootingStar();
          }, 6500)
        : undefined;

    const getThemeColors = () => {
      switch (theme) {
        case 'sleep':
          return ['rgba(226, 232, 255, ', 'rgba(196, 181, 253, ', 'rgba(253, 230, 138, '];
        case 'rain':
          return ['rgba(186, 230, 253, ', 'rgba(147, 197, 253, ', 'rgba(224, 242, 254, '];
        case 'frequency':
          return ['rgba(167, 139, 250, ', 'rgba(56, 189, 248, ', 'rgba(236, 72, 153, '];
        case 'forest':
          return ['rgba(110, 231, 183, ', 'rgba(253, 224, 71, ', 'rgba(52, 211, 153, '];
        case 'energy':
          return ['rgba(253, 224, 71, ', 'rgba(251, 146, 60, ', 'rgba(254, 240, 138, '];
        case 'focus':
          return ['rgba(56, 189, 248, ', 'rgba(125, 211, 252, ', 'rgba(148, 163, 184, '];
        default:
          return ['rgba(56, 189, 248, ', 'rgba(192, 132, 252, ', 'rgba(255, 255, 255, '];
      }
    };

    const colors = getThemeColors();

    for (let i = 0; i < count; i++) {
      const color = colors[Math.floor(Math.random() * colors.length)];
      if (theme === 'rain') {
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: -1.2 + Math.random() * 0.4,
          vy: 9 + Math.random() * 11,
          size: 1 + Math.random() * 1.5,
          baseSize: 1,
          length: 14 + Math.random() * 20,
          alpha: 0.15 + Math.random() * 0.4,
          baseAlpha: 0.3,
          color,
          pulseOffset: 0,
        });
      } else {
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 0.35,
          vy: (Math.random() - 0.5) * 0.35 - (theme === 'energy' || theme === 'forest' ? 0.3 : 0),
          size: 1.5 + Math.random() * 3.5,
          baseSize: 1.5 + Math.random() * 3.5,
          alpha: 0.2 + Math.random() * 0.6,
          baseAlpha: 0.2 + Math.random() * 0.6,
          color,
          pulseOffset: Math.random() * Math.PI * 2,
        });
      }
    }

    let time = 0;

    const render = () => {
      time += 0.016;
      ctx.clearRect(0, 0, width, height);

      const naturalWave = Math.sin(time * 0.75);
      const ambientScale = 1 + naturalWave * 0.05;
      const ambientGlow = 1 + naturalWave * 0.12;

      if (theme === 'rain') {
        for (const p of particles) {
          p.x += p.vx;
          p.y += isPlaying ? p.vy : p.vy * 0.3;

          if (p.y > height) {
            p.y = -20;
            p.x = Math.random() * width;
          }
          if (p.x < 0) p.x = width;

          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x + p.vx * 3, p.y + (p.length || 15));
          ctx.strokeStyle = `${p.color}${p.alpha})`;
          ctx.lineWidth = p.size;
          ctx.stroke();
        }
      } else if (theme === 'frequency') {
        const cx = width / 2;
        const cy = height / 2;
        const ringCount = 5;

        for (let r = 0; r < ringCount; r++) {
          const ringProgress = (time * 0.35 + r / ringCount) % 1;
          const radius = ringProgress * Math.min(width, height) * 0.48;
          const ringAlpha = (1 - ringProgress) * 0.35 * (isPlaying ? 1 : 0.4);

          ctx.beginPath();
          ctx.arc(cx, cy, radius, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(56, 189, 248, ${ringAlpha})`;
          ctx.lineWidth = 1.5 + (1 - ringProgress) * 2;
          ctx.stroke();

          if (r % 2 === 0) {
            ctx.beginPath();
            ctx.arc(cx, cy, radius * 0.7, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(167, 139, 250, ${ringAlpha * 0.6})`;
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        }

        for (const p of particles) {
          p.x += p.vx;
          p.y += p.vy;

          if (p.x < 0) p.x = width;
          if (p.x > width) p.x = 0;
          if (p.y < 0) p.y = height;
          if (p.y > height) p.y = 0;

          const currentAlpha = (Math.sin(time * 3 + p.pulseOffset) * 0.3 + 0.7) * p.baseAlpha;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * ambientScale, 0, Math.PI * 2);
          ctx.fillStyle = `${p.color}${currentAlpha * ambientGlow})`;
          ctx.shadowBlur = 12;
          ctx.shadowColor = 'rgba(56, 189, 248, 0.5)';
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      } else {
        if (theme === 'sleep' && shootingStar.active) {
          ctx.beginPath();
          ctx.moveTo(shootingStar.x, shootingStar.y);
          ctx.lineTo(
            shootingStar.x + shootingStar.length * 0.7,
            shootingStar.y + shootingStar.length * 0.5
          );
          ctx.strokeStyle = `rgba(255, 255, 255, ${shootingStar.opacity})`;
          ctx.lineWidth = 2;
          ctx.shadowBlur = 10;
          ctx.shadowColor = '#FFFFFF';
          ctx.stroke();
          ctx.shadowBlur = 0;

          shootingStar.x += shootingStar.speed;
          shootingStar.y += shootingStar.speed * 0.7;
          shootingStar.opacity -= 0.025;

          if (shootingStar.opacity <= 0 || shootingStar.x > width || shootingStar.y > height) {
            shootingStar.active = false;
          }
        }

        if (theme === 'energy') {
          const sunX = width / 2;
          const sunY = -60;
          const beamCount = 6;
          for (let b = 0; b < beamCount; b++) {
            const angle =
              Math.PI / 4 + (b / beamCount) * (Math.PI / 2) + Math.sin(time * 0.2 + b) * 0.05;
            const beamLength = Math.max(width, height) * 1.2;
            const targetX = sunX + Math.cos(angle) * beamLength;
            const targetY = sunY + Math.sin(angle) * beamLength;

            const grad = ctx.createRadialGradient(sunX, sunY, 10, sunX, sunY, beamLength);
            grad.addColorStop(0, 'rgba(253, 224, 71, 0.15)');
            grad.addColorStop(0.5, 'rgba(251, 146, 60, 0.05)');
            grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

            ctx.beginPath();
            ctx.moveTo(sunX, sunY);
            ctx.lineTo(targetX - 80, targetY);
            ctx.lineTo(targetX + 80, targetY);
            ctx.closePath();
            ctx.fillStyle = grad;
            ctx.fill();
          }
        }

        for (const p of particles) {
          if (theme === 'forest') {
            p.x += Math.sin(time + p.pulseOffset) * 0.6;
            p.y -= 0.35 + Math.cos(time + p.pulseOffset) * 0.3;
          } else if (theme === 'energy') {
            p.y -= 0.5;
            p.x += Math.sin(time * 0.8 + p.pulseOffset) * 0.3;
          } else {
            p.x += p.vx;
            p.y += p.vy;
          }

          if (p.x < 0) p.x = width;
          if (p.x > width) p.x = 0;
          if (p.y < 0) p.y = height;
          if (p.y > height) p.y = 0;

          const currentAlpha = (Math.sin(time * 2 + p.pulseOffset) * 0.35 + 0.65) * p.baseAlpha;
          const currentSize =
            p.baseSize *
            ambientScale *
            (theme === 'forest' ? Math.sin(time * 3 + p.pulseOffset) * 0.4 + 1.1 : 1);

          ctx.beginPath();
          ctx.arc(p.x, p.y, Math.max(0.5, currentSize), 0, Math.PI * 2);
          ctx.fillStyle = `${p.color}${currentAlpha * ambientGlow})`;

          if (theme === 'forest' || theme === 'sleep') {
            ctx.shadowBlur = 8;
            ctx.shadowColor = p.color + '0.8)';
          }

          ctx.fill();
          ctx.shadowBlur = 0;
        }

        if (theme === 'focus') {
          ctx.lineWidth = 0.5;
          for (let i = 0; i < particles.length; i++) {
            for (let j = i + 1; j < particles.length; j++) {
              const dx = particles[i].x - particles[j].x;
              const dy = particles[i].y - particles[j].y;
              const dist = Math.sqrt(dx * dx + dy * dy);
              if (dist < 85) {
                const alpha = (1 - dist / 85) * 0.15 * (isPlaying ? 1 : 0.5);
                ctx.beginPath();
                ctx.moveTo(particles[i].x, particles[i].y);
                ctx.lineTo(particles[j].x, particles[j].y);
                ctx.strokeStyle = `rgba(56, 189, 248, ${alpha})`;
                ctx.stroke();
              }
            }
          }
        }
      }

      if (animate) animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animationFrameId !== undefined) cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      clearInterval(shootingStarInterval);
    };
  }, [theme, isPlaying, animate]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 2,
        pointerEvents: 'none',
        width: '100%',
        height: '100%',
      }}
    />
  );
};
