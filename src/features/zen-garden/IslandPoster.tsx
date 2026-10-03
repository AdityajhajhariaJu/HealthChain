import type { IslandTheme } from '../../services/gamification/policy';
import { islandFlowers } from './islandLayout';

// Rendered from CozyIslandScene. Regenerate after art changes with
// npm run build:island-thumbnails. Only the current, fingerprinted image loads.
const posters = import.meta.glob('./previews/*.webp', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

export function IslandPoster({
  level,
  growth,
  theme,
}: {
  level: number;
  growth: number;
  theme: IslandTheme;
}) {
  return (
    <img
      className="island-snapshot"
      src={posters[`./previews/island-${level}-${theme}-${islandFlowers(growth).length}.webp`]}
      alt=""
      draggable={false}
      decoding="async"
      loading="lazy"
    />
  );
}
