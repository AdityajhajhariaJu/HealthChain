import React from 'react';
import { ArrowRight, BookOpen } from 'lucide-react';
import type { GutResearchPaper, GutResearchTopic } from '../../services/GutResearchService';
import type { GutQuestionThread } from '../../services/GutResolutionService';
import { buildGutStudyBridge } from '../../services/GutStudyBridgeService';

export const GutStudyBridge: React.FC<{ paper: GutResearchPaper; thread: GutQuestionThread; topic: GutResearchTopic }> = ({ paper, thread, topic }) => {
  const planks = buildGutStudyBridge(paper, thread, topic);
  return <details className="gr-study-bridge"><summary><BookOpen size={16} /> Study bridge: what was checked?</summary><p>This metadata check shows what can and cannot be verified before applying a paper to your question. It is not a finding or recommendation.</p><div className="gr-study-planks">{planks.map((plank) => <div key={plank.field} className={`gr-study-plank gr-study-${plank.state}`}><strong>{plank.field}</strong><span>Study: {plank.sourceText}</span><span>Your question: {plank.personalQuestion}</span><small>{plank.explanation}</small></div>)}</div><a href={paper.url} target="_blank" rel="noopener noreferrer">Inspect original source · PMID {paper.id} <ArrowRight size={14} /></a><small>Only title/index metadata is checked here. Result and limitation claims require independent review with exact source spans.</small></details>;
};
