import React from 'react';
import { motion } from 'framer-motion';
import { Activity, GitBranch } from 'lucide-react';

export default function InvestigationBoard({ analysis }) {
  if (!analysis) return null;

  return (
    <div style={{ marginTop: '24px', width: '100%' }}>
      {/* Title */}
      <div style={{ marginBottom: '24px' }}>
        <div className="badge badge-teal mb-4">
          <GitBranch size={12} /> Diagnostic Chain Built
        </div>
        <h1
          style={{
            fontSize: '24px',
            color: 'var(--text-main)',
            margin: '0 0 8px 0',
            lineHeight: '1.3',
          }}
        >
          {analysis.chain_name}
        </h1>
        <p style={{ fontSize: '15px', color: 'var(--text-muted)', margin: 0 }}>
          Your personalized diagnosis chain — one root cause traced to every downstream symptom.
        </p>
      </div>

      {/* Normal Terms Explanation */}
      {analysis.normal_terms_explanation && (
        <div
          style={{
            marginBottom: '40px',
            padding: '16px 20px',
            background: 'var(--surface-hover)',
            borderRadius: 'var(--radius-lg)',
            borderLeft: '4px solid var(--teal)',
          }}
        >
          <p style={{ color: 'var(--text-main)', fontSize: '15px', lineHeight: 1.6, margin: 0 }}>
            {analysis.normal_terms_explanation}
          </p>
        </div>
      )}

      {/* Flowchart - The Detective Case Board */}
      {analysis.flowchart && (
        <div style={{ marginBottom: '48px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
            <div style={{ background: 'var(--teal-light)', padding: '8px', borderRadius: '8px' }}>
              <Activity size={20} color="var(--teal)" />
            </div>
            <div>
              <h2
                style={{ color: 'var(--text-main)', margin: 0, fontSize: '18px', fontWeight: 600 }}
              >
                The Investigation Board
              </h2>
              <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '13px' }}>
                How your symptoms are connected
              </p>
            </div>
          </div>

          <div
            style={{
              position: 'relative',
              zIndex: 0,
              background: 'var(--surface)',
              padding: '60px 20px',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-strong)',
              boxShadow: 'var(--shadow-sm)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
          >
            {/* SVG Connecting Lines Background */}
            <svg
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                pointerEvents: 'none',
                zIndex: 0,
              }}
            >
              {/* Root to Mechanism Line */}
              <motion.line
                x1="50%"
                y1="90"
                x2="50%"
                y2="180"
                stroke="var(--teal)"
                strokeWidth="2"
                strokeDasharray="4 4"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 0.5 }}
                transition={{ duration: 1, delay: 0.5 }}
              />
              {/* Mechanism to Symptoms Line (Trunk) */}
              <motion.line
                x1="50%"
                y1="260"
                x2="50%"
                y2="300"
                stroke="var(--teal)"
                strokeWidth="2"
                strokeDasharray="4 4"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 0.5 }}
                transition={{ duration: 0.5, delay: 1.5 }}
              />
              {/* Mechanism to Symptoms (Branches) */}
              <motion.path
                d={`M 20% 300 L 80% 300`}
                stroke="var(--teal)"
                strokeWidth="2"
                strokeDasharray="4 4"
                fill="none"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 0.5 }}
                transition={{ duration: 1, delay: 2 }}
              />
            </svg>

            {/* Root Cause Node */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', bounce: 0.5 }}
              style={{
                position: 'relative',
                zIndex: 1,
                padding: '16px 24px',
                border: '1px solid var(--teal)',
                borderRadius: 'var(--radius-lg)',
                background: 'rgba(5, 150, 105, 0.1)',
                textAlign: 'center',
                width: '100%',
                maxWidth: '320px',
                boxShadow: '0 0 20px rgba(5, 150, 105, 0.2)',
              }}
            >
              <div
                style={{
                  fontSize: '11px',
                  color: 'var(--teal)',
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  marginBottom: '4px',
                  fontWeight: 700,
                }}
              >
                Root Cause
              </div>
              <div style={{ fontWeight: '700', color: 'var(--teal-mid)', fontSize: '18px' }}>
                {analysis.flowchart.root}
              </div>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
                {analysis.flowchart.root_sub}
              </div>
            </motion.div>

            <div style={{ height: '70px' }} />

            {/* Mechanism Node */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', bounce: 0.5, delay: 1 }}
              style={{
                position: 'relative',
                zIndex: 1,
                padding: '14px 24px',
                border: '1px solid var(--border-strong)',
                borderRadius: 'var(--radius-lg)',
                background: 'var(--surface-hover)',
                textAlign: 'center',
                width: '100%',
                maxWidth: '280px',
              }}
            >
              <div
                style={{
                  fontSize: '11px',
                  color: 'var(--text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  marginBottom: '4px',
                  fontWeight: 600,
                }}
              >
                Mechanism
              </div>
              <div style={{ fontWeight: '600', color: 'var(--text-main)', fontSize: '15px' }}>
                {analysis.flowchart.mechanism}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                {analysis.flowchart.mechanism_sub}
              </div>
            </motion.div>

            <div style={{ height: '70px' }} />

            {/* Symptom Leaves */}
            <div
              style={{
                position: 'relative',
                zIndex: 1,
                display: 'flex',
                gap: '16px',
                justifyContent: 'center',
                flexWrap: 'wrap',
                width: '100%',
                padding: '0 20px',
              }}
            >
              {(analysis.flowchart.symptoms || []).map((s, i) => (
                <motion.div
                  key={s.name || i}
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ type: 'spring', bounce: 0.4, delay: 2.5 + i * 0.1 }}
                  style={{
                    padding: '14px 16px',
                    border: '1px solid #fca5a5',
                    borderRadius: 'var(--radius-lg)',
                    background: 'rgba(220, 38, 38, 0.05)',
                    textAlign: 'center',
                    minWidth: '130px',
                    flex: 1,
                    maxWidth: '200px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                  }}
                >
                  <div style={{ fontWeight: '600', color: 'var(--red)', fontSize: '15px' }}>
                    {s.name}
                  </div>
                  <div
                    style={{ fontSize: '12px', color: '#dc2626', marginTop: '4px', opacity: 0.8 }}
                  >
                    {s.sub}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
