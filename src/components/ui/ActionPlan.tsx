import React, { useState, useEffect } from 'react';
import { ShieldCheck, Target, Zap, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { getRunScope } from '../../services/RunContext';

export default function ActionPlan({ analysis }) {
  const [tasks, setTasks] = useState<any[]>([]);
  const planKey = getRunScope('mdt', 'draft', 'action-plan');

  useEffect(() => {
    if (analysis) {
      const storedTasks = localStorage.getItem(planKey);
      if (storedTasks) {
        try { setTasks(JSON.parse(storedTasks)); } catch { /* ignore */ }
      } else if (analysis.what_to_do || analysis.this_week_tasks) {
        const rawTasks = Array.isArray(analysis.what_to_do) 
          ? analysis.what_to_do 
          : Array.isArray(analysis.this_week_tasks) 
            ? analysis.this_week_tasks.map((t) => ({ step: t, cost: '' })) 
            : [];
        const initialTasks = rawTasks.map((t, idx) => ({
          id: idx,
          text: typeof t === 'string' ? t : t?.step || t?.title || t?.text || 'Checklist item',
          cost: typeof t === 'object' && t !== null ? t?.cost || '' : '',
          completed: false,
        }));
        setTasks(initialTasks);
        try { localStorage.setItem(planKey, JSON.stringify(initialTasks)); } catch(e) {}
      }
    }
  }, [analysis, planKey]);
  const toggleTask = (id) => {
    const updated = tasks.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t));
    setTasks(updated);
    try { localStorage.setItem(planKey, JSON.stringify(updated)); } catch(e) {}
  };

  if (!analysis) return null;

  const completedCount = tasks.filter((t) => t.completed).length;
  const progress = tasks.length === 0 ? 0 : Math.round((completedCount / tasks.length) * 100);

  return (
    <div
      style={{
        marginTop: '32px',
        width: '100%',
        background: 'var(--surface)',
        padding: '24px',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border)',
      }}
    >
      <div style={{ marginBottom: '24px' }}>
        <h2
          style={{
            fontSize: '20px',
            color: 'var(--text-main)',
            margin: '0 0 8px 0',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <Target color="var(--teal)" /> Discussion Checklist
        </h2>
        <p className="text-gray text-sm" style={{ margin: 0 }}>
          Questions and practical follow-ups to review with a qualified clinician. This is not a diagnosis or treatment plan.
        </p>
      </div>

      {/* Summary Card */}
      <div className="card mb-6">
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: '16px',
          }}
        >
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>
              AI relevance signal
            </div>
            <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--teal)' }}>
              {analysis.match_percentage}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>
              Perspective to discuss
            </div>
            <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-main)' }}>
              {analysis.specialist}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>
              Care context
            </div>
            <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-main)' }}>
              {analysis.specialist || 'Discuss with clinician'}
            </div>
          </div>
        </div>
      </div>

      {/* Action Steps */}
      <div className="mb-6">
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px',
          }}
        >
          <h3
            style={{
              fontSize: '16px',
              color: 'var(--text-main)',
              margin: 0,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <ShieldCheck size={18} color="var(--teal)" /> Checklist
          </h3>
          <span className="text-xs font-bold" style={{ color: 'var(--teal)' }}>
            {progress}% Complete
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '24px', marginBottom: '24px' }}>
          <div style={{ width: '80px', height: '80px', position: 'relative' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={[
                    { name: 'Completed', value: completedCount },
                    { name: 'Remaining', value: Math.max(0, tasks.length - completedCount) }
                  ]}
                  innerRadius={25}
                  outerRadius={35}
                  startAngle={90}
                  endAngle={-270}
                  dataKey="value"
                  stroke="none"
                >
                  <Cell fill="var(--teal)" />
                  <Cell fill="var(--surface-hover)" />
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              fontSize: '14px',
              fontWeight: 'bold',
              color: 'var(--teal)'
            }}>
              {progress}%
            </div>
          </div>
          
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px' }}>
              {completedCount} of {tasks.length} tasks completed
            </div>
            <div
              style={{
                width: '100%',
                height: '6px',
                background: 'var(--surface-hover)',
                borderRadius: '3px',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${progress}%`,
                  height: '100%',
                  background: 'var(--teal)',
                  transition: 'width 0.3s ease',
                  boxShadow: 'var(--shadow-neon)',
                }}
              />
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {tasks.map((task) => (
            <button
              key={task.id}
              onClick={() => toggleTask(task.id)}
              className="card"
              style={{
                width: '100%',
                textAlign: 'left',
                padding: '16px 20px',
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                cursor: 'pointer',
                border: task.completed ? '1px solid var(--teal)' : '1px solid var(--border)',
                background: task.completed ? 'var(--teal-light)' : 'var(--surface)',
                transition: 'var(--transition)',
              }}
            >
              <div
                style={{
                  width: '22px',
                  height: '22px',
                  borderRadius: '50%',
                  border: task.completed ? 'none' : '2px solid var(--text-muted)',
                  background: task.completed ? 'var(--teal)' : 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                {task.completed && <ShieldCheck size={14} color="#000" />}
              </div>
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    color: task.completed ? 'var(--text-muted)' : 'var(--text-main)',
                    fontWeight: task.completed ? 500 : 600,
                    textDecoration: task.completed ? 'line-through' : 'none',
                    opacity: task.completed ? 0.7 : 1,
                  }}
                >
                  {task.text}
                </div>
              </div>
              {task.cost && (
                <div
                  className="badge"
                  style={{
                    background: 'var(--surface-hover)',
                    color: 'var(--text-muted)',
                    border: '1px solid var(--border)',
                  }}
                >
                  {task.cost}
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Do / Don't */}
      {(analysis.do || analysis.dont) && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '16px',
            marginTop: '24px',
          }}
        >
          {analysis.do && (
            <div
              className="card"
              style={{
                padding: '16px',
                borderLeft: '4px solid var(--green)',
                background: 'var(--green-light)',
              }}
            >
              <div
                style={{
                  fontSize: '11px',
                  color: 'var(--green)',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  marginBottom: '8px',
                }}
              >
                ✓ Do
              </div>
              <p className="text-sm" style={{ margin: 0, color: 'var(--text-main)' }}>
                {analysis.do}
              </p>
            </div>
          )}
          {analysis.dont && (
            <div
              className="card"
              style={{
                padding: '16px',
                borderLeft: '4px solid var(--red)',
                background: 'var(--red-light)',
              }}
            >
              <div
                style={{
                  fontSize: '11px',
                  color: 'var(--red)',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  marginBottom: '8px',
                }}
              >
                ✗ Don't
              </div>
              <p className="text-sm" style={{ margin: 0, color: 'var(--text-main)' }}>
                {analysis.dont}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
