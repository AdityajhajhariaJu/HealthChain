import { useRef } from 'react';
import { IslandArtwork } from './IslandArtwork';
import { useGarden } from './useGarden';
import { observeActivity } from '../../services/gamification/telemetry';
import { useIslandMotion } from './useIslandMotion';
import './ZenGarden.css';
export function IslandPreview({ onOpen, paused }: { onOpen: () => void; paused: boolean }) {
  const garden = useGarden(),
    ref = useRef<HTMLButtonElement>(null);
  const moving = useIslandMotion(ref, paused);
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
      data-animate={moving}
      data-level={garden.stage.level}
    >
      <IslandArtwork
        compact
        level={garden.stage.level}
        growth={garden.growth}
        theme={garden.theme}
      />
      <span className="zen-preview-footer">
        <span className="zen-preview-pill">
          <span aria-hidden="true">🌸</span> Zen Sanctuary
        </span>
        <span className="zen-preview-subtitle">Grow your own garden</span>
      </span>
    </button>
  );
}
