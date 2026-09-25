import type { GutBacktraceProjection, GutEvidence, GutQuestionThread, GutSymptom } from './GutResolutionService';

export type GutDossierLane = 'observed' | 'challenges' | 'context' | 'research';
export interface GutDossierLink {
  id: string;
  lane: GutDossierLane;
  relation: 'explicit_with' | 'explicit_without' | 'unresolved' | 'same_date_context' | 'timed_context' | 'published_topic';
  label: string;
  detail: string;
  source: { kind: 'diet_meal' | 'observation' | 'daily_digest' | 'publication'; id: string; localDate?: string; revision?: number | null };
  precision: 'exact' | 'approximate' | 'date_only' | 'unknown';
  inclusionRule: string;
}
export interface GutResearchPassport {
  exactQuestion: string;
  concern: GutSymptom;
  candidate: string | null;
  comparison: string | null;
  decision: 'understand' | 'choose' | 'care' | 'current_concern';
  onset: 'reported_exact' | 'reported_approximate' | 'not_reported';
  diagnosis: 'not_provided';
}
export interface GutDossier {
  questionId: string;
  passport: GutResearchPassport;
  links: GutDossierLink[];
  fingerprint: string;
  reading: string;
  nextFact: { kind: 'meal_outcome' | 'onset'; sourceId?: string; question: string; reason: string } | null;
}

export function makeGutResearchPassport(thread: GutQuestionThread): GutResearchPassport {
  return {
    exactQuestion: thread.question,
    concern: thread.symptom,
    candidate: thread.focus.trim() || null,
    comparison: thread.intent === 'decide' && thread.decision ? [thread.decision.options.a.label, thread.decision.options.b.label].filter(Boolean).join(' / ') || null : null,
    decision: thread.intent === 'decide' ? 'choose' : thread.intent === 'care' ? 'care' : thread.intent === 'now' ? 'current_concern' : 'understand',
    onset: thread.symptomOnset ? thread.symptomOnset.precision === 'exact' ? 'reported_exact' : 'reported_approximate' : 'not_reported',
    diagnosis: 'not_provided',
  };
}

/** Pure, profile-scoped projection. A date match is never promoted into an outcome. */
export function deriveGutDossier(thread: GutQuestionThread, evidence: GutEvidence | null, backtrace: GutBacktraceProjection | null, dietMealIds: ReadonlySet<string>): GutDossier {
  const links: GutDossierLink[] = [];
  for (const occasion of evidence?.occasions || []) {
    const relation = occasion.edge.category === 'support' ? 'explicit_with' : occasion.edge.category === 'counterexample' ? 'explicit_without' : 'unresolved';
    links.push({
      id: `meal:${occasion.meal.id}`, lane: relation === 'explicit_without' ? 'challenges' : 'observed', relation,
      label: `${occasion.meal.name} · ${occasion.meal.date}`,
      detail: relation === 'explicit_with' ? 'Symptom explicitly reported for this occasion.' : relation === 'explicit_without' ? 'Symptom explicitly reported absent for this occasion.' : occasion.answerOrigin === 'conflict' ? 'Diet and Gut reports disagree.' : 'No symptom-specific outcome is established.',
      source: { kind: dietMealIds.has(occasion.meal.id) ? 'diet_meal' : 'observation', id: occasion.meal.id, localDate: occasion.meal.date, revision: occasion.edge.mealSource.revision },
      precision: occasion.edge.mealSource.timePrecision, inclusionRule: occasion.edge.inclusionRule,
    });
  }
  const seen = new Set<string>();
  for (const context of evidence?.bundle.alternativeContext || []) {
    if (seen.has(context.sourceId)) continue;
    seen.add(context.sourceId);
    links.push({ id: `context:${context.sourceId}`, lane: 'context', relation: 'same_date_context', label: context.label, detail: 'Saved on the same date; sequence and cause are not established.', source: { kind: context.kind === 'other_meal_same_date' && dietMealIds.has(context.sourceId) ? 'diet_meal' : 'observation', id: context.sourceId, localDate: evidence?.occasions.find((item) => item.alternativeContext.some((other) => other.sourceId === context.sourceId))?.meal.date, revision: context.revision }, precision: context.timePrecision, inclusionRule: context.kind });
  }
  for (const item of backtrace?.timedItems || []) {
    if (seen.has(item.sourceId)) continue;
    seen.add(item.sourceId);
    links.push({ id: `timed:${item.sourceId}`, lane: 'context', relation: 'timed_context', label: item.label, detail: `${item.hoursPrior.toFixed(1)} hours before the ${backtrace?.anchorType === 'symptom_onset' ? 'reported onset' : 'saved question'}. Sequence does not establish cause.`, source: { kind: item.sourceKind, id: item.sourceId, localDate: item.sourceLocalDate || item.localDate, revision: item.revision }, precision: item.timePrecision, inclusionRule: backtrace?.anchorType || 'question_time' });
  }
  const support = evidence?.support || 0;
  const challenge = evidence?.tension || 0;
  const reading = !thread.focus ? 'Choose a recorded meal or phrase to test a specific connection. Your question is saved.' : !support && !challenge ? 'Your saved records do not yet establish a symptom-specific comparison for this idea.' : challenge ? `${support} report${support === 1 ? '' : 's'} with the symptom and ${challenge} without it. The records give a mixed picture, not a cause.` : `${support} linked report${support === 1 ? '' : 's'} with the symptom. Look for a counterexample before treating this as a pattern.`;
  const unknownMeal = evidence?.nextQuestionMealId && evidence.occasions.find((item) => item.meal.id === evidence.nextQuestionMealId);
  const nextFact = unknownMeal && thread.symptom !== 'unspecified' ? { kind: 'meal_outcome' as const, sourceId: unknownMeal.meal.id, question: `Do you remember whether you had ${thread.symptom.replace('_', ' ')} after ${unknownMeal.meal.name} on ${unknownMeal.meal.date}?`, reason: 'An explicit report could change the balance of with, without and unknown occasions.' } : !thread.symptomOnset && thread.intent === 'now' ? { kind: 'onset' as const, question: 'When did this symptom begin, if you know?', reason: 'A reported onset lets the timeline distinguish earlier records from the question save time.' } : null;
  return { questionId: thread.id, passport: makeGutResearchPassport(thread), links, fingerprint: `${evidence?.fingerprint || 'none'}|${thread.symptomOnset?.occurredAt || 'no-onset'}`, reading, nextFact };
}

export function gutDossierLens(dossier: GutDossier, lens: 'all_context' | 'explicit_only'): GutDossierLink[] {
  return lens === 'all_context' ? dossier.links : dossier.links.filter((link) => link.relation === 'explicit_with' || link.relation === 'explicit_without' || link.relation === 'unresolved');
}
