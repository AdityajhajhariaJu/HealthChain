import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GitMerge, AlertCircle, HelpCircle, Activity, HeartPulse, Sparkles, AlertTriangle, Stethoscope, Users } from 'lucide-react';

export interface CaseConnectionMapProps {
  data: any;
  isMobile?: boolean;
  selectedNodeId?: string | null;
  onSelectNode?: (nodeId: string) => void;
  filterSystem?: string;
}

export function CaseConnectionMap({
  data,
  isMobile = false,
  selectedNodeId = null,
  onSelectNode,
  filterSystem = 'all',
}: CaseConnectionMapProps) {
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [hoveredEdge, setHoveredEdge] = useState<string | null>(null);

  if (!data || !data.conditions) return null;

  const width = isMobile ? 340 : 600;
  const height = isMobile ? 380 : 480;
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
      const radius = isMobile ? 120 : 175;
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

  const isNodeMatchingFilter = (node: any) => {
    if (filterSystem === 'all') return true;
    if (filterSystem === 'autonomic') {
      return node.category === 'autonomic' || node.system === 'autonomic' || node.id.includes('pots') || node.id.includes('palpitations') || node.id.includes('roemheld');
    }
    if (filterSystem === 'metabolic') {
      return node.category === 'metabolic' || node.system === 'metabolic' || node.id.includes('ferritin') || node.id.includes('fatigue');
    }
    if (filterSystem === 'gut') {
      return node.category === 'gastrointestinal' || node.system === 'gut' || node.id.includes('histamine') || node.id.includes('bloat');
    }
    if (filterSystem === 'neuro') {
      return node.category === 'vascular' || node.system === 'neuro' || node.id.includes('headache');
    }
    if (filterSystem === 'immune') {
      return node.category === 'inflammatory' || node.system === 'immune' || node.id.includes('mcas');
    }
    return true;
  };

  const activeNodes = useMemo(() => {
    const activeTarget = hoveredNode || selectedNodeId;
    if (!activeTarget && !hoveredEdge) {
      return nodes.filter(isNodeMatchingFilter).map(n => n.id);
    }
    if (activeTarget) {
      const connected = edges.filter(e => e.from === activeTarget || e.to === activeTarget);
      return [activeTarget, ...connected.map(e => e.from === activeTarget ? e.to : e.from)];
    }
    if (hoveredEdge) {
      const edge = edges.find(e => e.id === hoveredEdge);
      return edge ? [edge.from, edge.to] : [];
    }
    return [];
  }, [hoveredNode, selectedNodeId, hoveredEdge, edges, nodes, filterSystem]);

  const activeEdges = useMemo(() => {
    const activeTarget = hoveredNode || selectedNodeId;
    if (!activeTarget && !hoveredEdge) return edges.map(e => e.id);
    if (activeTarget) return edges.filter(e => e.from === activeTarget || e.to === activeTarget).map(e => e.id);
    if (hoveredEdge) return [hoveredEdge];
    return [];
  }, [hoveredNode, selectedNodeId, hoveredEdge, edges]);

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div style={{ position: 'relative', width: '100%', height: height, background: 'linear-gradient(180deg, #FFFFFF 0%, #FAFBFC 100%)', borderRadius: '24px', border: '1.5px solid #E2E8F0', overflow: 'hidden' }}>
        {/* Node Tap Prompt Pill */}
        <div style={{
          position: 'absolute',
          top: 12,
          right: 12,
          zIndex: 10,
          background: 'rgba(255, 255, 255, 0.92)',
          backdropFilter: 'blur(8px)',
          border: '1px solid #E2E8F0',
          borderRadius: '999px',
          padding: '4px 10px',
          display: 'flex',
          alignItems: 'center',
          gap: '5px',
          fontSize: '11px',
          color: '#64748B',
          fontWeight: 700,
          boxShadow: '0 2px 6px rgba(0,0,0,0.04)'
        }}>
          <span>👆</span>
          <span>Tap any node for deep-dive</span>
        </div>

        <svg role="img" aria-label="Case discussion connection map" width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} style={{ overflow: 'visible' }}>
          <defs>
            <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="25" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill="#CBD5E1" />
            </marker>
            <marker id="arrowhead-active" markerWidth="10" markerHeight="7" refX="25" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill="#0284C7" />
            </marker>
            <linearGradient id="edge-flow-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0284C7" />
              <stop offset="50%" stopColor="#38BDF8" />
              <stop offset="100%" stopColor="#059669" />
            </linearGradient>
          </defs>

          {edges.map(edge => {
            const isActive = activeEdges.includes(edge.id);
            const isFaded = !isActive && (hoveredNode !== null || selectedNodeId !== null || hoveredEdge !== null || filterSystem !== 'all');
            
            return (
              <g key={edge.id} 
                onMouseEnter={() => setHoveredEdge(edge.id)}
                onMouseLeave={() => setHoveredEdge(null)}
                style={{ cursor: 'pointer', transition: 'all 0.3s' }}
                opacity={isFaded ? 0.08 : 1}
              >
                <path d={getPath(edge.x1, edge.y1, edge.x2, edge.y2)} fill="none" stroke="transparent" strokeWidth="20" />
                <motion.path
                  d={getPath(edge.x1, edge.y1, edge.x2, edge.y2)}
                  fill="none"
                  stroke={isActive && (hoveredNode || selectedNodeId || hoveredEdge) ? 'url(#edge-flow-gradient)' : '#E2E8F0'}
                  strokeWidth={isActive && (hoveredNode || selectedNodeId || hoveredEdge) ? 2.5 : 1.5}
                  strokeDasharray={edge.type === 'differential_overlap' ? '4 4' : 'none'}
                  markerEnd={edge.type === 'causal_progression' ? (isActive && (hoveredNode || selectedNodeId || hoveredEdge) ? "url(#arrowhead-active)" : "url(#arrowhead)") : "none"}
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 1, ease: 'easeInOut' }}
                />
                
                {isActive && hoveredEdge === edge.id && (
                  <foreignObject x={(edge.x1 + edge.x2)/2 - 70} y={(edge.y1 + edge.y2)/2 - 45} width="140" height="40" style={{ pointerEvents: 'none', overflow: 'visible' }}>
                    <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} style={{ background: '#0F172A', color: '#FFF', fontSize: '11px', padding: '5px 10px', borderRadius: '8px', textAlign: 'center', boxShadow: '0 4px 14px rgba(0,0,0,0.18)', fontWeight: 700, border: '1px solid #334155' }}>
                      {edge.label}
                    </motion.div>
                  </foreignObject>
                )}
              </g>
            );
          })}

          {nodes.map(node => {
            const isSelected = selectedNodeId === node.id;
            const isActive = activeNodes.includes(node.id);
            const isFaded = !isActive && (hoveredNode !== null || selectedNodeId !== null || hoveredEdge !== null || filterSystem !== 'all');
            
            if (node.type === 'symptom') {
              return (
                <g
                  key={node.id}
                  transform={`translate(${node.x}, ${node.y})`}
                  onMouseEnter={() => setHoveredNode(node.id)}
                  onMouseLeave={() => setHoveredNode(null)}
                  onClick={() => {
                    if (onSelectNode) onSelectNode(node.id);
                  }}
                  style={{ cursor: 'pointer', transition: 'opacity 0.3s' }}
                  opacity={isFaded ? 0.15 : 1}
                >
                  {/* Selection Halo */}
                  {isSelected && (
                    <motion.circle
                      r="26"
                      fill="none"
                      stroke="#0284C7"
                      strokeWidth="2.5"
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: [1, 1.2, 1], opacity: [0.8, 0.4, 0.8] }}
                      transition={{ repeat: Infinity, duration: 1.8 }}
                    />
                  )}
                  <circle r="20" fill={isSelected ? '#F0F9FF' : '#F8FAFC'} stroke={isSelected ? '#0284C7' : '#94A3B8'} strokeWidth={isSelected ? 2.5 : 2} />
                  <foreignObject x="-12" y="-12" width="24" height="24">
                    <Activity size={24} color={isSelected ? '#0284C7' : '#64748B'} />
                  </foreignObject>
                  <text y="35" textAnchor="middle" fontSize="11.5" fontWeight="700" fill={isSelected ? '#0284C7' : '#475569'}>
                    {node.label}
                  </text>
                </g>
              );
            }

            const confidence = typeof node.confidence === 'number' ? node.confidence : 50;
            const color = isSelected ? '#0284C7' : confidence > 70 ? '#059669' : confidence > 30 ? '#D97706' : '#DC2626';
            const bgColor = isSelected ? '#F0F9FF' : confidence > 70 ? '#ECFDF5' : confidence > 30 ? '#FEF3C7' : '#FEF2F2';
            const hasPrecaution = (data.precautions || []).some((p: any) => p?.relatedConditions?.includes(node.id));
            const nodeLabel = node.label || node.name || 'Condition';

            return (
              <g
                key={node.id}
                transform={`translate(${node.x}, ${node.y})`}
                onMouseEnter={() => setHoveredNode(node.id)}
                onMouseLeave={() => setHoveredNode(null)}
                onClick={() => {
                  if (onSelectNode) onSelectNode(node.id);
                }}
                style={{ cursor: 'pointer', transition: 'all 0.3s' }}
                opacity={isFaded ? 0.15 : 1}
              >
                {/* Selection Halo */}
                {isSelected && (
                  <motion.rect
                    x="-90"
                    y="-30"
                    width="180"
                    height="60"
                    rx="16"
                    fill="none"
                    stroke="#0284C7"
                    strokeWidth="2.5"
                    strokeDasharray="4 4"
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 15, ease: 'linear' }}
                  />
                )}
                <motion.rect
                  x="-85"
                  y="-25"
                  width="170"
                  height="50"
                  rx="14"
                  fill={bgColor}
                  stroke={isSelected ? '#0284C7' : color}
                  strokeWidth={isSelected ? 2.5 : 1.8}
                  initial={{ scale: 0 }}
                  animate={{ scale: (isActive && hoveredNode === node.id) || isSelected ? 1.06 : 1 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                  style={{ filter: isSelected ? 'drop-shadow(0 6px 16px rgba(2, 132, 199, 0.3))' : 'none' }}
                />
                <text y="-5" textAnchor="middle" fontSize="11.5" fontWeight="800" fill="#0F172A">
                  {nodeLabel.length > 22 ? nodeLabel.substring(0, 20) + '...' : nodeLabel}
                </text>
                <text y="12" textAnchor="middle" fontSize="10.5" fontWeight="700" fill={color}>
                  {confidence}% Match • {node.specialty || 'General'}
                </text>
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

        {/* Legend */}
        <div style={{ position: 'absolute', bottom: 12, left: 12, display: 'flex', gap: '10px', background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(8px)', padding: '6px 12px', borderRadius: '12px', fontSize: '10.5px', fontWeight: 700, color: '#64748B', border: '1px solid #E2E8F0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><div style={{ width: 8, height: 8, borderRadius: '50%', background: '#059669' }} /> High Match</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><div style={{ width: 8, height: 8, borderRadius: '50%', background: '#D97706' }} /> Moderate</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><div style={{ width: 8, height: 8, borderRadius: '50%', background: '#DC2626' }} /> Differential</div>
        </div>
      </div>

      {((data.precautions || []).length > 0 || (data.missingEvidence || []).length > 0) && (
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '12px' }}>
          {(data.precautions || []).length > 0 && (
            <div style={{ padding: '14px 16px', background: '#FEF2F2', borderRadius: '16px', border: '1px solid #FECACA' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#B91C1C', fontWeight: 800, fontSize: '13px', marginBottom: '8px' }}>
                <AlertTriangle size={16} /> Red Flags & Safety Precautions
              </div>
              <ul style={{ margin: 0, paddingLeft: '18px', color: '#991B1B', fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {(data.precautions || []).map((p: any, i: number) => <li key={i}>{typeof p === 'string' ? p : p?.text || JSON.stringify(p)}</li>)}
              </ul>
            </div>
          )}
          {(data.missingEvidence || []).length > 0 && (
            <div style={{ padding: '14px 16px', background: '#F0FDF4', borderRadius: '16px', border: '1px solid #BBF7D0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#15803D', fontWeight: 800, fontSize: '13px', marginBottom: '8px' }}>
                <HelpCircle size={16} /> Key Confirmatory Questions for Doctor
              </div>
              <ul style={{ margin: 0, paddingLeft: '18px', color: '#166534', fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {(data.missingEvidence || []).map((e: any, i: number) => (
                  <li key={i}>
                    <strong>{typeof e === 'string' ? e : e?.test}</strong> {e?.urgency && <span style={{ color: '#15803D', opacity: 0.8, fontSize: '11px', marginLeft: '4px' }}>({e.urgency})</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
