import { useRef, useState } from 'react';
import { setIslandTheme } from '../../services/GamificationHub';
import { ISLAND_THEMES } from '../../services/gamification/policy';
import { IslandVisual } from './IslandVisual';
import { useGarden } from './useGarden';
import { useIslandMotion } from './useIslandMotion';
import './ZenGarden.css';

// The surrounding view owns tending, the guide, vitality and streaks.
export function ZenGarden() {
  const garden = useGarden();
  const sceneRef = useRef<HTMLDivElement>(null);
  const moving = useIslandMotion(sceneRef);
  const [status, setStatus] = useState('');
  return (
    <div className="zen-island">
      <div className="zen-scene" ref={sceneRef} data-theme={garden.theme} data-animate={moving}>
        <div
          className="zen-canvas"
          role="img"
          aria-label={`Your island: ${garden.stage.name}, ${garden.growth} growth, ${garden.participationDays} participation days`}
        >
          <IslandVisual
            level={garden.stage.level}
            growth={garden.growth}
            theme={garden.theme}
            moving={moving}
          />
        </div>
      </div>
      <div className="zen-themes" role="group" aria-label="Island atmosphere">
        {ISLAND_THEMES.map((theme) => (
          <button
            key={theme.id}
            type="button"
            aria-pressed={garden.theme === theme.id}
            onClick={() => {
              setStatus(
                setIslandTheme(theme.id) ? '' : 'Your atmosphere could not be saved. Try again.'
              );
            }}
          >
            <span style={{ background: theme.sky }} />
            {theme.label}
          </button>
        ))}
      </div>
      {status && (
        <p role="status" className="zen-island-status">
          {status}
        </p>
      )}
    </div>
  );
}
