import React, { useRef, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Canvas, useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { getProfile } from '../../services/ProfileEngine';

export interface SpatialRecordItem {
  id: string | number;
  title: string;
  date: string;
  type: string;
  summary?: string;
}

function DocumentMesh({ index, total, data }: { index: number; total: number; data: SpatialRecordItem }) {
  const meshRef = useRef<THREE.Mesh>(null);
  
  // Calculate position in a circle (cylinder)
  const radius = 4.5;
  const angle = (index / total) * Math.PI * 2;
  const x = Math.cos(angle) * radius;
  const z = Math.sin(angle) * radius;
  const y = (Math.random() - 0.5) * 1.5;

  return (
    <mesh 
      ref={meshRef} 
      position={[x, y, z]} 
      rotation={[0, -angle - Math.PI / 2, 0]} // Face inward
    >
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
            <span style={{color: '#CBD5E1', fontSize: '13px'}}>{data.summary || 'Verified Document'}</span>
          </div>
        </div>
      </Html>
    </mesh>
  );
}

function GalleryRig({ records }: { records: SpatialRecordItem[] }) {
  const groupRef = useRef<THREE.Group>(null);
  const [velocity] = useState(0.005); // Slow auto-rotation

  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.rotation.y += velocity;
    }
  });

  return (
    <group ref={groupRef}>
      {records.map((rec, i) => (
        <DocumentMesh key={rec.id} index={i} total={records.length} data={rec} />
      ))}
    </group>
  );
}

export function SpatialGalleryCanvas({ records: propRecords }: { records?: SpatialRecordItem[] }) {
  const navigate = useNavigate();
  const records = useMemo(() => {
    if (propRecords && propRecords.length > 0) return propRecords;
    try {
      const profile = getProfile();
      const labRecords: SpatialRecordItem[] = (profile?.vitals?.historicalLabs || []).map((lab: any, i: number) => ({
        id: lab.id || `lab_${i}`,
        title: lab.name || lab.test || 'Laboratory Panel',
        date: lab.date || 'Recent',
        type: 'Laboratory',
        summary: lab.result ? `Result: ${lab.result}` : undefined,
      }));
      const timelineRecords: SpatialRecordItem[] = (profile?.timeline || [])
        .filter((t: any) => t.type === 'investigation' || t.type === 'lab' || t.type === 'imaging')
        .map((t: any, i: number) => ({
          id: t.id || `tl_${i}`,
          title: t.title || t.event || 'Clinical Record',
          date: t.date || 'Recorded',
          type: t.category || 'Diagnostic',
          summary: t.description || undefined,
        }));
      return [...labRecords, ...timelineRecords];
    } catch {
      return [];
    }
  }, [propRecords]);

  if (records.length === 0) {
    return (
      <div style={{
        width: '100%',
        minHeight: '420px',
        background: 'radial-gradient(circle at center, #F8FAFC 0%, #E2E8F0 100%)',
        borderRadius: '24px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px',
        textAlign: 'center',
        border: '1px dashed #CBD5E1',
        boxSizing: 'border-box'
      }}>
        <div style={{
          width: '56px',
          height: '56px',
          borderRadius: '16px',
          background: '#FFFFFF',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '24px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
          marginBottom: '16px'
        }}>
          📁
        </div>
        <h4 style={{ margin: '0 0 8px', fontSize: '16px', fontWeight: 700, color: '#0F172A' }}>
          Spatial Memory Vault Inactive
        </h4>
        <p style={{ margin: '0 0 20px', fontSize: '13px', color: '#64748B', maxWidth: '340px', lineHeight: 1.5 }}>
          No diagnostic scans, laboratory panels, or clinical imaging records uploaded yet.
        </p>
        <button
          onClick={() => {
            navigate('/app/profile');
          }}
          style={{
            padding: '10px 20px',
            background: '#0F172A',
            color: '#FFF',
            borderRadius: '12px',
            fontSize: '13px',
            fontWeight: 600,
            border: 'none',
            cursor: 'pointer'
          }}
        >
          Upload First Record
        </button>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: '500px', background: 'radial-gradient(circle at center, #F8FAFC 0%, #E2E8F0 100%)', borderRadius: '24px', overflow: 'hidden', position: 'relative' }}>
      <Canvas camera={{ position: [0, 0, 8], fov: 45 }}>
        <ambientLight intensity={0.5} />
        <GalleryRig records={records} />
      </Canvas>
      <div style={{ position: 'absolute', bottom: '24px', left: '0', width: '100%', textAlign: 'center', pointerEvents: 'none' }}>
        <p style={{ margin: 0, fontSize: '14px', fontWeight: 500, color: '#64748B' }}>Drag to explore spatial memory ({records.length} records)</p>
      </div>
    </div>
  );
}