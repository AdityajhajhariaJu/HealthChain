import { addAfterEffect, Canvas, useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import { Group, OrthographicCamera } from 'three';
import type { IslandTheme } from '../../services/gamification/policy';
import { IslandPoster } from './IslandPoster';
import { IslandUnderside } from './IslandUnderside';
import { IslandCottage, IslandStructures } from './IslandBuildings';
import { IslandAmbience, IslandPlanting, IslandPond, IslandTrees } from './IslandNature';
import { ISLAND_COLORS } from './islandLayout';

type SceneProps = {
  level: number;
  growth: number;
  theme: IslandTheme;
  moving: boolean;
  onSlowRender: () => void;
  onSnapshot?: (image: string) => void;
};
function Landscape({ level, growth, theme, moving, onSlowRender }: SceneProps) {
  const colors = ISLAND_COLORS[theme],
    island = useRef<Group>(null);
  const { invalidate, camera, size, gl } = useThree();
  const frame = useRef<{
    start?: number;
    requested?: number;
    latency: number;
    warm: number;
    slow: number;
  }>({ latency: 0, warm: 0, slow: 0 });
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let presentationFrame: number | undefined;
    const request = () => {
      frame.current.requested = performance.now();
      invalidate();
    };
    const stop = addAfterEffect(() => {
      if (frame.current.start === undefined) return;
      const submitted = performance.now();
      const submissionCost = Math.max(submitted - frame.current.start, frame.current.latency);
      frame.current.start = undefined;
      if (!moving) return;
      // GPU submission can return quickly while the compositor stays busy.
      // Measure the following presentation frame as well as JavaScript work.
      presentationFrame = requestAnimationFrame(() => {
        const cost = Math.max(submissionCost, performance.now() - submitted);
        if (++frame.current.warm > 2) {
          frame.current.slow = cost > 80 ? frame.current.slow + 1 : 0;
          if (frame.current.slow >= 3) {
            onSlowRender();
            return;
          }
        }
        // Leave time for input between completed frames; never queue a
        // second scene render while the first is still being presented.
        clearTimeout(timer);
        timer = setTimeout(request, Math.max(1000 / 24, cost));
      });
    });
    request();
    return () => {
      stop();
      clearTimeout(timer);
      if (presentationFrame !== undefined) cancelAnimationFrame(presentationFrame);
    };
  }, [moving, invalidate, onSlowRender]);
  useEffect(() => {
    // Scenery shadows are cached. Smoke, insects and ripples do not cast
    // shadows, so their animation needs no extra shadow pass each frame.
    gl.shadowMap.autoUpdate = false;
    gl.shadowMap.needsUpdate = true;
    invalidate();
  }, [gl, level, growth, theme, invalidate]);
  useFrame(({ clock }) => {
    // Fit before the first draw, including reduced-motion and narrow screens.
    // A passive effect can leave the initial frame at the default camera zoom.
    if (camera instanceof OrthographicCamera) {
      const zoom = Math.min(size.width / 11.3, size.height / 10.5);
      if (camera.zoom !== zoom || camera.position.y !== 6.4) {
        camera.zoom = zoom;
        camera.position.set(8, 6.4, 8);
        camera.lookAt(0, -0.6, 0);
        camera.updateProjectionMatrix();
      }
    }
    frame.current.start = performance.now();
    frame.current.latency =
      frame.current.requested === undefined ? 0 : frame.current.start - frame.current.requested;
    frame.current.requested = undefined;
    if (island.current)
      island.current.position.y = moving ? Math.sin(clock.elapsedTime * 0.55) * 0.025 : 0;
  });
  return (
    <>
      <hemisphereLight args={['#fff4da', '#729484', 1.3]} />
      <directionalLight
        castShadow
        position={[-3, 8, 5]}
        intensity={2.1}
        color={theme === 'dusk' ? '#ffd39a' : '#fff0ce'}
        shadow-mapSize={[512, 512]}
        shadow-camera-left={-6}
        shadow-camera-right={6}
        shadow-camera-top={6}
        shadow-camera-bottom={-6}
        shadow-camera-near={1}
        shadow-camera-far={24}
        shadow-normalBias={0.04}
      />
      <group ref={island}>
        <IslandUnderside theme={theme} />
        <mesh position={[0, -0.04, 0]}>
          <cylinderGeometry args={[4.8, 4.62, 0.35, 48]} />
          <meshStandardMaterial color="#b89065" />
        </mesh>
        <mesh position={[0, 0.16, 0]}>
          <cylinderGeometry args={[4.82, 4.8, 0.13, 48]} />
          <meshStandardMaterial color="#e2c9a0" />
        </mesh>
        <mesh receiveShadow position={[0, 0.28, 0]}>
          <cylinderGeometry args={[4.72, 4.72, 0.1, 48]} />
          <meshStandardMaterial color={colors.grass} roughness={1} />
        </mesh>
        {[
          [-2.6, -1.65, 1.05],
          [2.6, -1.7, 0.92],
          [-1.65, 2.5, 1.1],
          [2.8, 2.25, 0.62],
        ].map(([x, z, scale], i) => (
          <mesh
            key={i}
            receiveShadow
            position={[x, 0.335, z]}
            rotation={[-Math.PI / 2, 0, i]}
            scale={[scale, scale * 0.67, 1]}
          >
            <circleGeometry args={[1, 20]} />
            <meshStandardMaterial color={colors.meadow} roughness={1} />
          </mesh>
        ))}
        <mesh receiveShadow position={[0, 0.341, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[3.55, 3.8, 64]} />
          <meshStandardMaterial color="#efdcad" />
        </mesh>
        <mesh receiveShadow position={[0.1, 0.346, -0.1]} rotation={[0, 0.28, 0]}>
          <boxGeometry args={[0.36, 0.024, 5.5]} />
          <meshStandardMaterial color="#efdcad" />
        </mesh>
        {Array.from({ length: 7 }, (_, i) => (
          <mesh
            key={i}
            receiveShadow
            position={[-1.3 + i * 0.34, 0.358, 0.5 + i * 0.14]}
            rotation={[0, i * 0.7, 0]}
            scale={[0.22, 0.04, 0.18]}
          >
            <cylinderGeometry args={[1, 1, 1, 7]} />
            <meshStandardMaterial color={i % 2 ? '#ead8b5' : '#d4c7a0'} />
          </mesh>
        ))}
        <IslandTrees theme={theme} />
        <IslandCottage theme={theme} />
        <IslandPlanting growth={growth} theme={theme} />
        {level >= 3 && <IslandPond theme={theme} moving={moving} />}
        <IslandStructures level={level} theme={theme} moving={moving} />
        {Array.from({ length: 7 }, (_, i) => {
          const a = i * 0.8 + 0.2;
          return (
            <group key={i} position={[Math.cos(a) * 4.6, 0.28, Math.sin(a) * 4.6]}>
              <mesh scale={[0.16, 0.12, 0.19]}>
                <icosahedronGeometry args={[1, 0]} />
                <meshStandardMaterial color="#d9c9a7" flatShading />
              </mesh>
            </group>
          );
        })}
        <IslandAmbience theme={theme} moving={moving} level={level} />
      </group>
    </>
  );
}
function Snapshot({ onSnapshot }: { onSnapshot: (image: string) => void }) {
  const { gl, invalidate } = useThree();
  const rendered = useRef(false);
  const frames = useRef(0);
  useFrame(() => {
    rendered.current = true;
    if (frames.current === 0) invalidate();
  });
  useEffect(() => {
    frames.current = 0;
    const stop = addAfterEffect(() => {
      if (!rendered.current) return;
      rendered.current = false;
      // Wait for camera sizing, planting matrices and cached shadows.
      if (++frames.current < 2) return;
      stop();
      // Capture before the browser clears the WebGL drawing buffer.
      onSnapshot(gl.domElement.toDataURL('image/png'));
    });
    invalidate();
    return stop;
  }, [gl, invalidate, onSnapshot]);
  return null;
}
export default function CozyIslandScene(props: SceneProps) {
  return (
    <div>
      <Canvas
        orthographic
        shadows
        flat
        camera={{ position: [8, 7, 8], zoom: 38, near: 0.1, far: 100 }}
        frameloop="demand"
        dpr={props.onSnapshot ? 1 : [1, 1.5]}
        gl={{ antialias: true, alpha: true, powerPreference: 'low-power' }}
        fallback={<IslandPoster level={props.level} growth={props.growth} theme={props.theme} />}
      >
        <Landscape {...props} />
        {props.onSnapshot && <Snapshot onSnapshot={props.onSnapshot} />}
      </Canvas>
    </div>
  );
}
