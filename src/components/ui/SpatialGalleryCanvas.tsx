import React, { useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Html, Text } from '@react-three/drei';
import * as THREE from 'three';

const MOCK_RECORDS = [
  { id: 1, title: 'Lumbar MRI', date: '2018-04-12', type: 'Imaging' },
  { id: 2, title: 'Lipid Panel', date: '2019-11-20', type: 'Lab Test' },
  { id: 3, title: 'ECG Report', date: '2021-02-15', type: 'Cardiology' },
  { id: 4, title: 'Knee X-Ray', date: '2022-08-05', type: 'Imaging' },
  { id: 5, title: 'Comprehensive Metabolic', date: '2023-01-10', type: 'Lab Test' },
  { id: 6, title: 'Genetic Screening', date: '2023-09-30', type: 'Genomics' },
];

function DocumentMesh({ index, total, data }: { index: number; total: number; data: any }) {
  const meshRef = useRef<THREE.Mesh>(null);
  
  // Calculate position in a circle (cylinder)
  const radius = 4.5;
  const angle = (index / total) * Math.PI * 2;
  const x = Math.cos(angle) * radius;
  const z = Math.sin(angle) * radius;
  // Slight y-offset to make it feel like a helix
  const y = (Math.random() - 0.5) * 1.5;

  return (
    <mesh 
      ref={meshRef} 
      position={[x, y, z]} 
      rotation={[0, -angle - Math.PI / 2, 0]} // Face inward
    >
      {/* Invisible plane to catch clicks if needed, but we use Html */}
      <planeGeometry args={[2, 2.5]} />
      <meshBasicMaterial color="#ffffff" transparent opacity={0.05} />
      
      <Html transform distanceFactor={3} zIndexRange={[100, 0]}>
        <div style={{
          width: '240px',
          height: '320px',
          background: 'rgba(255, 255, 255, 0.85)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderRadius: '16px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          border: '1px solid rgba(255,255,255,0.4)',
          cursor: 'pointer',
          transition: 'transform 0.2s',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.05)')}
        onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
        >
          <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px' }}>{data.type}</div>
          <h3 style={{ margin: '8px 0', fontSize: '20px', color: '#0F172A', lineHeight: 1.2 }}>{data.title}</h3>
          <div style={{ marginTop: 'auto', fontSize: '14px', color: '#94A3B8' }}>{data.date}</div>
          
          <div style={{
            marginTop: '16px',
            width: '100%',
            height: '120px',
            background: '#F1F5F9',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <span style={{color: '#CBD5E1'}}>Preview</span>
          </div>
        </div>
      </Html>
    </mesh>
  );
}

function GalleryRig() {
  const groupRef = useRef<THREE.Group>(null);
  const [velocity, setVelocity] = useState(0.005); // Slow auto-rotation

  useFrame((state, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += velocity;
    }
  });

  return (
    <group ref={groupRef}>
      {MOCK_RECORDS.map((rec, i) => (
        <DocumentMesh key={rec.id} index={i} total={MOCK_RECORDS.length} data={rec} />
      ))}
    </group>
  );
}

export function SpatialGalleryCanvas() {
  return (
    <div style={{ width: '100%', height: '500px', background: 'radial-gradient(circle at center, #F8FAFC 0%, #E2E8F0 100%)', borderRadius: '24px', overflow: 'hidden', position: 'relative' }}>
      <Canvas camera={{ position: [0, 0, 8], fov: 45 }}>
        <ambientLight intensity={0.5} />
        <GalleryRig />
      </Canvas>
      <div style={{ position: 'absolute', bottom: '24px', left: '0', width: '100%', textAlign: 'center', pointerEvents: 'none' }}>
        <p style={{ margin: 0, fontSize: '14px', fontWeight: 500, color: '#64748B' }}>Drag to explore spatial memory</p>
      </div>
    </div>
  );
}