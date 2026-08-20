import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GitMerge, AlertCircle, HelpCircle, Activity, HeartPulse, Sparkles, AlertTriangle, Stethoscope, Users } from 'lucide-react';

export interface CaseConnectionMapProps {
  data: any;
  isMobile?: boolean;
}

export function CaseConnectionMap({ data, isMobile = false }: CaseConnectionMapProps) {
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [hoveredEdge, setHoveredEdge] = useState<string | null>(null);

  if (!data || !data.conditions) return null;

  const width = isMobile ? 340 : 600;
  const height = isMobile ? 380 : 500;
  const cx = width / 2;
  const cy = height / 2;
  
  const nodes = useMemo(() => {
    let result: any[] = [];
    const symps = data.centralSymptoms || [];
    symps.forEach((symp: any, i: number) => {
      const angle = (i / symps.length) * Math.PI * 2;
      const radius = symps.length > 1 ? 40 : 0;
      result.push({
        ...symp, type: 'symptom',
        x: cx + Math.cos(angle) * radius,
        y: cy + Math.sin(angle) * radius,
      });
    });

    const conds = data.conditions || [];
    conds.forEach((cond: any, i: number) => {
      const angle = (i / conds.length) * Math.PI * 2 - Math.PI / 2;
      const radius = isMobile ? 120 : 180;
      result.push({
        ...cond, type: 'condition',
        x: cx + Math.cos(angle) * radius,
        y: cy + Math.sin(angle) * radius,
      });
    });

    return result;
  }, [data, cx, cy, isMobile]);

  const edges = useMemo(() => {
    const result: any[] = [];
    const connections = data.connections || [];
    connections.forEach((conn: any, i: number) => {
      const fromNode = nodes.find(n => n.id === conn.from);
      const toNode = nodes.find(n => n.id === conn.to);
      if (fromNode && toNode) {
        result.push({
          ...conn, id: `edge-${i}`,
          x1: fromNode.x, y1: fromNode.y,
          x2: toNode.x, y2: toNode.y,
        });
      }
    });
    return result;
  }, [data, nodes]);

  const getPath = (x1: number, y1: number, x2: number, y2: number) => {
    const dx = x2 - x1;
    const dy = y2 - y1;
    return `M${x1},${y1} Q${x1 + dx/2},${y1 + dy/2 - 30} ${x2},${y2}`;
  };

  const activeNodes = useMemo(() => {
    if (!hoveredNode && !hoveredEdge) return nodes.map(n => n.id);
    if (hoveredNode) {
      const connected = edges.filter(e => e.from === hoveredNode || e.to === hoveredNode);
      return [hoveredNode, ...connected.map(e => e.from === hoveredNode ? e.to : e.from)];
    }
    if (hoveredEdge) {
      const edge = edges.find(e => e.id === hoveredEdge);
      return edge ? [edge.from, edge.to] : [];
    }
    return [];
  }, [hoveredNode, hoveredEdge, edges, nodes]);

  const activeEdges = useMemo(() => {
    if (!hoveredNode && !hoveredEdge) return edges.map(e => e.id);
    if (hoveredNode) return edges.filter(e => e.from === hoveredNode || e.to === hoveredNode).map(e => e.id);
    if (hoveredEdge) return [hoveredEdge];
    return [];
  }, [hoveredNode, hoveredEdge, edges]);

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {data.narrative && (
        <div style={{ padding: '16px 20px', background: '#F8FAFC', borderRadius: '16px', borderLeft: '4px solid #6366F1' }}>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
            <Sparkles size={18} color="#6366F1" style={{ marginTop: '2px', flexShrink: 0 }} />
            <p style={{ margin: 0, color: '#334155', fontSize: '15px', lineHeight: 1.5 }}>{data.narrative}</p>
          </div>
        </div>
      )}

      <div style={{ position: 'relative', width: '100%', height: height, background: '#FFF', borderRadius: '24px', border: '1px solid #E2E8F0', overflow: 'hidden' }}>
        <svg role="img" aria-label="Diagnostic case connection map" width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} style={{ overflow: 'visible' }}>
          <defs>
            <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="25" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill="#CBD5E1" />
            </marker>
            <marker id="arrowhead-active" markerWidth="10" markerHeight="7" refX="25" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill="#6366F1" />
            </marker>
          </defs>

          {edges.map(edge => {
            const isActive = activeEdges.includes(edge.id);
            const isFaded = !isActive && (hoveredNode !== null || hoveredEdge !== null);
            
            return (
              <g key={edge.id} 
                onMouseEnter={() => setHoveredEdge(edge.id)}
                onMouseLeave={() => setHoveredEdge(null)}
                style={{ cursor: 'pointer', transition: 'all 0.3s' }}
                opacity={isFaded ? 0.1 : 1}
              >
                <path d={getPath(edge.x1, edge.y1, edge.x2, edge.y2)} fill="none" stroke="transparent" strokeWidth="20" />
                <motion.path
                  d={getPath(edge.x1, edge.y1, edge.x2, edge.y2)}
                  fill="none"
                  stroke={isActive && (hoveredNode || hoveredEdge) ? '#6366F1' : '#E2E8F0'}
                  strokeWidth={isActive && (hoveredNode || hoveredEdge) ? 2 : 1.5}
                  strokeDasharray={edge.type === 'differential_overlap' ? '4 4' : 'none'}
                  markerEnd={edge.type === 'causal_progression' ? (isActive && (hoveredNode || hoveredEdge) ? "url(#arrowhead-active)" : "url(#arrowhead)") : "none"}
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 1, ease: 'easeInOut' }}
                />
                
                {isActive && hoveredEdge === edge.id && (
                  <foreignObject x={(edge.x1 + edge.x2)/2 - 60} y={(edge.y1 + edge.y2)/2 - 45} width="120" height="40" style={{ pointerEvents: 'none', overflow: 'visible' }}>
                    <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} style={{ background: '#1E293B', color: '#FFF', fontSize: '11px', padding: '4px 8px', borderRadius: '6px', textAlign: 'center', boxShadow: '0 4px 10px rgba(0,0,0,0.1)', fontWeight: 600 }}>
                      {edge.label}
                    </motion.div>
                  </foreignObject>
                )}
              </g>
            );
          })}

          {nodes.map(node => {
            const isActive = activeNodes.includes(node.id);
            const isFaded = !isActive && (hoveredNode !== null || hoveredEdge !== null);
            
            if (node.type === 'symptom') {
              return (
                <g key={node.id} transform={`translate(${node.x}, ${node.y})`} onMouseEnter={() => setHoveredNode(node.id)} onMouseLeave={() => setHoveredNode(null)} style={{ cursor: 'pointer', transition: 'opacity 0.3s' }} opacity={isFaded ? 0.2 : 1}>
                  <circle r="20" fill="#F8FAFC" stroke="#94A3B8" strokeWidth="2" />
                  <foreignObject x="-12" y="-12" width="24" height="24">
                    <Activity size={24} color="#64748B" />
                  </foreignObject>
                  <text y="35" textAnchor="middle" fontSize="12" fontWeight="600" fill="#475569">{node.label}</text>
                </g>
              );
            }

            const color = node.confidence > 70 ? '#10B981' : node.confidence > 30 ? '#F59E0B' : '#EF4444';
            const bgColor = node.confidence > 70 ? '#ECFDF5' : node.confidence > 30 ? '#FEF3C7' : '#FEF2F2';
            const hasPrecaution = data.precautions?.some((p: any) => p.relatedConditions?.includes(node.id));

            return (
              <g key={node.id} transform={`translate(${node.x}, ${node.y})`} onMouseEnter={() => setHoveredNode(node.id)} onMouseLeave={() => setHoveredNode(null)} style={{ cursor: 'pointer', transition: 'all 0.3s' }} opacity={isFaded ? 0.2 : 1}>
                <motion.rect x="-85" y="-25" width="170" height="50" rx="12" fill={bgColor} stroke={color} strokeWidth="2" initial={{ scale: 0 }} animate={{ scale: isActive && hoveredNode === node.id ? 1.05 : 1 }} transition={{ type: 'spring', stiffness: 300, damping: 20 }} />
                <text y="-5" textAnchor="middle" fontSize="12" fontWeight="800" fill="#0F172A">{node.label.length > 22 ? node.label.substring(0, 20) + '...' : node.label}</text>
                <text y="12" textAnchor="middle" fontSize="11" fontWeight="700" fill={color}>{node.confidence}% | {node.specialty}</text>
                {hasPrecaution && (
                  <motion.g transform="translate(70, -25)" animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 2 }}>
                    <circle r="10" fill="#EF4444" />
                    <foreignObject x="-7" y="-7" width="14" height="14">
                      <AlertTriangle size={14} color="#FFF" />
                    </foreignObject>
                  </motion.g>
                )}
              </g>
            );
          })}
        </svg>

        <div style={{ position: 'absolute', bottom: 16, left: 16, display: 'flex', gap: '12px', background: 'rgba(255,255,255,0.9)', padding: '8px 12px', borderRadius: '12px', fontSize: '11px', fontWeight: 600, color: '#64748B', border: '1px solid #E2E8F0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10B981' }} /> High Match</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><div style={{ width: 8, height: 8, borderRadius: '50%', background: '#F59E0B' }} /> Moderate</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><div style={{ width: 8, height: 8, borderRadius: '50%', background: '#EF4444' }} /> Low Match</div>
        </div>
      </div>

      {(data.precautions?.length > 0 || data.missingEvidence?.length > 0) && (
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '16px' }}>
          {data.precautions?.length > 0 && (
            <div style={{ padding: '16px', background: '#FEF2F2', borderRadius: '16px', border: '1px solid #FECACA' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#B91C1C', fontWeight: 700, marginBottom: '12px' }}><AlertTriangle size={18} /> Red Flags & Precautions</div>
              <ul style={{ margin: 0, paddingLeft: '20px', color: '#991B1B', fontSize: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {data.precautions.map((p: any, i: number) => <li key={i}>{p.text}</li>)}
              </ul>
            </div>
          )}
          {data.missingEvidence?.length > 0 && (
            <div style={{ padding: '16px', background: '#F0FDF4', borderRadius: '16px', border: '1px solid #BBF7D0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#15803D', fontWeight: 700, marginBottom: '12px' }}><HelpCircle size={18} /> Missing Evidence</div>
              <ul style={{ margin: 0, paddingLeft: '20px', color: '#166534', fontSize: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {data.missingEvidence.map((e: any, i: number) => <li key={i}><strong>{e.test}</strong> <span style={{ color: '#15803D', opacity: 0.8, fontSize: '12px', marginLeft: '4px' }}>(Urgency: {e.urgency})</span></li>)}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
