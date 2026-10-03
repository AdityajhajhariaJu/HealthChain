import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import { Color, Group, InstancedMesh, Mesh, MeshBasicMaterial, Object3D } from 'three';
import type { IslandTheme } from '../../services/gamification/policy';
import { ISLAND_COLORS, ISLAND_SITES, ISLAND_TREES, islandFlowers } from './islandLayout';

export function IslandTrees({ theme }: { theme: IslandTheme }) {
  const colors = ISLAND_COLORS[theme];
  return (
    <>
      {ISLAND_TREES.map((tree, index) => (
        <group key={index} position={[tree.x, 0.34, tree.z]} scale={tree.scale}>
          <mesh castShadow position={[0, 0.6, 0]}>
            <cylinderGeometry args={[0.09, 0.16, 1.2, 7]} />
            <meshStandardMaterial color="#916344" />
          </mesh>
          {[
            [0, 1.55, 0, 0.78],
            [-0.38, 1.18, 0.16, 0.57],
            [0.37, 1.32, -0.12, 0.54],
          ].map(([x, y, z, scale], i) => (
            <mesh key={i} castShadow position={[x, y, z]} scale={[scale, scale * 1.05, scale]}>
              <icosahedronGeometry args={[1, 1]} />
              <meshStandardMaterial
                color={colors.leaves[(i + index) % 3]}
                flatShading
                roughness={1}
              />
            </mesh>
          ))}
          <mesh position={[0.3, 0.16, 0.22]} scale={[0.5, 0.32, 0.42]}>
            <icosahedronGeometry args={[1, 0]} />
            <meshStandardMaterial
              color={theme === 'blossom' ? '#8ea76b' : colors.leaves[1]}
              flatShading
            />
          </mesh>
        </group>
      ))}
    </>
  );
}

export function IslandPlanting({ growth, theme }: { growth: number; theme: IslandTheme }) {
  const colors = ISLAND_COLORS[theme];
  const flowers = useMemo(() => islandFlowers(growth), [growth]);
  const stems = useRef<InstancedMesh>(null),
    petals = useRef<InstancedMesh>(null),
    centers = useRef<InstancedMesh>(null),
    grass = useRef<InstancedMesh>(null);
  const { invalidate } = useThree();
  useEffect(() => {
    const item = new Object3D(),
      color = new Color();
    flowers.forEach((flower, index) => {
      const height = 0.22 + (index % 3) * 0.05;
      item.position.set(flower.x, 0.34 + height / 2, flower.z);
      item.scale.set(1, height / 0.24, 1);
      item.rotation.set(0, 0, 0);
      item.updateMatrix();
      stems.current?.setMatrixAt(index, item.matrix);
      for (let p = 0; p < 4; p++) {
        const angle = (p * Math.PI) / 2 + index;
        item.position.set(
          flower.x + Math.cos(angle) * 0.062,
          0.34 + height,
          flower.z + Math.sin(angle) * 0.062
        );
        item.scale.set(1, 0.55, 1);
        item.updateMatrix();
        petals.current?.setMatrixAt(index * 4 + p, item.matrix);
        petals.current?.setColorAt(index * 4 + p, color.set(colors.flowers[index % 3]));
      }
      item.position.set(flower.x, 0.36 + height, flower.z);
      item.scale.setScalar(1);
      item.updateMatrix();
      centers.current?.setMatrixAt(index, item.matrix);
    });
    for (let i = 0; i < 90; i++) {
      const angle = i * 2.39996,
        radius = 3.95 + (i % 3) * 0.14;
      item.position.set(Math.cos(angle) * radius, 0.41, Math.sin(angle) * radius);
      item.scale.set(1, 0.6 + (i % 4) * 0.22, 1);
      item.rotation.set(0, angle, 0);
      item.updateMatrix();
      grass.current?.setMatrixAt(i, item.matrix);
      grass.current?.setColorAt(i, color.set(i % 2 ? colors.leaves[1] : colors.meadow));
    }
    for (const mesh of [stems.current, petals.current, centers.current, grass.current]) {
      if (mesh) {
        mesh.instanceMatrix.needsUpdate = true;
        if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
        mesh.computeBoundingSphere();
      }
    }
    invalidate();
  }, [flowers, colors, invalidate]);
  return (
    <>
      <instancedMesh ref={stems} args={[undefined, undefined, flowers.length]}>
        <cylinderGeometry args={[0.018, 0.025, 0.24, 4]} />
        <meshStandardMaterial color="#4e8152" />
      </instancedMesh>
      <instancedMesh ref={petals} args={[undefined, undefined, flowers.length * 4]}>
        <icosahedronGeometry args={[0.072, 0]} />
        <meshStandardMaterial roughness={1} />
      </instancedMesh>
      <instancedMesh ref={centers} args={[undefined, undefined, flowers.length]}>
        <icosahedronGeometry args={[0.036, 0]} />
        <meshStandardMaterial color="#d89839" />
      </instancedMesh>
      <instancedMesh ref={grass} args={[undefined, undefined, 90]}>
        <coneGeometry args={[0.065, 0.2, 3]} />
        <meshStandardMaterial roughness={1} />
      </instancedMesh>
    </>
  );
}

function Butterfly({ index, moving, color }: { index: number; moving: boolean; color: string }) {
  const body = useRef<Group>(null),
    left = useRef<Mesh>(null),
    right = useRef<Mesh>(null);
  useFrame(({ clock }) => {
    const t = moving ? clock.elapsedTime : 0,
      a = t * 0.3 + index * 2.2;
    if (body.current) {
      body.current.position.set(
        Math.cos(a) * (1.7 + index * 0.4),
        1.05 + Math.sin(a * 1.8) * 0.25,
        Math.sin(a) * 2.3
      );
      body.current.rotation.y = -a;
    }
    const flap = moving ? Math.sin(t * 7 + index) * 0.6 : 0.3;
    if (left.current) left.current.rotation.z = flap;
    if (right.current) right.current.rotation.z = -flap;
  });
  return (
    <group ref={body}>
      <mesh ref={left} position={[-0.09, 0, 0]} scale={[0.12, 0.025, 0.09]}>
        <icosahedronGeometry args={[1, 0]} />
        <meshBasicMaterial color={color} />
      </mesh>
      <mesh ref={right} position={[0.09, 0, 0]} scale={[0.12, 0.025, 0.09]}>
        <icosahedronGeometry args={[1, 0]} />
        <meshBasicMaterial color={color} />
      </mesh>
    </group>
  );
}

export function IslandAmbience({
  theme,
  moving,
  level,
}: {
  theme: IslandTheme;
  moving: boolean;
  level: number;
}) {
  const smoke = useRef<InstancedMesh>(null),
    clouds = useRef<Group>(null);
  const item = useMemo(() => new Object3D(), []);
  const [cx, cz] = ISLAND_SITES.cottage;
  useFrame(({ clock }) => {
    const t = moving ? clock.elapsedTime : 0;
    for (let i = 0; i < 5; i++) {
      const life = (t * 0.12 + i / 5) % 1;
      item.position.set(cx - 0.33 + life * 0.38, 2.25 + life * 0.85, cz - 0.3);
      item.scale.setScalar(0.08 + Math.sin(life * Math.PI) * 0.15);
      item.updateMatrix();
      smoke.current?.setMatrixAt(i, item.matrix);
    }
    if (smoke.current) smoke.current.instanceMatrix.needsUpdate = true;
    if (clouds.current) clouds.current.position.x = moving ? Math.sin(t * 0.1) * 0.35 : 0;
  });
  return (
    <>
      <instancedMesh ref={smoke} args={[undefined, undefined, 5]} frustumCulled={false}>
        <icosahedronGeometry args={[1, 1]} />
        <meshBasicMaterial color="#fff4e2" transparent opacity={0.5} depthWrite={false} />
      </instancedMesh>
      <group ref={clouds}>
        {[
          [-4.5, 2.9, -1.5],
          [2.6, 3.2, -4.1],
        ].map(([x, y, z], index) => (
          <group key={index} position={[x, y, z]} scale={0.75}>
            {[-0.4, 0, 0.4].map((offset, i) => (
              <mesh
                key={i}
                position={[offset, i === 1 ? 0.12 : 0, 0]}
                scale={[0.55, i === 1 ? 0.3 : 0.22, 0.28]}
              >
                <icosahedronGeometry args={[1, 1]} />
                <meshBasicMaterial color="#fff9ee" transparent opacity={0.76} depthWrite={false} />
              </mesh>
            ))}
          </group>
        ))}
      </group>
      {Array.from({ length: level >= 3 ? 3 : 2 }, (_, i) => (
        <Butterfly key={i} index={i} moving={moving} color={ISLAND_COLORS[theme].flowers[i]} />
      ))}
      {theme === 'dusk' && <Fireflies moving={moving} />}
    </>
  );
}

function Fireflies({ moving }: { moving: boolean }) {
  const lights = useRef<InstancedMesh>(null);
  const item = useMemo(() => new Object3D(), []);
  useFrame(({ clock }) => {
    const t = moving ? clock.elapsedTime : 0;
    for (let i = 0; i < 9; i++) {
      const a = i * 2.39996;
      item.position.set(
        Math.cos(a) * 3.1 + Math.sin(t * 0.45 + i) * 0.15,
        0.8 + Math.sin(t * 0.7 + i) * 0.2,
        Math.sin(a) * 3.1
      );
      item.scale.setScalar(0.023 + (Math.sin(t * 1.3 + i) + 1) * 0.009);
      item.updateMatrix();
      lights.current?.setMatrixAt(i, item.matrix);
    }
    if (lights.current) lights.current.instanceMatrix.needsUpdate = true;
  });
  return (
    <instancedMesh ref={lights} args={[undefined, undefined, 9]} frustumCulled={false}>
      <icosahedronGeometry args={[1, 0]} />
      <meshBasicMaterial color="#fff0a8" />
    </instancedMesh>
  );
}

function Ripple({ index, moving }: { index: number; moving: boolean }) {
  const ref = useRef<Mesh>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const life = moving ? (clock.elapsedTime * 0.2 + index / 3) % 1 : (index + 1) / 4;
    ref.current.scale.setScalar(0.2 + life * 0.65);
    (ref.current.material as MeshBasicMaterial).opacity = (1 - life) * 0.45;
  });
  return (
    <mesh ref={ref} position={[0.3, 0.07, 0.05]} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[0.7, 0.725, 32]} />
      <meshBasicMaterial color="#e4fff5" transparent depthWrite={false} />
    </mesh>
  );
}

export function IslandPond({ theme, moving }: { theme: IslandTheme; moving: boolean }) {
  const duck = useRef<Group>(null);
  useFrame(({ clock }) => {
    if (!duck.current) return;
    const t = moving ? clock.elapsedTime * 0.18 : 0;
    duck.current.position.set(0.42 + Math.cos(t) * 0.15, 0.12, 0.3 + Math.sin(t) * 0.16);
    duck.current.rotation.y = -t + 0.4;
  });
  const [x, z] = ISLAND_SITES.pond;
  return (
    <group position={[x, 0.34, z]}>
      <mesh receiveShadow scale={[1, 1, 0.78]}>
        <cylinderGeometry args={[1.24, 1.3, 0.05, 40]} />
        <meshStandardMaterial color="#cbb38b" />
      </mesh>
      <mesh position={[0, 0.025, 0]} scale={[1, 1, 0.78]}>
        <cylinderGeometry args={[1.13, 1.13, 0.035, 40]} />
        <meshStandardMaterial
          color={ISLAND_COLORS[theme].water}
          roughness={0.25}
          metalness={0.12}
        />
      </mesh>
      {[0, 1, 2].map((i) => (
        <Ripple key={i} index={i} moving={moving} />
      ))}
      {[0, 1, 2, 3, 4, 5, 6].map((i) => {
        const a = i * 0.63;
        return (
          <mesh
            key={i}
            castShadow
            position={[Math.cos(a) * 1.19, 0.08, Math.sin(a) * 0.91]}
            scale={[0.2, 0.1 + (i % 2) * 0.035, 0.14]}
          >
            <icosahedronGeometry args={[1, 0]} />
            <meshStandardMaterial color={i % 2 ? '#d9d0b1' : '#b7ad93'} flatShading />
          </mesh>
        );
      })}
      {[
        [0.7, -0.32],
        [-0.3, 0.44],
      ].map(([px, pz], i) => (
        <group key={i} position={[px, 0.065, pz]}>
          <mesh rotation={[-Math.PI / 2, 0, i]}>
            <circleGeometry args={[0.18, 16, 0, Math.PI * 1.82]} />
            <meshStandardMaterial color="#629669" side={2} />
          </mesh>
          <mesh position={[0.02, 0.04, 0]} scale={[1, 0.45, 1]}>
            <icosahedronGeometry args={[0.075, 0]} />
            <meshStandardMaterial color="#f6c3bf" />
          </mesh>
        </group>
      ))}
      <group ref={duck}>
        <mesh scale={[0.14, 0.1, 0.21]}>
          <icosahedronGeometry args={[1, 1]} />
          <meshStandardMaterial color="#fff1ce" />
        </mesh>
        <mesh position={[0, 0.12, 0.12]}>
          <icosahedronGeometry args={[0.09, 1]} />
          <meshStandardMaterial color="#fff1ce" />
        </mesh>
        <mesh position={[0, 0.11, 0.22]} scale={[1, 0.45, 1.5]}>
          <icosahedronGeometry args={[0.045, 0]} />
          <meshStandardMaterial color="#e9a344" />
        </mesh>
      </group>
      <group position={[-0.5, 0.15, 0]} rotation={[0, 0.3, 0]}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[0.45, 0.12, 1.95]} />
          <meshStandardMaterial color="#c09561" />
        </mesh>
        {[-0.25, 0.25].map((bx) => (
          <group key={bx}>
            <mesh castShadow position={[bx, 0.23, 0]}>
              <boxGeometry args={[0.05, 0.065, 1.95]} />
              <meshStandardMaterial color="#9b704a" />
            </mesh>
            {[-0.78, 0.78].map((bz) => (
              <mesh key={bz} position={[bx, 0.12, bz]}>
                <boxGeometry args={[0.05, 0.28, 0.05]} />
                <meshStandardMaterial color="#9b704a" />
              </mesh>
            ))}
          </group>
        ))}
        {[-0.7, -0.35, 0, 0.35, 0.7].map((bz) => (
          <mesh key={bz} position={[0, 0.065, bz]}>
            <boxGeometry args={[0.43, 0.01, 0.025]} />
            <meshStandardMaterial color="#9b704a" />
          </mesh>
        ))}
      </group>
    </group>
  );
}
