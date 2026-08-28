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
    <div className="flex flex-col py-2 w-full">
      <div className="flex justify-between items-end px-4 mb-3">
        <div>
          {subtitle && <p className="text-gray-400 text-xs uppercase tracking-wider font-semibold mb-0.5">{subtitle}</p>}
          <h2 className="text-white text-xl font-bold">{title}</h2>
        </div>
        {onSeeAll && (
          <button 
            onClick={onSeeAll}
            className="text-gray-400 hover:text-white flex items-center text-sm font-medium transition-colors"
          >
            See All <ChevronRight size={16} />
          </button>
        )}
      </div>

      <div 
        ref={scrollRef}
        className="flex gap-4 px-4 pb-4 overflow-x-auto snap-x snap-mandatory hide-scrollbar"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {React.Children.map(children, (child) => (
          <div className="snap-start flex-shrink-0">
            {child}
          </div>
        ))}
      </div>
      <style>{`
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}