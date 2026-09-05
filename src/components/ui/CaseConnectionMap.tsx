import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HelpCircle, HeartPulse, AlertTriangle } from 'lucide-react';

export interface CaseConnectionMapProps {
  data: any;
  isMobile?: boolean;
  selectedNodeId?: string | null;
  onSelectNode?: (nodeId: string) => void;
  filterSystem?: string;
}

const CATEGORY_COLORS: Record<string, { bg: string; border: string; text: string; dot: string }> = {
  metabolic: { bg: '#FFF1F2', border: '#FECDD3', text: '#9F1239', dot: '#F43F5E' },
  autonomic: { bg: '#FEF3C7', border: '#FDE68A', text: '#92400E', dot: '#D97706' },
  gastrointestinal: { bg: '#ECFDF5', border: '#A7F3D0', text: '#065F46', dot: '#059669' },
  vascular: { bg: '#F5F3FF', border: '#DDD6FE', text: '#5B21B6', dot: '#7C3AED' },
  neuro: { bg: '#F0F9FF', border: '#BAE6FD', text: '#075985', dot: '#0284C7' },
  inflammatory: { bg: '#FFF7ED', border: '#FED7AA', text: '#9A3412', dot: '#EA580C' },
};

const SYMPTOM_ICONS: Record<string, string> = {
  symp_fatigue: '⚡',
  symp_palpitations: '💓',
  symp_bloat: '🎈',
  symp_headache: '🤕',
  symp_back: '🦴',
  symp_dizziness: '😫',
  symp_cold: '🥶',
  symp_sleep: '🌙',
};

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

  const width = isMobile ? 360 : 620;
  const height = isMobile ? 420 : 490;
  const cx = width / 2;
  const cy = height / 2;

  const pillWidth = isMobile ? 116 : 138;
  const pillHeight = isMobile ? 36 : 42;
  const pillRx = isMobile ? 18 : 21;

  const nodes = useMemo(() => {
    let result: any[] = [];
    const symps = data.centralSymptoms || [];
    const sympRadius = isMobile ? 54 : 72;
    
    symps.forEach((symp: any, i: number) => {
      const angle = (i / symps.length) * Math.PI * 2 - Math.PI / 2;
      result.push({
        ...symp,
        type: 'symptom',
        x: cx + Math.cos(angle) * sympRadius,
        y: cy + Math.sin(angle) * sympRadius,
      });
    });

    const conds = data.conditions || [];
    const condRadius = isMobile ? 142 : 185;
    conds.forEach((cond: any, i: number) => {
      const angle = (i / conds.length) * Math.PI * 2 - Math.PI / 2;
      result.push({
        ...cond,
        type: 'condition',
        x: cx + Math.cos(angle) * condRadius,
        y: cy + Math.sin(angle) * condRadius,
      });
    });

    return result;
  }, [data, cx, cy, isMobile]);

  const edges = useMemo(() => {
    const result: any[] = [];
    const connections = data.connections || [];
    connections.forEach((conn: any, i: number) => {
      const fromNode = nodes.find((n) => n.id === conn.from);
      const toNode = nodes.find((n) => n.id === conn.to);
      if (fromNode && toNode) {
        result.push({
          ...conn,
          id: `edge-${i}`,
          x1: fromNode.x,
          y1: fromNode.y,
          x2: toNode.x,
          y2: toNode.y,
        });
      }
    });
    return result;
  }, [data, nodes]);

  const getPath = (x1: number, y1: number, x2: number, y2: number) => {
    const dx = x2 - x1;
    const dy = y2 - y1;
    return `M${x1},${y1} Q${x1 + dx / 2},${y1 + dy / 2 - 20} ${x2},${y2}`;
  };

  const isNodeMatchingFilter = (node: any) => {
    if (filterSystem === 'all') return true;
    if (filterSystem === 'autonomic') {
      return (
        node.category === 'autonomic' ||
        node.system === 'autonomic' ||
        node.id?.includes('pots') ||
        node.id?.includes('palpitations') ||
        node.id?.includes('roemheld')
      );
    }
    if (filterSystem === 'metabolic') {
      return (
        node.category === 'metabolic' ||
        node.system === 'metabolic' ||
        node.id?.includes('ferritin') ||
        node.id?.includes('fatigue')
      );
    }
    if (filterSystem === 'gut') {
      return (
        node.category === 'gastrointestinal' ||
        node.system === 'gut' ||
        node.id?.includes('histamine') ||
        node.id?.includes('bloat')
      );
    }
    if (filterSystem === 'neuro') {
      return (
        node.category === 'vascular' ||
        node.system === 'neuro' ||
        node.id?.includes('headache') ||
        node.id?.includes('back') ||
        node.id?.includes('dural')
      );
    }
    if (filterSystem === 'immune') {
      return (
        node.category === 'inflammatory' ||
        node.system === 'immune' ||
        node.id?.includes('mcas')
      );
    }
    return true;
  };

  const activeNodes = useMemo(() => {
    const activeTarget = hoveredNode || selectedNodeId;
    if (!activeTarget && !hoveredEdge) {
      return nodes.filter(isNodeMatchingFilter).map((n) => n.id);
    }
    if (activeTarget) {
      const connected = edges.filter((e) => e.from === activeTarget || e.to === activeTarget);
      return [activeTarget, ...connected.map((e) => (e.from === activeTarget ? e.to : e.from))];
    }
    if (hoveredEdge) {
      const edge = edges.find((e) => e.id === hoveredEdge);
      return edge ? [edge.from, edge.to] : [];
    }
    return [];
  }, [hoveredNode, selectedNodeId, hoveredEdge, edges, nodes, filterSystem]);

  const activeEdges = useMemo(() => {
    const activeTarget = hoveredNode || selectedNodeId;
    if (!activeTarget && !hoveredEdge) return edges.map((e) => e.id);
    if (activeTarget) {
      return edges.filter((e) => e.from === activeTarget || e.to === activeTarget).map((e) => e.id);
    }
    if (hoveredEdge) return [hoveredEdge];
    return [];
  }, [hoveredNode, selectedNodeId, hoveredEdge, edges]);

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: height,
          background: 'linear-gradient(180deg, #FFFFFF 0%, #FFFDF9 60%, #FFF7ED 100%)',
          borderRadius: '24px',
          border: '1.5px solid #FCD9C6',
          overflow: 'hidden',
          boxShadow: '0 8px 24px rgba(249, 115, 22, 0.05)',
        }}
      >
        {/* Node Tap Prompt Pill */}
        <div
          style={{
            position: 'absolute',
            top: 12,
            right: 12,
            zIndex: 10,
            background: 'rgba(255, 255, 255, 0.94)',
            backdropFilter: 'blur(8px)',
            border: '1px solid #FCD9C6',
            borderRadius: '999px',
            padding: '4px 12px',
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            fontSize: '11px',
            color: '#78716C',
            fontWeight: 700,
            boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
          }}
        >
          <span>👆</span>
          <span>Tap any pill for clinical deep-dive</span>
        </div>

        <svg
          role="img"
          aria-label="Case discussion connection map"
          width="100%"
          height="100%"
          viewBox={`0 0 ${width} ${height}`}
          style={{ overflow: 'visible' }}
        >
          <defs>
            <marker
              id="arrowhead"
              markerWidth="8"
              markerHeight="6"
              refX="14"
              refY="3"
              orient="auto"
            >
              <polygon points="0 0, 8 3, 0 6" fill="#CBD5E1" />
            </marker>
            <marker
              id="arrowhead-active"
              markerWidth="8"
              markerHeight="6"
              refX="14"
              refY="3"
              orient="auto"
            >
              <polygon points="0 0, 8 3, 0 6" fill="#F43F5E" />
            </marker>
            <linearGradient id="edge-flow-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#F43F5E" />
              <stop offset="50%" stopColor="#FB7185" />
              <stop offset="100%" stopColor="#F97316" />
            </linearGradient>
          </defs>

          {/* Edges */}
          {edges.map((edge) => {
            const isActive = activeEdges.includes(edge.id);
            const isFaded =
              !isActive &&
              (hoveredNode !== null ||
                selectedNodeId !== null ||
                hoveredEdge !== null ||
                filterSystem !== 'all');

            return (
              <g
                key={edge.id}
                onMouseEnter={() => setHoveredEdge(edge.id)}
                onMouseLeave={() => setHoveredEdge(null)}
                style={{ cursor: 'pointer', transition: 'all 0.3s' }}
                opacity={isFaded ? 0.08 : 1}
              >
                <path
                  d={getPath(edge.x1, edge.y1, edge.x2, edge.y2)}
                  fill="none"
                  stroke="transparent"
                  strokeWidth="20"
                />
                <motion.path
                  d={getPath(edge.x1, edge.y1, edge.x2, edge.y2)}
                  fill="none"
                  stroke={
                    isActive && (hoveredNode || selectedNodeId || hoveredEdge)
                      ? 'url(#edge-flow-gradient)'
                      : '#E2E8F0'
                  }
                  strokeWidth={isActive && (hoveredNode || selectedNodeId || hoveredEdge) ? 2.5 : 1.5}
                  strokeDasharray={edge.type === 'differential_overlap' ? '4 4' : 'none'}
                  markerEnd={
                    edge.type === 'causal_progression'
                      ? isActive && (hoveredNode || selectedNodeId || hoveredEdge)
                        ? 'url(#arrowhead-active)'
                        : 'url(#arrowhead)'
                      : 'none'
                  }
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.8, ease: 'easeInOut' }}
                />

                {isActive && hoveredEdge === edge.id && (
                  <foreignObject
                    x={(edge.x1 + edge.x2) / 2 - 80}
                    y={(edge.y1 + edge.y2) / 2 - 40}
                    width="160"
                    height="46"
                    style={{ pointerEvents: 'none', overflow: 'visible' }}
                  >
                    <motion.div
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      style={{
                        background: '#1C1917',
                        color: '#FFFFFF',
                        fontSize: '11px',
                        padding: '6px 10px',
                        borderRadius: '12px',
                        textAlign: 'center',
                        boxShadow: '0 6px 18px rgba(0,0,0,0.22)',
                        fontWeight: 700,
                        border: '1px solid #44403C',
                        lineHeight: 1.25,
                      }}
                    >
                      {edge.label}
                    </motion.div>
                  </foreignObject>
                )}
              </g>
            );
          })}

          {/* Central Diagnostic Hub Core Indicator */}
          <g transform={`translate(${cx}, ${cy})`}>
            <circle r={isMobile ? 14 : 16} fill="#FFF1F2" stroke="#FDA4AF" strokeWidth="2" />
            <foreignObject x="-9" y="-9" width="18" height="18" style={{ pointerEvents: 'none' }}>
              <HeartPulse size={18} color="#E11D48" />
            </foreignObject>
          </g>

          {/* Symptom and Condition Nodes */}
          {nodes.map((node) => {
            const isSelected = selectedNodeId === node.id;
            const isActive = activeNodes.includes(node.id);
            const isFaded =
              !isActive &&
              (hoveredNode !== null ||
                selectedNodeId !== null ||
                hoveredEdge !== null ||
                filterSystem !== 'all');

            if (node.type === 'symptom') {
              const icon = SYMPTOM_ICONS[node.id] || '🩺';
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
                      r={isMobile ? 24 : 28}
                      fill="none"
                      stroke="#F43F5E"
                      strokeWidth="2.5"
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: [1, 1.2, 1], opacity: [0.8, 0.4, 0.8] }}
                      transition={{ repeat: Infinity, duration: 1.8 }}
                    />
                  )}
                  <circle
                    r={isMobile ? 18 : 22}
                    fill={isSelected ? '#FFF1F2' : '#FFFFFF'}
                    stroke={isSelected ? '#F43F5E' : '#CBD5E1'}
                    strokeWidth={isSelected ? 2.5 : 1.8}
                    style={{ filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.06))' }}
                  />
                  <text
                    y="5"
                    textAnchor="middle"
                    fontSize={isMobile ? '13' : '15'}
                    style={{ pointerEvents: 'none', userSelect: 'none' }}
                  >
                    {icon}
                  </text>
                  {(isSelected || hoveredNode === node.id) && (
                    <text
                      y={isMobile ? 30 : 34}
                      textAnchor="middle"
                      fontSize="10.5"
                      fontWeight="800"
                      fill="#1C1917"
                    >
                      {node.label?.split(' ')[0]} {node.label?.split(' ')[1] || ''}
                    </text>
                  )}
                </g>
              );
            }

            // Condition Node - Capsule Pill
            const categoryConfig = CATEGORY_COLORS[node.category] || CATEGORY_COLORS.metabolic;
            const confidence = typeof node.confidence === 'number' ? node.confidence : 85;
            const hasPrecaution = (data.precautions || []).some((p: any) =>
              p?.relatedConditions?.includes(node.id)
            );
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
                    x={-pillWidth / 2 - 4}
                    y={-pillHeight / 2 - 4}
                    width={pillWidth + 8}
                    height={pillHeight + 8}
                    rx={pillRx + 4}
                    fill="none"
                    stroke="#F43F5E"
                    strokeWidth="2.5"
                    strokeDasharray="4 4"
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 15, ease: 'linear' }}
                  />
                )}

                {/* Capsule Pill Body */}
                <motion.rect
                  x={-pillWidth / 2}
                  y={-pillHeight / 2}
                  width={pillWidth}
                  height={pillHeight}
                  rx={pillRx}
                  fill={isSelected ? '#FFF1F2' : categoryConfig.bg}
                  stroke={isSelected ? '#F43F5E' : categoryConfig.border}
                  strokeWidth={isSelected ? 2.5 : 1.5}
                  initial={{ scale: 0 }}
                  animate={{ scale: (isActive && hoveredNode === node.id) || isSelected ? 1.05 : 1 }}
                  transition={{ type: 'spring', stiffness: 320, damping: 22 }}
                  style={{
                    filter: isSelected
                      ? 'drop-shadow(0 6px 16px rgba(244, 63, 94, 0.3))'
                      : 'drop-shadow(0 3px 8px rgba(0, 0, 0, 0.04))',
                  }}
                />

                {/* Status Dot */}
                <circle
                  cx={-pillWidth / 2 + 14}
                  cy="0"
                  r="3.5"
                  fill={categoryConfig.dot}
                />

                {/* Condition Name */}
                <text
                  x={2}
                  y={-2}
                  textAnchor="middle"
                  fontSize={isMobile ? '10.5' : '11.5'}
                  fontWeight="800"
                  fill="#1C1917"
                >
                  {nodeLabel.length > 17 ? nodeLabel.substring(0, 16) + '…' : nodeLabel}
                </text>

                {/* Confidence & Specialty Pill Tag */}
                <text
                  x={2}
                  y={11}
                  textAnchor="middle"
                  fontSize={isMobile ? '9' : '10'}
                  fontWeight="700"
                  fill={categoryConfig.text}
                >
                  {confidence}% • {node.specialty?.split(' ')[0] || 'Clinical'}
                </text>

                {/* Precaution Badge */}
                {hasPrecaution && (
                  <motion.g
                    transform={`translate(${pillWidth / 2 - 6}, ${-pillHeight / 2 + 4})`}
                    animate={{ scale: [1, 1.25, 1] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                  >
                    <circle r="7" fill="#EF4444" />
                    <text
                      y="3"
                      textAnchor="middle"
                      fontSize="9"
                      fontWeight="900"
                      fill="#FFFFFF"
                    >
                      !
                    </text>
                  </motion.g>
                )}
              </g>
            );
          })}
        </svg>

        {/* Legend */}
        <div
          style={{
            position: 'absolute',
            bottom: 12,
            left: 12,
            display: 'flex',
            gap: '8px',
            background: 'rgba(255, 255, 255, 0.94)',
            backdropFilter: 'blur(8px)',
            padding: '5px 12px',
            borderRadius: '999px',
            fontSize: '10.5px',
            fontWeight: 700,
            color: '#78716C',
            border: '1px solid #FCD9C6',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#F43F5E' }} />
            <span>Metabolic</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#D97706' }} />
            <span>Autonomic</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#0284C7' }} />
            <span>Kinetic/Neuro</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#059669' }} />
            <span>Enteric</span>
          </div>
        </div>
      </div>

      {/* Precautions & Doctor Questions */}
      {((data.precautions || []).length > 0 || (data.missingEvidence || []).length > 0) && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
            gap: '12px',
          }}
        >
          {(data.precautions || []).length > 0 && (
            <div
              style={{
                padding: '14px 16px',
                background: '#FFF1F2',
                borderRadius: '18px',
                border: '1.5px solid #FECDD3',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  color: '#BE123C',
                  fontWeight: 800,
                  fontSize: '13px',
                  marginBottom: '8px',
                }}
              >
                <AlertTriangle size={16} /> Red Flags & Safety Precautions
              </div>
              <ul
                style={{
                  margin: 0,
                  paddingLeft: '18px',
                  color: '#9F1239',
                  fontSize: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                }}
              >
                {(data.precautions || []).map((p: any, i: number) => (
                  <li key={i}>{typeof p === 'string' ? p : p?.text || JSON.stringify(p)}</li>
                ))}
              </ul>
            </div>
          )}
          {(data.missingEvidence || []).length > 0 && (
            <div
              style={{
                padding: '14px 16px',
                background: '#F0FDF4',
                borderRadius: '18px',
                border: '1.5px solid #BBF7D0',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  color: '#15803D',
                  fontWeight: 800,
                  fontSize: '13px',
                  marginBottom: '8px',
                }}
              >
                <HelpCircle size={16} /> Key Confirmatory Questions for Doctor
              </div>
              <ul
                style={{
                  margin: 0,
                  paddingLeft: '18px',
                  color: '#166534',
                  fontSize: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                }}
              >
                {(data.missingEvidence || []).map((e: any, i: number) => (
                  <li key={i}>
                    <strong>{typeof e === 'string' ? e : e?.test}</strong>{' '}
                    {e?.urgency && (
                      <span style={{ color: '#15803D', opacity: 0.8, fontSize: '11px', marginLeft: '4px' }}>
                        ({e.urgency})
                      </span>
                    )}
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

