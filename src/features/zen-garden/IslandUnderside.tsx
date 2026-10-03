import { useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import {
  BufferGeometry,
  Color,
  Float32BufferAttribute,
  IcosahedronGeometry,
  InstancedMesh,
  Object3D,
} from 'three';
import type { IslandTheme } from '../../services/gamification/policy';
import { ISLAND_COLORS } from './islandLayout';

// A fixed, small mesh: broad stone shoulders and an uneven tapered underside.
// No textures, physics, per-frame geometry work or extra shadow passes.
function createStoneGeometry() {
  const segments = 40;
  const rings = [
    { radius: 4.61, y: -0.19, variation: 0, offset: 0 },
    { radius: 4.5, y: -0.8, variation: 0.16, offset: 0.012 },
    { radius: 3.8, y: -1.8, variation: 0.38, offset: -0.018 },
    { radius: 2.85, y: -2.9, variation: 0.55, offset: 0.025 },
    { radius: 1.85, y: -4.3, variation: 0.38, offset: -0.035 },
    { radius: 0.48, y: -5.3, variation: 0.1, offset: 0.04 },
  ];
  const vertices = rings.map((ring, row) =>
    Array.from({ length: segments }, (_, column) => {
      const angle = (column / segments) * Math.PI * 2;
      const outline = Math.sin(angle * 7 + 0.7) * 0.65 + Math.cos(angle * 11) * 0.35;
      const radius = ring.radius + outline * ring.variation;
      const y = ring.y + (row === 0 ? 0 : Math.sin(angle * 7 + row * 0.5) * 0.22);
      return [
        Math.cos(angle + ring.offset) * radius + row * 0.045,
        y,
        Math.sin(angle + ring.offset) * radius - row * 0.025,
      ];
    })
  );
  const positions: number[] = [],
    colors: number[] = [];
  const shade = new Color();
  let face = 0;
  const triangle = (a: number[], b: number[], c: number[], row: number) => {
    positions.push(...a, ...b, ...c);
    const variation = Math.sin(++face * 12.9898) * 0.045;
    shade.setHSL(0.09, 0.12, 0.62 - row * 0.018 + variation);
    for (let i = 0; i < 3; i++) colors.push(shade.r, shade.g, shade.b);
  };
  for (let row = 0; row < rings.length - 1; row++) {
    for (let column = 0; column < segments; column++) {
      const next = (column + 1) % segments;
      const a = vertices[row][column],
        b = vertices[row][next];
      const c = vertices[row + 1][column],
        d = vertices[row + 1][next];
      if ((column + row) % 2) {
        triangle(a, b, c, row);
        triangle(b, d, c, row);
      } else {
        triangle(a, b, d, row);
        triangle(a, d, c, row);
      }
    }
  }
  const bottom = vertices[vertices.length - 1];
  for (let column = 0; column < segments; column++)
    triangle(bottom[column], bottom[(column + 1) % segments], [0.3, -5.65, -0.1], 5);
  // Merge chunky cliff outcrops into the same draw call. Their uneven ends
  // break the cone silhouette without adding objects on the garden surface.
  for (let stone = 0; stone < 14; stone++) {
    const angle = (stone / 14) * Math.PI * 2 + 0.1;
    const height = 0.96 + (Math.sin(stone * 2.4) + 1) * 0.14;
    const outcrop = new IcosahedronGeometry(1, 1);
    outcrop.scale(0.67 + (stone % 3) * 0.06, height, 0.72);
    outcrop.rotateY(angle);
    outcrop.rotateZ(Math.sin(stone * 1.7) * 0.11);
    outcrop.translate(Math.cos(angle) * 3.84, -0.38 - height, Math.sin(angle) * 3.84);
    const points = outcrop.getAttribute('position');
    for (let vertex = 0; vertex < points.count; vertex += 3) {
      const point = (index: number) => [points.getX(index), points.getY(index), points.getZ(index)];
      triangle(point(vertex), point(vertex + 1), point(vertex + 2), 1);
    }
    outcrop.dispose();
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

// Sparse vines belong to the underside. The original garden planting stays put.
const vineSites = [0.18, 0.76, 1.42, 2.04, 2.9, 3.62, 4.5, 5.55];
const leaves = vineSites.flatMap((angle, vine) =>
  Array.from({ length: 9 + (vine % 3) }, (_, leaf) => {
    const radius = 4.65 - leaf * 0.04;
    const curl = Math.sin(leaf * 0.9 + vine) * 0.055;
    return {
      x: Math.cos(angle + curl) * radius,
      y: -0.23 - leaf * 0.19,
      z: Math.sin(angle + curl) * radius,
      angle,
      size: leaf === 0 ? 1.2 : 1 - leaf * 0.045,
    };
  })
);

export function IslandUnderside({ theme }: { theme: IslandTheme }) {
  const geometry = useMemo(createStoneGeometry, []);
  const vines = useRef<InstancedMesh>(null);
  const { invalidate } = useThree();
  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => {
    if (!vines.current) return;
    const item = new Object3D(),
      color = new Color();
    leaves.forEach((leaf, index) => {
      item.position.set(leaf.x, leaf.y, leaf.z);
      item.rotation.set(0.2, -leaf.angle, index % 2 ? 0.55 : -0.55);
      item.scale.set(0.09 * leaf.size, 0.14 * leaf.size, 0.045);
      item.updateMatrix();
      vines.current!.setMatrixAt(index, item.matrix);
      vines.current!.setColorAt(index, color.set(ISLAND_COLORS[theme].leaves[index % 2]));
    });
    vines.current.instanceMatrix.needsUpdate = true;
    if (vines.current.instanceColor) vines.current.instanceColor.needsUpdate = true;
    vines.current.computeBoundingSphere();
    invalidate();
  }, [theme, invalidate]);
  return (
    <group name="floating-rocky-underside">
      <mesh geometry={geometry} dispose={null}>
        <meshStandardMaterial
          vertexColors
          roughness={1}
          flatShading
          emissive="#b5a18a"
          emissiveIntensity={0.3}
        />
      </mesh>
      <instancedMesh ref={vines} args={[undefined, undefined, leaves.length]}>
        <sphereGeometry args={[1, 6, 4]} />
        <meshStandardMaterial roughness={1} />
      </instancedMesh>
    </group>
  );
}
