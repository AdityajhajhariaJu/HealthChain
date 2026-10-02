export const ISLAND_TREES = [
  { x: -2.8, z: -1.8, scale: 0.9 },
  { x: -0.4, z: -3.0, scale: 1.05 },
  { x: 2.5, z: -2.0, scale: 0.8 },
  { x: 3.2, z: 0.4, scale: 0.72 },
  { x: -3.0, z: 1.4, scale: 0.74 },
  { x: -1.6, z: 2.9, scale: 0.67 },
  { x: 0.5, z: 3.1, scale: 0.7 },
  { x: 2.8, z: 2.0, scale: 0.65 },
];
export function islandFlowers(growth: number) {
  return Array.from({ length: 5 + Math.min(25, Math.floor(growth / 2)) }, (_, index) => {
    const angle = index * 2.39996,
      radius = 1.1 + (index % 5) * 0.43;
    return { x: Math.cos(angle) * radius, z: Math.sin(angle) * radius };
  });
}
