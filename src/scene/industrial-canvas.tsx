'use client';

import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { AdaptiveDpr, PerformanceMonitor } from '@react-three/drei';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Color, InstancedMesh, Object3D, type Group } from 'three';

type Piece = { position: [number, number, number]; scale: [number, number, number]; color: string; rotation?: [number, number, number] };
const palette = { brick: '#74543c', coal: '#343a31', stone: '#666753', brass: '#bb9657', roof: '#3e4b43', copper: '#a87550' };

function makeCity() {
  const blocks: Piece[] = [];
  const chimneys: Piece[] = [];
  const windows: Piece[] = [];
  const sleepers: Piece[] = [];
  const box = (position: Piece['position'], scale: Piece['scale'], color: string, rotation?: Piece['rotation']) => blocks.push({ position, scale, color, rotation });
  // Canal divides the ironworks from a railway and loading wharf.
  box([0, -.35, 0], [14, .65, 8], '#30362b');
  box([0, .01, 1.45], [14, .17, .24], palette.stone);
  box([0, .01, 3.45], [14, .17, .24], palette.stone);
  const factories = [ { x: -4.2, z: -1.3, w: 2.6, h: 1.65, d: 2.3 }, { x: -.3, z: -1.7, w: 3.3, h: 2, d: 2.5 }, { x: 4.1, z: -.9, w: 2.7, h: 1.4, d: 2.4 } ];
  factories.forEach(({ x, z, w, h, d }, index) => {
    box([x, h / 2, z], [w, h, d], palette.brick);
    box([x, .12, z], [w + .2, .24, d + .2], palette.stone);
    box([x, h, z], [w + .2, .12, d + .2], palette.brass);
    for (let bay = 0; bay < 3; bay++) {
      // Repeated pitched roofs make a recognizable foundry silhouette.
      const roofX = x - w / 2 + (bay + .5) * w / 3;
      box([roofX - w / 12, h + .22, z], [w / 5, .12, d + .12], palette.roof, [0, 0, .6]);
      box([roofX + w / 12, h + .22, z], [w / 5, .12, d + .12], palette.roof, [0, 0, -.6]);
      for (let level = 0; level < 2; level++) {
        windows.push({ position: [roofX, .55 + level * .75, z + d / 2 + .012], scale: [.28, .4, .025], color: '#d1a564' });
        box([roofX, .55 + level * .75, z + d / 2 + .035], [.025, .42, .025], palette.coal);
      }
    }
    const chimneyX = x + w * .32;
    const height = 3.4 + index * .45;
    chimneys.push({ position: [chimneyX, height / 2, z - .4], scale: [.24, height, .24], color: palette.brick });
    chimneys.push({ position: [chimneyX, height - .2, z - .4], scale: [.29, .16, .29], color: palette.brass });
    chimneys.push({ position: [chimneyX, height + .015, z - .4], scale: [.24, .04, .24], color: '#1b211b' });
  });
  // Two rails, eighty sleepers and a brass-sided canal bridge.
  for (let i = 0; i < 80; i++) sleepers.push({ position: [-6.9 + i * .175, .035, .65], scale: [.08, .08, .65], color: '#594d38' });
  for (const z of [.44, .86]) box([0, .105, z], [14, .055, .045], palette.brass);
  box([2.1, .3, 2.45], [1.25, .22, 2.4], palette.coal);
  for (const x of [1.46, 2.74]) {
    box([x, .62, 2.45], [.055, .08, 2.4], palette.brass);
    for (let i = 0; i < 6; i++) box([x, .47, 1.5 + i * .38], [.045, .36, .045], palette.brass);
  }
  // Wharf crates, stacked coal and a narrowboat.
  for (let i = 0; i < 7; i++) box([-5.8 + i * .44, .23, 1], [.37, .42, .38], i % 2 ? palette.copper : palette.coal);
  box([-2.5, -.02, 2.5], [2.5, .25, .58], '#272e27');
  box([-2.1, .2, 2.5], [.65, .38, .5], palette.copper);
  box([-2.1, .42, 2.5], [.75, .06, .6], palette.coal);
  for (let i = 0; i < 4; i++) box([4.6 + (i % 2) * .5, .22, -3.05 + Math.floor(i / 2) * .5], [.45, .45, .45], palette.coal);
  return { blocks, chimneys, windows, sleepers };
}

function Batch({ pieces, cylinder = false, luminous = false }: { pieces: Piece[]; cylinder?: boolean; luminous?: boolean }) {
  const mesh = useRef<InstancedMesh>(null);
  useLayoutEffect(() => {
    if (!mesh.current) return;
    const object = new Object3D();
    const color = new Color();
    pieces.forEach((piece, index) => {
      object.position.set(...piece.position); object.scale.set(...piece.scale); object.rotation.set(...(piece.rotation ?? [0, 0, 0])); object.updateMatrix();
      mesh.current!.setMatrixAt(index, object.matrix);
      mesh.current!.setColorAt(index, color.set(piece.color));
    });
    mesh.current.instanceMatrix.needsUpdate = true;
    if (mesh.current.instanceColor) mesh.current.instanceColor.needsUpdate = true;
    mesh.current.computeBoundingSphere();
  }, [pieces]);
  return <instancedMesh ref={mesh} args={[undefined, undefined, pieces.length]} castShadow={!luminous} receiveShadow={!luminous}>
    {cylinder ? <cylinderGeometry args={[.8, 1, 1, 10]} /> : <boxGeometry />}
    {luminous ? <meshBasicMaterial color="#bfa071" /> : <meshStandardMaterial roughness={.85} metalness={.18} />}
  </instancedMesh>;
}

function City({ running }: { running: boolean }) {
  const city = useMemo(() => makeCity(), []);
  const model = useRef<Group>(null);
  const phase = useRef(0);
  const pointer = useRef({ x: 0, y: 0 });
  const { camera, gl, invalidate } = useThree();
  useEffect(() => {
    camera.position.set(11, 8.5, 12); camera.lookAt(0, .6, 0); invalidate();
    const host = gl.domElement.closest('section');
    const move = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse' || !host) return;
      const rect = host.getBoundingClientRect();
      pointer.current.x = (event.clientX - rect.left) / rect.width - .5;
      pointer.current.y = (event.clientY - rect.top) / rect.height - .5;
    };
    const leave = () => { pointer.current.x = 0; pointer.current.y = 0; };
    host?.addEventListener('pointermove', move); host?.addEventListener('pointerleave', leave);
    return () => { host?.removeEventListener('pointermove', move); host?.removeEventListener('pointerleave', leave); };
  }, [camera, gl, invalidate]);
  useFrame((state, delta) => {
    if (!running || !model.current) return;
    phase.current += Math.min(delta, .05);
    state.camera.position.x = 11 + Math.sin(phase.current * .08) * .25;
    state.camera.lookAt(0, .6, 0);
    const target = Math.sin(phase.current * .12) * .035 + pointer.current.x * .045;
    model.current.rotation.y += (target - model.current.rotation.y) * Math.min(delta * 2, 1);
    model.current.rotation.x += (pointer.current.y * .012 - model.current.rotation.x) * Math.min(delta * 2, 1);
  });
  return <group ref={model}>
    <Batch pieces={city.blocks} /><Batch pieces={city.chimneys} cylinder /><Batch pieces={city.windows} luminous /><Batch pieces={city.sleepers} />
    <mesh position={[0, -.12, 2.45]} receiveShadow><boxGeometry args={[14, .12, 1.8]} /><meshStandardMaterial color="#668f92" roughness={.4} metalness={.35} /></mesh>
    <mesh position={[3.4, .85, .2]} rotation={[0, Math.PI / 2, 0]} castShadow><torusGeometry args={[.7, .1, 6, 18]} /><meshStandardMaterial color="#bb9657" roughness={.5} metalness={.6} /></mesh>
    <mesh position={[3.4, .85, .2]} rotation={[0, Math.PI / 2, 0]}><cylinderGeometry args={[.16, .16, .9, 8]} /><meshStandardMaterial color="#a87550" roughness={.6} metalness={.45} /></mesh>
  </group>;
}

export default function IndustrialCanvas({ running, mobile, onFailure, onReady }: { running: boolean; mobile: boolean; onFailure: () => void; onReady: () => void }) {
  const [lowQuality, setLowQuality] = useState(false);
  const shadows = !mobile && !lowQuality;
  return <Canvas orthographic camera={{ position: [11, 8.5, 12], zoom: mobile ? 26 : 35, near: .1, far: 80 }}
    dpr={mobile || lowQuality ? 1 : [1, 1.5]} frameloop={running ? 'always' : 'demand'} shadows={shadows}
    gl={{ alpha: true, antialias: !mobile, powerPreference: 'low-power' }}
    onCreated={({ gl }) => {
      onReady();
      gl.domElement.addEventListener('webglcontextlost', (event) => { event.preventDefault(); onFailure(); }, { once: true });
    }}>
    <fog attach="fog" args={['#191c17', 22, 46]} />
    <ambientLight intensity={1.1} color="#c4c4b0" />
    <hemisphereLight args={['#e9d2a4', '#343d32', 1.5]} />
    <directionalLight position={[-3, 9, 5]} intensity={3.1} color="#ffda9c" castShadow={shadows} shadow-mapSize={[1024, 1024]} shadow-camera-left={-10} shadow-camera-right={10} shadow-camera-top={8} shadow-camera-bottom={-8} shadow-normalBias={.06} />
    <City running={running} />
    <AdaptiveDpr />
    <PerformanceMonitor onDecline={() => setLowQuality(true)} />
  </Canvas>;
}
