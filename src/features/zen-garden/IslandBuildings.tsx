import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import { Group } from 'three';
import type { IslandTheme } from '../../services/gamification/policy';
import { ISLAND_COLORS, ISLAND_SITES } from './islandLayout';

export function IslandCottage({ theme }: { theme: IslandTheme }) {
  const colors = ISLAND_COLORS[theme],
    [x, z] = ISLAND_SITES.cottage;
  return (
    <group position={[x, 0.35, z]}>
      <mesh castShadow receiveShadow position={[0, 0.58, 0]}>
        <boxGeometry args={[1.45, 1.15, 1.25]} />
        <meshStandardMaterial color="#fff0cc" />
      </mesh>
      {[-0.635, 0.635].map((side) => (
        <mesh key={side} position={[0, 1.15, side]}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              args={[new Float32Array([-0.725, 0, 0, 0.725, 0, 0, 0, 0.51, 0]), 3]}
            />
          </bufferGeometry>
          <meshBasicMaterial color="#ffe5ad" side={2} />
        </mesh>
      ))}
      {[-1, 1].map((side) => (
        <mesh
          key={side}
          castShadow
          position={[side * 0.43, 1.39, 0]}
          rotation={[0, 0, -side * 0.53]}
        >
          <boxGeometry args={[1.05, 0.11, 1.62]} />
          <meshStandardMaterial color={side < 0 ? colors.roofShade : colors.roof} roughness={1} />
        </mesh>
      ))}
      <mesh position={[0, 1.67, 0]}>
        <boxGeometry args={[0.1, 0.08, 1.65]} />
        <meshStandardMaterial color={colors.roofShade} />
      </mesh>
      <mesh castShadow position={[-0.33, 1.73, -0.3]}>
        <boxGeometry args={[0.23, 0.83, 0.24]} />
        <meshStandardMaterial color="#ba8970" />
      </mesh>
      <mesh position={[-0.33, 2.15, -0.3]}>
        <boxGeometry args={[0.3, 0.1, 0.3]} />
        <meshStandardMaterial color="#945f4d" />
      </mesh>
      <mesh position={[0.3, 0.35, 0.641]}>
        <boxGeometry args={[0.3, 0.71, 0.04]} />
        <meshStandardMaterial color="#709583" />
      </mesh>
      <mesh position={[0.39, 0.35, 0.67]}>
        <sphereGeometry args={[0.025, 6, 4]} />
        <meshBasicMaterial color="#ecc470" />
      </mesh>
      <group position={[-0.33, 0.73, 0.66]}>
        <mesh>
          <boxGeometry args={[0.4, 0.37, 0.035]} />
          <meshStandardMaterial
            color="#ffda84"
            emissive="#ffc75c"
            emissiveIntensity={theme === 'dusk' ? 0.7 : 0.22}
          />
        </mesh>
        {[-0.23, 0.23].map((px) => (
          <mesh key={px} position={[px, 0, 0.04]}>
            <boxGeometry args={[0.07, 0.41, 0.04]} />
            <meshStandardMaterial color="#79a28b" />
          </mesh>
        ))}
        <mesh position={[0, 0, 0.035]}>
          <boxGeometry args={[0.025, 0.37, 0.02]} />
          <meshStandardMaterial color="#fff1ce" />
        </mesh>
        <mesh position={[0, 0, 0.035]}>
          <boxGeometry args={[0.4, 0.025, 0.02]} />
          <meshStandardMaterial color="#fff1ce" />
        </mesh>
        <mesh position={[0, -0.27, 0.05]}>
          <boxGeometry args={[0.54, 0.14, 0.18]} />
          <meshStandardMaterial color="#b07952" />
        </mesh>
        {[-0.17, 0, 0.17].map((fx, i) => (
          <mesh key={fx} position={[fx, -0.17, 0.08]} scale={[1, 0.7, 1]}>
            <icosahedronGeometry args={[0.1, 0]} />
            <meshStandardMaterial color={colors.flowers[i]} />
          </mesh>
        ))}
      </group>
      <mesh position={[0.74, 0.73, 0]}>
        <boxGeometry args={[0.04, 0.39, 0.39]} />
        <meshStandardMaterial
          color="#ffdc87"
          emissive="#ffc75c"
          emissiveIntensity={theme === 'dusk' ? 0.6 : 0.15}
        />
      </mesh>
      <mesh receiveShadow position={[0.12, 0.03, 0.9]}>
        <boxGeometry args={[1.5, 0.12, 0.5]} />
        <meshStandardMaterial color="#d7b385" />
      </mesh>
      <mesh castShadow position={[0.3, 0.94, 0.92]} rotation={[0.16, 0, 0]}>
        <boxGeometry args={[0.74, 0.05, 0.59]} />
        <meshStandardMaterial color={colors.roof} />
      </mesh>
      {[0, 0.6].map((px) => (
        <mesh key={px} castShadow position={[px, 0.5, 1.13]}>
          <boxGeometry args={[0.04, 0.85, 0.04]} />
          <meshStandardMaterial color="#b1916a" />
        </mesh>
      ))}
      <mesh receiveShadow position={[0.3, -0.005, 1.28]}>
        <boxGeometry args={[0.6, 0.09, 0.32]} />
        <meshStandardMaterial color="#c6a478" />
      </mesh>
      <group position={[1.08, 0.22, 0.52]}>
        <mesh>
          <cylinderGeometry args={[0.15, 0.11, 0.24, 8]} />
          <meshStandardMaterial color="#cc8764" />
        </mesh>
        <mesh position={[0, 0.17, 0]} scale={[1, 0.7, 1]}>
          <icosahedronGeometry args={[0.22, 0]} />
          <meshStandardMaterial color={colors.leaves[1]} />
        </mesh>
      </group>
    </group>
  );
}

function Lantern({ position, theme }: { position: [number, number, number]; theme: IslandTheme }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.34, 0]}>
        <cylinderGeometry args={[0.025, 0.04, 0.68, 6]} />
        <meshStandardMaterial color="#896345" />
      </mesh>
      <mesh position={[0, 0.77, 0]}>
        <boxGeometry args={[0.16, 0.22, 0.16]} />
        <meshStandardMaterial
          color="#ffdfa0"
          emissive="#ffc368"
          emissiveIntensity={theme === 'dusk' ? 1.3 : 0.3}
        />
      </mesh>
      <mesh position={[0, 0.91, 0]}>
        <coneGeometry args={[0.17, 0.13, 4]} />
        <meshStandardMaterial color="#795e4d" />
      </mesh>
      {theme === 'dusk' && (
        <mesh position={[0, 0.006, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.32, 24]} />
          <meshBasicMaterial color="#ffe5a1" transparent opacity={0.18} depthWrite={false} />
        </mesh>
      )}
    </group>
  );
}

export function IslandStructures({
  level,
  theme,
  moving,
}: {
  level: number;
  theme: IslandTheme;
  moving: boolean;
}) {
  const colors = ISLAND_COLORS[theme],
    fan = useRef<Group>(null);
  useFrame(({ clock }) => {
    if (fan.current) fan.current.rotation.z = moving ? clock.elapsedTime * 0.4 : 0.3;
  });
  return (
    <>
      <Lantern position={[-0.38, 0.35, 0.53]} theme={theme} />
      <group position={[-0.8, 0.36, -2.15]}>
        <mesh position={[0, 0.37, 0]}>
          <cylinderGeometry args={[0.028, 0.05, 0.75, 5]} />
          <meshStandardMaterial color="#ab7d52" />
        </mesh>
        <mesh position={[0, 0.87, 0]}>
          <boxGeometry args={[0.28, 0.24, 0.25]} />
          <meshStandardMaterial color="#ffdf9b" />
        </mesh>
        <mesh position={[0, 1.08, 0]} rotation={[0, Math.PI / 4, 0]}>
          <coneGeometry args={[0.24, 0.2, 4]} />
          <meshStandardMaterial color={colors.roof} />
        </mesh>
        <mesh position={[0, 0.87, 0.13]}>
          <circleGeometry args={[0.045, 12]} />
          <meshBasicMaterial color="#765c43" />
        </mesh>
      </group>
      {level >= 2 && (
        <group position={[ISLAND_SITES.bed[0], 0.4, ISLAND_SITES.bed[1]]} rotation={[0, -0.15, 0]}>
          <mesh receiveShadow>
            <boxGeometry args={[1.22, 0.14, 0.75]} />
            <meshStandardMaterial color="#aa7952" />
          </mesh>
          <mesh position={[0, 0.08, 0]}>
            <boxGeometry args={[1.07, 0.02, 0.59]} />
            <meshStandardMaterial color="#76583f" />
          </mesh>
          {[-0.36, 0, 0.36].flatMap((x) =>
            [-0.2, 0.2].map((z, i) => (
              <group key={`${x}:${z}`} position={[x, 0.14, z]}>
                <mesh scale={[1, 0.7, 1]}>
                  <icosahedronGeometry args={[0.16, 0]} />
                  <meshStandardMaterial color={i ? '#7cab59' : colors.flowers[0]} />
                </mesh>
                <mesh position={[0, 0.08, 0]}>
                  <icosahedronGeometry args={[0.07, 0]} />
                  <meshStandardMaterial color={i ? '#b9d57b' : colors.flowers[1]} />
                </mesh>
              </group>
            ))
          )}
        </group>
      )}
      {level >= 3 && (
        <group position={[2.55, 0.36, -0.55]} rotation={[0, 0.3, 0]}>
          <mesh castShadow position={[0, 0.3, 0]}>
            <boxGeometry args={[0.9, 0.09, 0.36]} />
            <meshStandardMaterial color="#c39664" />
          </mesh>
          <mesh castShadow position={[0, 0.55, -0.16]}>
            <boxGeometry args={[0.9, 0.3, 0.07]} />
            <meshStandardMaterial color="#c39664" />
          </mesh>
          {[-0.31, 0.31].map((x) => (
            <mesh key={x} position={[x, 0.13, 0]}>
              <boxGeometry args={[0.06, 0.3, 0.28]} />
              <meshStandardMaterial color="#91694b" />
            </mesh>
          ))}
        </group>
      )}
      {level >= 4 && (
        <>
          <group position={[ISLAND_SITES.greenhouse[0], 0.36, ISLAND_SITES.greenhouse[1]]}>
            <mesh receiveShadow position={[0, 0.06, 0]}>
              <boxGeometry args={[1.25, 0.12, 1.15]} />
              <meshStandardMaterial color="#ccbb91" />
            </mesh>
            {[-0.34, 0.34].map((x) => (
              <mesh key={x} position={[x, 0.32, 0]} scale={[0.22, 0.3, 0.34]}>
                <icosahedronGeometry args={[1, 0]} />
                <meshStandardMaterial color="#5a9e63" />
              </mesh>
            ))}
            <mesh position={[0, 0.52, 0]}>
              <boxGeometry args={[1.12, 0.88, 1.03]} />
              <meshStandardMaterial
                color="#b9e4cd"
                transparent
                opacity={0.48}
                roughness={0.25}
                depthWrite={false}
              />
            </mesh>
            {[-0.56, 0, 0.56].flatMap((x) =>
              [-0.53, 0.53].map((z) => (
                <mesh key={`${x}:${z}`} position={[x, 0.53, z]}>
                  <boxGeometry args={[0.035, 0.92, 0.035]} />
                  <meshStandardMaterial color="#f5ebc9" />
                </mesh>
              ))
            )}
            {[-1, 1].map((side) => (
              <mesh
                key={side}
                castShadow
                position={[side * 0.28, 1.13, 0]}
                rotation={[0, 0, -side * 0.55]}
              >
                <boxGeometry args={[0.7, 0.04, 1.17]} />
                <meshStandardMaterial color="#d4edc7" transparent opacity={0.75} />
              </mesh>
            ))}
            <mesh position={[0, 1.3, 0]}>
              <boxGeometry args={[0.045, 0.045, 1.18]} />
              <meshStandardMaterial color="#f5ebc9" />
            </mesh>
          </group>
          <group position={[ISLAND_SITES.pavilion[0], 0.36, ISLAND_SITES.pavilion[1]]}>
            <mesh receiveShadow>
              <cylinderGeometry args={[0.66, 0.72, 0.12, 8]} />
              <meshStandardMaterial color="#dcb98b" />
            </mesh>
            {[-0.38, 0.38].flatMap((x) =>
              [-0.38, 0.38].map((z) => (
                <mesh key={`${x}:${z}`} castShadow position={[x, 0.6, z]}>
                  <cylinderGeometry args={[0.04, 0.04, 1.15, 6]} />
                  <meshStandardMaterial color="#b48b5c" />
                </mesh>
              ))
            )}
            <mesh castShadow position={[0, 1.24, 0]}>
              <coneGeometry args={[0.84, 0.42, 8]} />
              <meshStandardMaterial color={colors.roof} flatShading />
            </mesh>
            <mesh position={[0, 0.39, 0]}>
              <cylinderGeometry args={[0.24, 0.24, 0.05, 12]} />
              <meshStandardMaterial color="#fff0c9" />
            </mesh>
            <mesh position={[0, 0.22, 0]}>
              <cylinderGeometry args={[0.03, 0.06, 0.3, 6]} />
              <meshStandardMaterial color="#b48b5c" />
            </mesh>
          </group>
          {[
            [-2, 2.45],
            [0.55, 2.8],
            [2.75, 1.1],
          ].map(([x, z], i) => (
            <Lantern key={i} position={[x, 0.35, z]} theme={theme} />
          ))}
        </>
      )}
      {level >= 5 && (
        <>
          {[
            [-0.1, -2.75],
            [0.85, -3.15],
            [1.75, -2.75],
          ].map(([x, z], i) => (
            <group key={i} position={[x, 0.34, z]}>
              <mesh castShadow position={[0, 0.44, 0]}>
                <cylinderGeometry args={[0.06, 0.1, 0.9, 6]} />
                <meshStandardMaterial color="#986a46" />
              </mesh>
              <mesh castShadow position={[0, 1.0, 0]} scale={[1, 1.1, 1]}>
                <icosahedronGeometry args={[0.46, 1]} />
                <meshStandardMaterial color={colors.leaves[1]} flatShading />
              </mesh>
              {[
                [-0.28, 0.98, 0.27],
                [0.22, 1.13, 0.3],
                [0.12, 0.81, -0.28],
              ].map((p, n) => (
                <mesh key={n} position={p as [number, number, number]}>
                  <icosahedronGeometry args={[0.08, 0]} />
                  <meshStandardMaterial color="#ed9e50" />
                </mesh>
              ))}
            </group>
          ))}
          <group position={[ISLAND_SITES.windmill[0], 0.35, ISLAND_SITES.windmill[1]]}>
            <mesh castShadow position={[0, 0.66, 0]}>
              <cylinderGeometry args={[0.23, 0.38, 1.32, 8]} />
              <meshStandardMaterial color="#fff0cd" />
            </mesh>
            <mesh castShadow position={[0, 1.45, 0]}>
              <coneGeometry args={[0.45, 0.47, 8]} />
              <meshStandardMaterial color={colors.roof} />
            </mesh>
            <group ref={fan} position={[0, 1.22, 0.3]}>
              {[0, Math.PI / 2, Math.PI, Math.PI * 1.5].map((rotation, i) => (
                <group key={i} rotation={[0, 0, rotation]}>
                  <mesh position={[0, 0.3, 0]}>
                    <boxGeometry args={[0.045, 0.68, 0.055]} />
                    <meshStandardMaterial color="#8d6848" />
                  </mesh>
                  <mesh position={[0.085, 0.42, 0]}>
                    <boxGeometry args={[0.18, 0.35, 0.04]} />
                    <meshStandardMaterial color="#fff0cb" />
                  </mesh>
                </group>
              ))}
              <mesh>
                <sphereGeometry args={[0.075, 8, 6]} />
                <meshStandardMaterial color="#996d48" />
              </mesh>
            </group>
          </group>
        </>
      )}
    </>
  );
}
