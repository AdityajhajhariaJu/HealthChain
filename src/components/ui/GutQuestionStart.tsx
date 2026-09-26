import React from 'react';
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  Compass,
  FileText,
  GitBranch,
  HeartHandshake,
  Search,
  Sparkles,
  Utensils,
} from 'lucide-react';
import type { GutIntent, GutSymptom } from '../../services/GutResolutionService';
import './GutExplorer.css';

const goals = [
  {
    id: 'understand',
    title: 'Find a connection',
    hint: 'Food, symptoms, patterns',
    icon: GitBranch,
    example: 'Is chai linked to my bloating?',
  },
  {
    id: 'now',
    title: 'Understand a symptom',
    hint: 'What is happening now',
    icon: HeartHandshake,
    example: 'My stomach hurts after lunch today',
  },
  {
    id: 'decide',
    title: 'Compare my options',
    hint: 'A meal or an upcoming choice',
    icon: Compass,
    example: 'Should I choose tea or coffee tomorrow?',
  },
  {
    id: 'care',
    title: 'Prepare for a visit',
    hint: 'A clearer question for care',
    icon: FileText,
    example: 'What should I ask about recurring bloating?',
  },
] as const;
interface Props {
  step: number;
  intent: GutIntent;
  question: string;
  symptom: GutSymptom;
  focus: string;
  symptoms: Array<{ id: GutSymptom; label: string; icon: React.ComponentType<{ size?: number }> }>;
  reviewFocus: string;
  reviewSymptom: GutSymptom;
  matches: number;
  researchLabel: string;
  busy: boolean;
  ai: boolean;
  error: string;
  onIntent: (value: GutIntent) => void;
  onQuestion: (value: string) => void;
  onSymptom: (value: GutSymptom) => void;
  onFocus: (value: string) => void;
  onPrepare: (ai: boolean) => void;
  onStart: (use: boolean) => void;
  onBack: () => void;
}
export const GutQuestionStart: React.FC<Props> = (props) => {
  const goal = goals.find((item) => item.id === props.intent) || goals[0];
  return (
    <section className="gx-start" aria-label="Start a Gut question">
      <div className="gx-progress">
        <ol aria-label="Your progress">
          {['Your question', 'Connect the details', 'Explore your answer'].map((label, index) => (
            <li
              key={label}
              aria-current={props.step === index + 1 ? 'step' : undefined}
              className={props.step >= index + 1 ? 'gx-progress-active' : ''}
            >
              <span>{props.step > index + 1 ? <Check size={12} /> : index + 1}</span>
              <b>{label}</b>
            </li>
          ))}
        </ol>
        <small>STEP {props.step} OF 3</small>
      </div>
      <div className="gx-start-heading">
        <span className="gx-eyebrow">
          <Sparkles size={14} /> YOUR GUT, CONNECTED
        </span>
        <h2>{props.step === 1 ? 'What would you like to understand?' : 'Does this look right?'}</h2>
        <p>
          {props.step === 1
            ? 'Ask a question. Follow the connections.'
            : 'These details guide your answer. Tap a field to change it.'}
        </p>
      </div>
      {props.step === 1 ? (
        <>
          <div className="gx-goals" aria-label="Choose your goal">
            {goals.map((item) => (
              <button
                type="button"
                key={item.id}
                aria-pressed={props.intent === item.id}
                onClick={() => props.onIntent(item.id)}
              >
                <span className={`gx-orb gx-orb-${item.id}`}>
                  <item.icon size={19} />
                </span>
                <span>
                  <strong>{item.title}</strong>
                  <small>{item.hint}</small>
                </span>
                {props.intent === item.id && <Check className="gx-goal-check" size={15} />}
              </button>
            ))}
          </div>
          <div className="gx-question-field">
            <label htmlFor="gr-question">Your question or situation</label>
            <div>
              <Search size={21} />
              <input
                id="gr-question"
                value={props.question}
                maxLength={500}
                onChange={(event) => props.onQuestion(event.target.value)}
                placeholder={goal.example}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && props.question.trim()) props.onPrepare(true);
                }}
              />
            </div>
          </div>
          <div className="gx-symptoms">
            <span>
              Focus on <small>optional</small>
            </span>
            <div>
              {props.symptoms
                .filter((item) => item.id !== 'unspecified')
                .map((item, index) => (
                  <button
                    type="button"
                    key={item.id}
                    aria-pressed={props.symptom === item.id}
                    onClick={() =>
                      props.onSymptom(props.symptom === item.id ? 'unspecified' : item.id)
                    }
                  >
                    <span className={`gx-symptom-orb gx-color-${index}`}>
                      <item.icon size={14} />
                    </span>
                    {item.label}
                  </button>
                ))}
            </div>
          </div>
          <button
            type="button"
            className="gx-example"
            onClick={() => props.onQuestion(goal.example)}
          >
            <Sparkles size={14} /> Try: {goal.example} <ArrowRight size={14} />
          </button>
          {props.error && (
            <p role="alert" className="gx-error">
              {props.error}
            </p>
          )}
          <div className="gx-start-footer">
            <div>
              <button
                type="button"
                className="gx-primary"
                disabled={!props.question.trim() || props.busy}
                onClick={() => props.onPrepare(true)}
              >
                {props.busy ? 'Connecting your question…' : 'Connect my question'}{' '}
                <ArrowRight size={17} />
              </button>
              <button
                type="button"
                className="gx-text-button"
                disabled={!props.question.trim() || props.busy}
                onClick={() => props.onPrepare(false)}
              >
                Explore without AI
              </button>
            </div>
            <small>
              Uses Gemini with your question, relevant records and source passages. No logs needed.
            </small>
          </div>
        </>
      ) : (
        <>
          <div className="gx-review-root">
            <span className="gx-orb">
              <Search size={20} />
            </span>
            <div>
              <small>YOUR QUESTION</small>
              <p>{props.question}</p>
            </div>
            <button type="button" className="gx-text-button" onClick={props.onBack}>
              Edit
            </button>
          </div>
          <div className="gx-review-branches">
            <div className="gx-review-node">
              <span className="gx-orb">
                <Utensils size={18} />
              </span>
              <label htmlFor="gx-focus">
                Food or situation
                <input
                  id="gx-focus"
                  aria-label="Food or situation"
                  maxLength={120}
                  value={props.focus}
                  onChange={(event) => props.onFocus(event.target.value)}
                  placeholder="No specific food"
                />
                <small>
                  {props.reviewFocus
                    ? `${props.matches} matching saved meals`
                    : 'You can explore without a food'}
                </small>
              </label>
            </div>
            <div className="gx-review-node">
              <span className="gx-orb gx-orb-now">
                <Activity size={18} />
              </span>
              <label htmlFor="gx-symptom">
                Symptom
                <select
                  id="gx-symptom"
                  aria-label="Symptom"
                  value={props.reviewSymptom}
                  onChange={(event) => props.onSymptom(event.target.value as GutSymptom)}
                >
                  {props.symptoms.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.label}
                    </option>
                  ))}
                </select>
                <small>A question focus, not a new health record</small>
              </label>
            </div>
          </div>
          <div className="gx-review-source">
            <BookOpen size={18} />
            <div>
              <strong>Research topic: {props.researchLabel}</strong>
              <span>
                General sources connect to your question. They cannot prove your personal cause.
              </span>
            </div>
          </div>
          {props.error && (
            <p role="alert" className="gx-error">
              {props.error}
            </p>
          )}
          <div className="gx-start-footer">
            <div>
              <button type="button" className="gx-text-button" onClick={props.onBack}>
                <ArrowLeft size={15} /> Back
              </button>
              <button
                type="button"
                className="gx-primary"
                disabled={props.busy}
                onClick={() => props.onStart(true)}
              >
                {props.busy
                  ? 'Opening…'
                  : props.ai
                    ? 'Explore my answer'
                    : 'Open my connection map'}{' '}
                <ArrowRight size={17} />
              </button>
            </div>
            <button
              type="button"
              className="gx-text-button"
              disabled={props.busy}
              onClick={() => props.onStart(false)}
            >
              Use only my question
            </button>
          </div>
        </>
      )}
    </section>
  );
};
