import type { IslandTheme } from '../../services/gamification/policy';

// Keep the foreground open so the pond and new structures remain visible.
export const ISLAND_TREES = [
  { x: -2.9, z: -2.0, scale: 0.94 },
  { x: -0.5, z: -3.4, scale: 1.02 },
  { x: 2.8, z: -2.4, scale: 0.83 },
  { x: 3.65, z: -0.1, scale: 0.65 },
  { x: -3.7, z: 0.6, scale: 0.64 },
  { x: -2.6, z: 2.65, scale: 0.56 },
  { x: -0.65, z: 3.8, scale: 0.43 },
  { x: 3.65, z: 1.7, scale: 0.42 },
];
export const ISLAND_SITES = {
  cottage: [-1.4, -0.8],
  pond: [1.65, 1.45],
  greenhouse: [1.5, -1.6],
  pavilion: [-0.65, 2.05],
  bed: [-2.45, 1.15],
  windmill: [-2.75, -0.05],
} as const;
const flowerPatches = [
  [-3.3, -0.7],
  [-2.75, 1.95],
  [-1.7, 2.95],
  [0.4, 3.55],
  [3.3, -0.9],
  [2.55, -3.0],
  [-1.7, -3.35],
];
export function islandFlowers(growth: number) {
  return Array.from({ length: 21 + Math.min(21, Math.floor(growth / 5)) }, (_, index) => {
    const patch = flowerPatches[index % flowerPatches.length];
    const angle = index * 2.39996,
      radius = 0.12 + Math.floor(index / 7) * 0.065;
    return { x: patch[0] + Math.cos(angle) * radius, z: patch[1] + Math.sin(angle) * radius };
  });
}

// Art direction is shared by the lightweight thumbnail and the 3D scene.
// Atmosphere changes decoration only; progression stays in the hub policy.
export const ISLAND_COLORS: Record<
  IslandTheme,
  {
    sky: string;
    horizon: string;
    grass: string;
    meadow: string;
    leaves: [string, string, string];
    flowers: [string, string, string];
    roof: string;
    roofShade: string;
    water: string;
    rock: string;
  }
> = {
  meadow: {
    sky: '#a6dce7',
    horizon: '#fff3d8',
    grass: '#82b95f',
    meadow: '#a5cc72',
    leaves: ['#398d68', '#65ae73', '#9bca79'],
    flowers: ['#ed947f', '#eac45c', '#f8eac8'],
    roof: '#db7655',
    roofShade: '#ad503d',
    water: '#4dbbb9',
    rock: '#a78365',
  },
  blossom: {
    sky: '#e8cde5',
    horizon: '#fff0d9',
    grass: '#93b96a',
    meadow: '#b8ce7c',
    leaves: ['#c77f9e', '#e4a0b3', '#f0c0c9'],
    flowers: ['#de849a', '#f5c565', '#fff0d7'],
    roof: '#b76b7f',
    roofShade: '#8e4c6c',
    water: '#67c1c1',
    rock: '#aa846f',
  },
  dusk: {
    sky: '#c3bbde',
    horizon: '#ffe2b4',
    grass: '#88aa60',
    meadow: '#b9c778',
    leaves: ['#4e8663', '#79a16a', '#b1c17a'],
    flowers: ['#edab79', '#f1ce75', '#ffecc6'],
    roof: '#c17a59',
    roofShade: '#935740',
    water: '#66b8ad',
    rock: '#987262',
  },
};
