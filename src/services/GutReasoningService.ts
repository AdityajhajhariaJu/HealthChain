import { parseModelJson } from './modelJson';
import type { GutIntent, GutSymptom, GutSynthesis } from './GutResolutionService';
import type { GutResearchPaper, GutResearchTopic } from './GutResearchService';
import type { GutEvidence } from './GutResolutionService';
import type { GutQuestionThread } from './GutResolutionService';
import { fetchGutReasoning } from './geminiService';

export interface GutReasoningInput {
  thread: Pick<GutQuestionThread, 'question' | 'intent' | 'symptom' | 'focus' | 'symptomOnset' | 'researchConcept'>;
  evidence: GutEvidence | null;
  papers: GutResearchPaper[];
  topic: GutResearchTopic;
  contextRecords: Array<{ id: string; kind: string; label: string; date: string; timing: string; sourceKind?: 'observation' | 'daily_digest' }>;
  contextFingerprint: string;
}

export interface GutReasoningSource {
  id: string;
  title: string;
  kind: 'meal' | 'report' | 'context' | 'paper';
  sourceKind?: 'diet_meal' | 'observation' | 'daily_digest';
  sourceId?: string;
  localDate?: string;
  url?: string;
}

export interface GutReasoningResult extends GutSynthesis {
  sources: GutReasoningSource[];
}

/** Local freshness marker only; it contains no user text or account identifier. */
export function gutSynthesisFingerprint(thread: Pick<GutQuestionThread, 'question' | 'symptom' | 'focus' | 'symptomOnset' | 'researchConcept'>, evidence: GutEvidence | null, contextFingerprint = '', researchTopic = ''): string {
  const source = `${evidence?.fingerprint || 'no-linked-records'}|${thread.symptom}|${thread.focus.trim().toLocaleLowerCase()}|${thread.question.trim().toLocaleLowerCase()}|${thread.researchConcept || ''}|${thread.symptomOnset?.occurredAt || 'onset-unknown'}|${thread.symptomOnset?.precision || 'unknown'}|${contextFingerprint}|${researchTopic}`;
  let hash = 2166136261;
  for (let index = 0; index < source.length; index += 1) hash = Math.imul(hash ^ source.charCodeAt(index), 16777619);
  return `gut-v1-${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

const text = (value: unknown, max: number) => typeof value === 'string' ? value.replace(/\s+/g, ' ').trim().slice(0, max) : '';
const list = (value: unknown, maxItems: number, maxText: number) => Array.isArray(value)
  ? value.map((item) => text(item, maxText)).filter(Boolean).slice(0, maxItems)
  : [];

/**
 * Gemini interprets only the exact records and papers passed by the user. Record
 * identity, counts, time meaning, and all source links remain app-derived.
 */
export async function reasonOverGutEvidence(input: GutReasoningInput): Promise<GutReasoningResult> {
  const sources: GutReasoningSource[] = [];
  const records = (input.evidence?.occasions || []).slice(0, 12).map((occasion) => {
    const mealId = `meal:${occasion.meal.id}`;
    sources.push({ id: mealId, title: `${occasion.meal.name} · ${occasion.meal.date}`, kind: 'meal', sourceKind: occasion.meal.sourceKind || 'diet_meal', sourceId: occasion.meal.id, localDate: occasion.meal.date });
    const sourceIds = [mealId];
    for (const answerSource of occasion.edge.answerSources.slice(0, 3)) {
      const id = `report:${answerSource.id}`;
      if (!sources.some((source) => source.id === id)) {
        sources.push({ id, title: `${answerSource.kind === 'gut_report' ? 'Gut report' : 'Diet reaction'} · ${occasion.meal.date}`, kind: 'report', sourceKind: answerSource.kind === 'gut_report' ? 'observation' : (occasion.meal.sourceKind || 'diet_meal'), sourceId: answerSource.kind === 'gut_report' ? answerSource.id : occasion.meal.id, localDate: occasion.meal.date });
      }
      sourceIds.push(id);
    }
    const sameDateContext = occasion.alternativeContext.slice(0, 4).flatMap((item) => {
      if (item.kind === 'other_meal_same_date') {
        const relatedMeal = occasion.otherMeals.find((meal) => meal.id === item.sourceId);
        if (!relatedMeal) return [];
        const id = `meal:${relatedMeal.id}`;
        if (!sources.some((source) => source.id === id)) sources.push({ id, title: `${relatedMeal.name} · ${relatedMeal.date}`, kind: 'meal', sourceKind: relatedMeal.sourceKind || 'diet_meal', sourceId: relatedMeal.id, localDate: relatedMeal.date });
        sourceIds.push(id);
        return [{ id, type: 'other meal', title: relatedMeal.name, date: relatedMeal.date, timing: relatedMeal.time || 'not recorded', relation: 'recorded on the same date; meal order is not established' }];
      }
      const id = `context:${item.sourceId}`;
      if (!sources.some((source) => source.id === id)) sources.push({ id, title: `${item.contextType || 'Other'} context · ${occasion.meal.date}`, kind: 'context', sourceKind: 'observation', sourceId: item.sourceId, localDate: occasion.meal.date });
      sourceIds.push(id);
      return [{ id, type: item.contextType || 'other', title: item.label, date: occasion.meal.date, timing: item.timePrecision.replace('_', ' '), relation: 'same-date context; sequence is not established' }];
    });
    return {
      mealName: occasion.meal.name,
      date: occasion.meal.date,
      time: occasion.meal.time || 'not recorded',
      timePrecision: occasion.meal.timePrecision || 'unknown',
      outcome: occasion.answerOrigin === 'conflict' ? 'conflicting reports; unresolved' : occasion.answer === 'yes' ? `${input.thread.symptom} explicitly reported` : occasion.answer === 'no' ? `explicitly reported without ${input.thread.symptom}` : 'unknown; no symptom-specific answer',
      inclusionRule: occasion.edge.inclusionRule,
      sourceIds,
      sameDateContext,
    };
  });

  const contextRecords = input.contextRecords.slice(0, 8).map((record) => {
    const id = `context:${record.id}`;
    if (!sources.some((source) => source.id === id)) sources.push({ id, title: `${record.kind} · ${record.date}`, kind: 'context', sourceKind: record.sourceKind || 'observation', sourceId: record.id, localDate: record.date });
    return { id, type: record.kind, date: record.date, timing: record.timing, label: record.label.slice(0, 120) };
  });

  const papers = input.papers.slice(0, 6).map((paper) => {
    const id = `paper:${paper.id}`;
    sources.push({ id, title: paper.title, kind: 'paper', url: paper.url });
    return {
      id,
      title: paper.title.slice(0, 420),
      publicationYear: paper.year,
      journal: paper.journal,
      publicationTypes: paper.publicationTypes.slice(0, 3),
      correctionNotice: paper.correctionNotice,
      abstractExcerpt: (paper.abstract || 'Abstract unavailable.').slice(0, 1700),
    };
  });

  const counts = {
    explicitlyReportedWith: input.evidence?.support ?? 0,
    explicitlyReportedWithout: input.evidence?.tension ?? 0,
    unknownOrConflicting: input.evidence?.unknown ?? 0,
    conflictingSources: input.evidence?.conflicts ?? 0,
    matchedMealNames: input.evidence?.occasions.length ?? 0,
  };
  const payload = {
    question: text(input.thread.question, 500),
    intent: input.thread.intent as GutIntent,
    symptom: input.thread.symptom as GutSymptom,
    selectedMealPhrase: text(input.thread.focus, 120) || 'not selected',
    deterministicRecordCounts: counts,
    personalRecords: records,
    nearbyContext: contextRecords,
    researchTopic: input.topic,
    confirmedResearchConcept: input.thread.researchConcept || '',
    retrievedResearch: papers,
    allowedSourceIds: sources.map((source) => source.id),
  };
  const raw = await fetchGutReasoning(payload);
  const parsed = parseModelJson<Record<string, unknown>>(raw, null);
  if (!parsed) throw new Error('Gut reasoning returned an unreadable answer. Please try again.');

  const allowedPersonal = new Set(sources.filter((source) => source.kind === 'meal' || source.kind === 'report').map((source) => source.id));
  const allowedResearch = new Set(sources.filter((source) => source.kind === 'paper').map((source) => source.id));
  const personalSourceIds = [...new Set((input.evidence?.occasions || []).flatMap((occasion) => [
    `meal:${occasion.meal.id}`,
    ...occasion.edge.answerSources.map((source) => `report:${source.id}`),
  ]))].filter((id) => allowedPersonal.has(id)).slice(0, 16);
  const researchSourceIds = list(parsed.researchSourceIds, 8, 180).filter((id) => allowedResearch.has(id));
  const validActions = ['review_records', 'open_research', 'add_report', 'prepare_care_question', 'leave_open'] as const;
  const nextAction = validActions.includes(parsed.nextAction as typeof validActions[number]) ? parsed.nextAction as typeof validActions[number] : 'leave_open';
  const headline = counts.conflictingSources > 0 || (counts.explicitlyReportedWith > 0 && counts.explicitlyReportedWithout > 0)
    ? 'Your saved reports are mixed'
    : counts.explicitlyReportedWith > 0
      ? `${counts.explicitlyReportedWith} report${counts.explicitlyReportedWith === 1 ? '' : 's'} recorded with this symptom`
      : counts.explicitlyReportedWithout > 0
        ? `${counts.explicitlyReportedWithout} report${counts.explicitlyReportedWithout === 1 ? '' : 's'} recorded without this symptom`
        : 'This question remains open';
  const matchedCount = input.evidence?.occasions.length ?? 0;
  const proposedQuote = text(parsed.researchQuote, 220);
  const quoteWords = proposedQuote.split(/\s+/).filter(Boolean).length;
  const quotedPaper = quoteWords > 0 && quoteWords <= 20 ? papers.find((paper) => researchSourceIds.includes(paper.id) && paper.abstractExcerpt.replace(/\s+/g, ' ').includes(proposedQuote)) : undefined;
  const anchoredResearchIds = quotedPaper ? [quotedPaper.id] : [];
  const connectionReading = matchedCount === 0
    ? 'No saved meal and symptom reports matched this question. That is missing information, not evidence that symptoms were absent.'
    : `${matchedCount} saved meal record${matchedCount === 1 ? '' : 's'} matched. The record counts show ${counts.explicitlyReportedWith} explicitly reported with, ${counts.explicitlyReportedWithout} without, and ${counts.unknownOrConflicting} unknown or disputed. These observations do not show that a meal caused or prevented a symptom.`;
  if (!headline || !connectionReading) throw new Error('Gut reasoning did not return a complete, readable brief. Please try again.');

  return {
    at: new Date().toISOString(),
    promptVersion: 'gut-reading-v1',
    evidenceFingerprint: gutSynthesisFingerprint(input.thread, input.evidence, input.contextFingerprint, input.topic),
    researchTopic: input.topic,
    researchIds: input.papers.slice(0, 6).map((paper) => paper.id),
    headline,
    personalReading: matchedCount === 0
      ? 'No symptom-specific meal report is linked to this question yet. Your question remains open; an absent record is not a symptom-free report.'
      : `${matchedCount} matching saved meal record${matchedCount === 1 ? '' : 's'}: ${counts.explicitlyReportedWith} explicitly reported with this symptom, ${counts.explicitlyReportedWithout} explicitly reported without it, and ${counts.unknownOrConflicting} unknown or disputed. Inspect the linked records before acting on this pattern.`,
    personalSourceIds,
    researchReading: quotedPaper
      ? `One retrieved abstract states: “${proposedQuote}” This is a finding about that study's participants, not a conclusion about your symptoms.`
      : papers.length === 0
        ? 'No paper was retrieved for this question, so there is no source-backed research summary to show.'
        : 'No exact source passage was verified for a research summary. Open the original studies to inspect them.',
    researchSourceIds: anchoredResearchIds,
    connectionReading,
    uncertainties: [
      ...(counts.conflictingSources > 0 ? ['Some saved reports disagree; their outcome is unresolved.'] : []),
      ...(counts.unknownOrConflicting > 0 ? ['An unreported outcome is not a symptom-free occasion.'] : []),
      ...(contextRecords.length > 0 ? ['Nearby records do not establish what happened first.'] : []),
    ].slice(0, 3),
    nextAction,
    nextReason: ({
      review_records: 'Check that each linked report describes the occasion you meant.',
      open_research: 'Inspect the cited study’s population, methods, and measured outcome.',
      add_report: 'Add a remembered report only if you know what happened; leave uncertain timing unknown.',
      prepare_care_question: 'A qualified clinician can help assess possible explanations and urgency.',
      leave_open: 'The available evidence is incomplete; no extra tracking is needed unless it would help you.',
    } as const)[nextAction],
    sources,
  };
}
