import React, { useRef } from 'react';
import { ChevronRight } from 'lucide-react';

interface SwimlaneCarouselProps {
  title: string;
  subtitle?: string;
  onSeeAll?: () => void;
  children: React.ReactNode;
}

export function SwimlaneCarousel({ title, subtitle, onSeeAll, children }: SwimlaneCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', padding: '8px 0', width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', padding: '0 16px', marginBottom: '12px' }}>
        <div>
          {subtitle && <p style={{ color: '#64748b', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, margin: '0 0 2px' }}>{subtitle}</p>}
          <h2 style={{ color: '#0F172A', fontSize: '20px', fontWeight: 'bold', margin: 0 }}>{title}</h2>
        </div>
        {onSeeAll && (
          <button 
            onClick={onSeeAll}
            style={{ color: '#64748b', background: 'transparent', border: 'none', display: 'flex', alignItems: 'center', fontSize: '14px', fontWeight: 500, cursor: 'pointer' }}
          >
            See All <ChevronRight size={16} />
          </button>
        )}
      </div>

      <div 
        ref={scrollRef}
        style={{
          display: 'flex',
          gap: '16px',
          padding: '0 16px 16px',
          overflowX: 'auto',
          scrollSnapType: 'x mandatory',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none'
        }}
      >
        {React.Children.map(children, (child) => (
          <div style={{ scrollSnapAlign: 'start', flexShrink: 0 }}>
            {child}
          </div>
        ))}
      </div>
    </div>
  );
}