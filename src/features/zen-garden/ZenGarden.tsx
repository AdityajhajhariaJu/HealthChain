import { lazy, Suspense, useCallback, useRef, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { ErrorBoundary } from 'react-error-boundary';
import { setIslandTheme } from '../../services/GamificationHub';
import { ISLAND_THEMES } from '../../services/gamification/policy';
import { IslandArtwork } from './IslandArtwork';
import { useGarden } from './useGarden';
import { useIslandMotion } from './useIslandMotion';
import './ZenGarden.css';

const CozyIslandScene = lazy(() => import('./CozyIslandScene'));
let available3D: boolean | undefined;
function supportsIsland3D() {
  if (available3D !== undefined) return available3D;
  try {
    const context = document.createElement('canvas').getContext('webgl2');
    available3D = !!context;
    context?.getExtension('WEBGL_lose_context')?.loseContext();
  } catch {
    available3D = false;
  }
  return available3D;
}

// Only the garden illustration lives here. The original garden view owns its
// existing Water Garden, guide, soundscapes, vitality and streak presentation.
export function ZenGarden() {
  const garden = useGarden();
  const sceneRef = useRef<HTMLDivElement>(null);
  const moving = useIslandMotion(sceneRef);
  const [angle, setAngle] = useState(0),
    [status, setStatus] = useState(''),
    [render3D, setRender3D] = useState(supportsIsland3D);
  const useIllustration = useCallback(() => {
    available3D = false;
    setRender3D(false);
  }, []);
  const illustration = (
    <IslandArtwork level={garden.stage.level} growth={garden.growth} theme={garden.theme} />
  );
  return (
    <div className="zen-island">
      <div className="zen-scene" ref={sceneRef} data-theme={garden.theme} data-animate={moving}>
        <div
          className="zen-canvas"
          role="img"
          aria-label={`Your island: ${garden.stage.name}, ${garden.growth} growth, ${garden.participationDays} participation days`}
        >
          <ErrorBoundary onError={useIllustration} fallback={illustration}>
            {render3D ? (
              <Suspense fallback={illustration}>
                <CozyIslandScene
                  level={garden.stage.level}
                  growth={garden.growth}
                  theme={garden.theme}
                  angle={angle}
                  moving={moving}
                  onSlowRender={useIllustration}
                />
              </Suspense>
            ) : (
              illustration
            )}
          </ErrorBoundary>
        </div>
        {render3D && (
          <div className="zen-camera" aria-label="Island view controls">
            <button
              type="button"
              onClick={() => setAngle((value) => value - 0.4)}
              aria-label="Turn island left"
            >
              ↶
            </button>
            <button type="button" onClick={() => setAngle(0)} aria-label="Reset island view">
              <RotateCcw size={15} />
            </button>
            <button
              type="button"
              onClick={() => setAngle((value) => value + 0.4)}
              aria-label="Turn island right"
            >
              ↷
            </button>
          </div>
        )}
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
