import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef, useState } from 'react';
import { Group, OrthographicCamera } from 'three';
import { ISLAND_THEMES, type IslandTheme } from '../../services/gamification/policy';
import { IslandArtwork } from './IslandArtwork';
import { ISLAND_TREES, islandFlowers } from './islandLayout';
type SceneProps = { level: number; growth: number; theme: IslandTheme; angle: number };
function Landscape({ level, growth, theme, angle, visible }: SceneProps & { visible: boolean }) {
  const palette = ISLAND_THEMES.find((item) => item.id === theme) || ISLAND_THEMES[0];
  const island = useRef<Group>(null),
    fan = useRef<Group>(null),
    { invalidate, camera, size } = useThree();
  const [moving, setMoving] = useState(false);
  useEffect(() => {
    if (camera instanceof OrthographicCamera) {
      camera.zoom = Math.min(size.width / 11.3, size.height / 9);
      camera.updateProjectionMatrix();
      invalidate();
    }
  }, [camera, size.width, size.height, invalidate]);
  useEffect(() => {
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setMoving(visible && !document.hidden && !media.matches);
    update();
    media.addEventListener('change', update);
    document.addEventListener('visibilitychange', update);
    return () => {
      media.removeEventListener('change', update);
      document.removeEventListener('visibilitychange', update);
    };
  }, [visible]);
  useEffect(() => {
    if (!moving) {
      invalidate();
      return;
    }
    const timer = setInterval(invalidate, 1000 / 24);
    return () => clearInterval(timer);
  }, [moving, invalidate]);
  useFrame(({ clock }) => {
    if (island.current)
      island.current.position.y = moving ? Math.sin(clock.elapsedTime * 0.55) * 0.045 : 0;
    if (fan.current && moving) fan.current.rotation.z = clock.elapsedTime * 0.2;
  });
  return (
    <>
      <ambientLight intensity={1.2} />
      <directionalLight position={[5, 9, 3]} intensity={1.7} color="#fff4d9" />
      <group rotation={[0, angle, 0]} ref={island}>
        <mesh position={[0, -2.05, 0]} rotation={[Math.PI, 0, 0]}>
          <coneGeometry args={[4.8, 4.3, 14]} />
          <meshStandardMaterial color="#a18f7d" flatShading />
        </mesh>
        <mesh position={[0, 0.08, 0]}>
          <cylinderGeometry args={[4.85, 4.7, 0.36, 48]} />
          <meshStandardMaterial color="#d9cdb0" />
        </mesh>
        <mesh position={[0, 0.28, 0]}>
          <cylinderGeometry args={[4.73, 4.73, 0.08, 48]} />
          <meshStandardMaterial color={palette.grass} />
        </mesh>
        <mesh position={[0, 0.329, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[3.5, 3.78, 48]} />
          <meshStandardMaterial color="#e7e1c9" />
        </mesh>
        <mesh position={[0, 0.335, 0]}>
          <boxGeometry args={[0.36, 0.03, 5.6]} />
          <meshStandardMaterial color="#e7e1c9" />
        </mesh>
        {ISLAND_TREES.map((tree, index) => (
          <group key={index} position={[tree.x, 0.34, tree.z]} scale={tree.scale}>
            <mesh position={[0, 0.55, 0]}>
              <cylinderGeometry args={[0.1, 0.14, 1.1, 7]} />
              <meshStandardMaterial color="#a38868" />
            </mesh>
            <mesh position={[0, 1.35, 0]} scale={[0.75, 0.9, 0.75]}>
              <icosahedronGeometry args={[1, 1]} />
              <meshStandardMaterial color={palette.leaves} flatShading />
            </mesh>
            <mesh position={[-0.35, 1.05, 0.2]} scale={0.58}>
              <icosahedronGeometry args={[1, 1]} />
              <meshStandardMaterial
                color={theme === 'blossom' ? '#edbdc8' : '#b2cd98'}
                flatShading
              />
            </mesh>
          </group>
        ))}
        <group position={[-1.4, 0.35, -0.8]}>
          <mesh position={[0, 0.58, 0]}>
            <boxGeometry args={[1.45, 1.15, 1.25]} />
            <meshStandardMaterial color="#f5e9cd" />
          </mesh>
          <mesh position={[0, 1.38, 0]} rotation={[0, Math.PI / 4, 0]} scale={[1.18, 1, 0.99]}>
            <coneGeometry args={[1.12, 0.72, 4]} />
            <meshStandardMaterial color={palette.roof} flatShading />
          </mesh>
          <mesh position={[0.36, 1.52, -0.28]}>
            <boxGeometry args={[0.23, 0.7, 0.24]} />
            <meshStandardMaterial color="#c9b99e" />
          </mesh>
          <mesh position={[0.3, 0.32, 0.637]}>
            <boxGeometry args={[0.28, 0.65, 0.035]} />
            <meshStandardMaterial color="#aa9370" />
          </mesh>
          <mesh position={[-0.3, 0.69, 0.64]}>
            <boxGeometry args={[0.35, 0.35, 0.04]} />
            <meshStandardMaterial
              color="#efd39b"
              emissive="#e8b65b"
              emissiveIntensity={theme === 'dusk' ? 0.45 : 0.1}
            />
          </mesh>
          <mesh position={[0.74, 0.68, 0]}>
            <boxGeometry args={[0.04, 0.35, 0.35]} />
            <meshStandardMaterial color="#efd39b" />
          </mesh>
          <mesh position={[0.2, 0.03, 0.87]}>
            <boxGeometry args={[1.3, 0.1, 0.45]} />
            <meshStandardMaterial color="#c6af87" />
          </mesh>
        </group>
        {islandFlowers(growth).map((flower, index) => (
          <group key={index} position={[flower.x, 0.34, flower.z]}>
            <mesh position={[0, 0.12, 0]}>
              <cylinderGeometry args={[0.016, 0.02, 0.24, 4]} />
              <meshStandardMaterial color="#6a9461" />
            </mesh>
            <mesh position={[0, 0.25, 0]} scale={[1, 0.6, 1]}>
              <icosahedronGeometry args={[0.11, 0]} />
              <meshStandardMaterial color={index % 3 ? palette.flowers : '#f8ebc2'} />
            </mesh>
          </group>
        ))}
        {level >= 2 && (
          <group position={[-2.2, 0.37, 1.2]}>
            <mesh>
              <boxGeometry args={[1.2, 0.12, 0.65]} />
              <meshStandardMaterial color="#ad906d" />
            </mesh>
            {[-0.35, 0, 0.35].map((x, index) => (
              <mesh key={index} position={[x, 0.18, 0]}>
                <icosahedronGeometry args={[0.22, 0]} />
                <meshStandardMaterial color={palette.flowers} />
              </mesh>
            ))}
          </group>
        )}
        {level >= 3 && (
          <group position={[1.7, 0.34, 1.2]}>
            <mesh scale={[1, 1, 0.75]}>
              <cylinderGeometry args={[1.12, 1.12, 0.04, 32]} />
              <meshStandardMaterial color="#d8c7a0" />
            </mesh>
            <mesh position={[0, 0.025, 0]} scale={[1, 1, 0.75]}>
              <cylinderGeometry args={[0.98, 0.98, 0.04, 32]} />
              <meshStandardMaterial color="#86bbbf" roughness={0.35} />
            </mesh>
            <group rotation={[0, 0.35, 0]}>
              <mesh position={[0, 0.14, 0]}>
                <boxGeometry args={[0.42, 0.12, 1.75]} />
                <meshStandardMaterial color="#bf9e77" />
              </mesh>
              {[-0.2, 0.2].map((x, index) => (
                <mesh key={index} position={[x, 0.33, 0]}>
                  <boxGeometry args={[0.05, 0.08, 1.8]} />
                  <meshStandardMaterial color="#997f63" />
                </mesh>
              ))}
            </group>
          </group>
        )}
        {level >= 4 && (
          <group position={[1.6, 0.35, -1.5]}>
            <mesh position={[0, 0.4, 0]}>
              <boxGeometry args={[1.1, 0.8, 1]} />
              <meshStandardMaterial color="#b9d5c1" transparent opacity={0.85} />
            </mesh>
            <mesh position={[0, 0.96, 0]} rotation={[0, Math.PI / 4, 0]}>
              <coneGeometry args={[0.91, 0.5, 4]} />
              <meshStandardMaterial color="#d6e5d8" />
            </mesh>
          </group>
        )}
        {level >= 3 && (
          <group position={[2.4, 0.4, -0.4]} rotation={[0, 0.25, 0]}>
            <mesh position={[0, 0.25, 0]}>
              <boxGeometry args={[0.85, 0.1, 0.34]} />
              <meshStandardMaterial color="#b99d78" />
            </mesh>
            <mesh position={[0, 0.5, -0.14]}>
              <boxGeometry args={[0.85, 0.33, 0.08]} />
              <meshStandardMaterial color="#b99d78" />
            </mesh>
            {[-0.3, 0.3].map((x) => (
              <mesh key={x} position={[x, 0.1, 0]}>
                <boxGeometry args={[0.08, 0.3, 0.28]} />
                <meshStandardMaterial color="#9f876b" />
              </mesh>
            ))}
          </group>
        )}
        {level >= 4 && (
          <group position={[0.1, 0.36, 2.4]}>
            <mesh position={[0, 0.04, 0]}>
              <cylinderGeometry args={[0.67, 0.67, 0.08, 8]} />
              <meshStandardMaterial color="#d0b995" />
            </mesh>
            {[-0.38, 0.38].flatMap((x) =>
              [-0.38, 0.38].map((z) => (
                <mesh key={`${x}:${z}`} position={[x, 0.58, z]}>
                  <cylinderGeometry args={[0.045, 0.045, 1.12, 6]} />
                  <meshStandardMaterial color="#ba9d77" />
                </mesh>
              ))
            )}
            <mesh position={[0, 1.25, 0]}>
              <coneGeometry args={[0.88, 0.45, 8]} />
              <meshStandardMaterial color={palette.roof} flatShading />
            </mesh>
          </group>
        )}
        {level >= 5 &&
          [
            [-0.25, -2.8],
            [0.8, -3.2],
            [1.8, -2.8],
          ].map(([x, z], index) => (
            <group key={index} position={[x, 0.34, z]}>
              <mesh position={[0, 0.45, 0]}>
                <cylinderGeometry args={[0.06, 0.1, 0.9, 6]} />
                <meshStandardMaterial color="#a38868" />
              </mesh>
              <mesh position={[0, 1, 0]}>
                <icosahedronGeometry args={[0.5, 1]} />
                <meshStandardMaterial color={palette.leaves} flatShading />
              </mesh>
              {[
                [-0.3, 0.92, 0.28],
                [0.22, 1.1, 0.3],
                [0.1, 0.82, -0.32],
              ].map((fruit, i) => (
                <mesh key={i} position={fruit as [number, number, number]}>
                  <icosahedronGeometry args={[0.08, 0]} />
                  <meshStandardMaterial color="#dda578" />
                </mesh>
              ))}
            </group>
          ))}
        {level >= 4 &&
          [-2.2, 0, 2.3].map((x, index) => (
            <group key={index} position={[x, 0.37, 2.3]}>
              <mesh position={[0, 0.3, 0]}>
                <cylinderGeometry args={[0.025, 0.04, 0.6, 6]} />
                <meshStandardMaterial color="#937a60" />
              </mesh>
              <mesh position={[0, 0.7, 0]}>
                <boxGeometry args={[0.16, 0.2, 0.16]} />
                <meshStandardMaterial
                  color="#f4d49a"
                  emissive="#e6b568"
                  emissiveIntensity={theme === 'dusk' ? 1 : 0.3}
                />
              </mesh>
            </group>
          ))}
        {level >= 5 && (
          <group position={[-2.3, 0.35, 0.4]}>
            <mesh position={[0, 0.65, 0]}>
              <cylinderGeometry args={[0.24, 0.4, 1.3, 8]} />
              <meshStandardMaterial color="#f3e9cf" />
            </mesh>
            <mesh position={[0, 1.45, 0]}>
              <coneGeometry args={[0.48, 0.5, 8]} />
              <meshStandardMaterial color={palette.roof} />
            </mesh>
            <group ref={fan} position={[0, 1.2, 0.29]}>
              {[0, Math.PI / 2].map((rotation, index) => (
                <mesh key={index} rotation={[0, 0, rotation]}>
                  <boxGeometry args={[1.1, 0.085, 0.06]} />
                  <meshStandardMaterial color="#b39a77" />
                </mesh>
              ))}
            </group>
          </group>
        )}
      </group>
    </>
  );
}
export default function CozyIslandScene(props: SceneProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    if (!ref.current || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting));
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);
  const fallback = <IslandArtwork level={props.level} growth={props.growth} theme={props.theme} />;
  return (
    <div ref={ref}>
      <Canvas
        orthographic
        camera={{ position: [8, 7, 8], zoom: 38, near: 0.1, far: 100 }}
        frameloop="demand"
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: true, powerPreference: 'low-power' }}
        fallback={fallback}
      >
        <Landscape {...props} visible={visible} />
      </Canvas>
    </div>
  );
}
