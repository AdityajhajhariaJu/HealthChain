import { useEffect, useRef, useState } from 'react';
import { IslandArtwork } from './IslandArtwork';
import { useGarden } from './useGarden';
import { observeActivity } from '../../services/gamification/telemetry';
import './ZenGarden.css';
export function IslandPreview({ onOpen, paused }: { onOpen: () => void; paused: boolean }) {
  const garden = useGarden(),
    ref = useRef<HTMLButtonElement>(null);
  const [visible, setVisible] = useState(false);
  const [awake, setAwake] = useState(!document.hidden);
  useEffect(() => {
    const update = () => setAwake(!document.hidden);
    document.addEventListener('visibilitychange', update);
    return () => document.removeEventListener('visibilitychange', update);
  }, []);
  useEffect(() => {
    if (!ref.current || typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting));
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);
  return (
    <button
      ref={ref}
      type="button"
      className="zen-preview"
      aria-label="Open Zen Garden"
      onClick={(event) => {
        event.currentTarget.focus();
        observeActivity('screen:zen-garden', 'completed');
        onOpen();
      }}
      data-animate={visible && awake && !paused}
      data-level={garden.stage.level}
    >
      <span className="zen-preview-heading">
        <span>YOUR LITTLE SANCTUARY</span>
        <strong>Zen Garden</strong>
      </span>
      <IslandArtwork
        compact
        level={garden.stage.level}
        growth={garden.growth}
        theme={garden.theme}
      />
      <span className="zen-preview-footer">
        <strong>{garden.stage.name}</strong>
        <span>
          {garden.todayGrowth ? `${garden.todayGrowth}/6 growth today` : 'A quiet place to begin'}{' '}
          <span aria-hidden="true">↗</span>
        </span>
      </span>
    </button>
  );
}
