import React, { useState } from 'react';
import {
  Activity,
  ArrowRight,
  BookOpen,
  Compass,
  GitBranch,
  HelpCircle,
  Search,
  Sparkles,
} from 'lucide-react';
import type { GutEvidence, GutQuestionThread } from '../../services/GutResolutionService';
import './GutExplorer.css';
interface Props {
  thread: GutQuestionThread;
  evidence: GutEvidence | null;
  stale: boolean;
  onNavigate: (view: 'answer' | 'evidence' | 'research' | 'next' | 'tools') => void;
  onSource: (id: string) => void;
}
export const GutConnectionMap: React.FC<Props> = ({
  thread,
  evidence,
  stale,
  onNavigate,
  onSource,
}) => {
  const [selected, setSelected] = useState('personal');
  const synthesis = stale ? null : thread.gutSynthesis;
  const nodes = [
    {
      id: 'personal',
      title: 'Your information',
      icon: Activity,
      tone: 'mint',
      status: 'REPORTED',
      text:
        synthesis?.personalReading ||
        `${evidence?.occasions.length || 0} matching meal records. Your question is a starting point too.`,
      detail: evidence
        ? `${evidence.support} with symptoms · ${evidence.tension} without · ${evidence.unknown} unknown or disputed. Only explicit reports count.`
        : 'No linked meal comparison yet. You can still ask and explore.',
      sources: synthesis?.personalSourceIds || ['question:current'],
      action: 'Inspect my records',
      view: 'evidence' as const,
    },
    {
      id: 'research',
      title: 'General research',
      icon: BookOpen,
      tone: 'blue',
      status: 'SOURCE CONTEXT',
      text:
        synthesis?.researchReading || 'Explore published guidance and studies for this question.',
      detail: 'Studies describe groups. Their findings may not explain your own symptoms.',
      sources: synthesis?.researchSourceIds || [],
      action: 'Explore the research',
      view: 'research' as const,
    },
    {
      id: 'unknown',
      title: 'What could change this?',
      icon: HelpCircle,
      tone: 'amber',
      status: 'STILL OPEN',
      text:
        synthesis?.followUpQuestion ||
        synthesis?.uncertainties[0] ||
        'Which missing detail would change the interpretation?',
      detail:
        synthesis?.uncertainties.join(' ') ||
        'Missing information stays unknown. A line on this map shows relevance, not a proven cause.',
      sources: [] as string[],
      action: synthesis?.followUpQuestion ? 'Reply to this question' : 'Explore other angles',
      view: synthesis?.followUpQuestion ? ('answer' as const) : ('tools' as const),
    },
    {
      id: 'next',
      title: 'Your next step',
      icon: Compass,
      tone: 'violet',
      status: thread.selectedStep ? 'YOUR CHOICE' : 'POSSIBLE NEXT STEP',
      text:
        thread.selectedStep ||
        synthesis?.nextReason ||
        'Get an explanation, inspect a source, or prepare a care question.',
      detail: thread.reflection
        ? `Your follow-up: ${thread.reflection}`
        : 'Choose what would actually help. Come back when something changes.',
      sources: [] as string[],
      action: 'Choose my next step',
      view: 'next' as const,
    },
  ];
  const active = nodes.find((item) => item.id === selected) || nodes[0];
  return (
    <section className="gx-map" aria-label="Interactive connection map">
      <div className="gx-section-heading">
        <div>
          <span className="gx-eyebrow">
            <GitBranch size={14} /> FOLLOW THE CONNECTIONS
          </span>
          <h3>Your question, connected</h3>
          <p>Select a branch to inspect what it adds.</p>
        </div>
        <span className="gx-map-legend">Connections ≠ causes</span>
      </div>
      <div className="gx-map-canvas">
        <div className="gx-map-root">
          <span className="gx-orb">
            <Search size={20} />
          </span>
          <div>
            <small>YOUR QUESTION</small>
            <strong>{thread.question}</strong>
          </div>
        </div>
        <div className="gx-map-branches">
          {nodes.map((node) => (
            <button
              type="button"
              key={node.id}
              className={`gx-map-node gx-tone-${node.tone}`}
              aria-pressed={selected === node.id}
              aria-controls="gx-map-inspector"
              onClick={() => {
                setSelected(node.id);
                requestAnimationFrame(() =>
                  document
                    .getElementById('gx-map-inspector')
                    ?.scrollIntoView({ block: 'nearest', behavior: 'auto' })
                );
              }}
            >
              <span className="gx-map-node-top">
                <span className="gx-orb">
                  <node.icon size={18} />
                </span>
                <small>{node.status}</small>
              </span>
              <strong>{node.title}</strong>
              <p>{node.text}</p>
              <span className="gx-map-inspect">
                {selected === node.id ? 'Selected' : 'Inspect connection'} <ArrowRight size={14} />
              </span>
            </button>
          ))}
        </div>
      </div>
      <div
        className={`gx-map-inspector gx-tone-${active.tone}`}
        id="gx-map-inspector"
        role="region"
        aria-label={`${active.title} details`}
      >
        <div>
          <span className="gx-eyebrow">{active.status}</span>
          <h4>{active.title}</h4>
          <p>{active.text}</p>
          <p className="gx-muted">{active.detail}</p>
          {active.sources.length > 0 && (
            <div className="gx-source-pills">
              {active.sources.map((id, index) => (
                <button type="button" key={id} onClick={() => onSource(id)}>
                  {id.startsWith('question:')
                    ? 'Your original question'
                    : id.startsWith('clarification:')
                      ? 'Your reply'
                      : id.startsWith('paper:')
                        ? `Study · ${id.slice(6)}`
                        : id.startsWith('guide:')
                          ? 'Published guidance'
                          : `Source ${index + 1}`}{' '}
                  <ArrowRight size={12} />
                </button>
              ))}
            </div>
          )}
        </div>
        <button type="button" className="gx-primary" onClick={() => onNavigate(active.view)}>
          {active.action} <ArrowRight size={16} />
        </button>
      </div>
      <div className="gx-map-bottom">
        <Sparkles size={15} />
        <span>
          {stale
            ? 'Your records changed. Update the answer to reconnect its interpretation.'
            : 'Open a source to see the original information behind a connection.'}
        </span>
        <button type="button" onClick={() => onNavigate('answer')}>
          {synthesis ? 'Read my answer' : 'Answer with Gemini'} <ArrowRight size={14} />
        </button>
      </div>
    </section>
  );
};
