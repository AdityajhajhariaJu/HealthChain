import { lazy, Suspense, useCallback, useState } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import type { IslandTheme } from '../../services/gamification/policy';
import { IslandPoster } from './IslandPoster';

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

/** The thumbnail is an image of this same scene, with no dashboard WebGL. */
export function IslandVisual({
  level,
  growth,
  theme,
  moving,
}: {
  level: number;
  growth: number;
  theme: IslandTheme;
  moving: boolean;
}) {
  const [render3D, setRender3D] = useState(supportsIsland3D);
  const fallBackToPoster = useCallback(() => {
    available3D = false;
    setRender3D(false);
  }, []);
  const illustration = <IslandPoster level={level} growth={growth} theme={theme} />;
  if (!render3D) return illustration;
  return (
    <ErrorBoundary onError={fallBackToPoster} fallback={illustration}>
      <Suspense fallback={illustration}>
        <CozyIslandScene
          level={level}
          growth={growth}
          theme={theme}
          moving={moving}
          onSlowRender={fallBackToPoster}
        />
      </Suspense>
    </ErrorBoundary>
  );
}
