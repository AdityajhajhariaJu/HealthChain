import { getGutPublicSourceGuide, getGutTopicSourceGuide } from './GutPublicSourceGuide';
import type { GutResearchPaper, GutResearchTopic } from './GutResearchService';
import type {
  GutEvidence,
  GutIntent,
  GutQuestionThread,
  GutSymptom,
  GutSynthesis,
} from './GutResolutionService';
import { fetchGutReasoning } from './geminiService';
import { parseModelJson } from './modelJson';
import { validateNarrativeGrounding } from './clinicalClaimGuard';
import { evaluateClinicalUrgency } from './clinicalTriageEngine';
import { affirmativeMatch } from './clinicalEvidenceText';

export const GUT_READING_VERSION = 'gut-reading-v3';

/** Round-robin outcome groups prevent truncation from hiding counterexamples. */
export function selectGutReasoningOccasions(evidence: GutEvidence | null) {
  const all = evidence?.occasions || [];
  if (all.length <= 12) return all;
  const groups = ['conflict', 'no', 'yes', 'unanswered'].map((answer) =>
    all
      .filter((item) =>
        answer === 'conflict'
          ? item.answerOrigin === 'conflict'
          : item.answerOrigin !== 'conflict' && item.answer === answer
      )
      .sort((a, b) => b.meal.date.localeCompare(a.meal.date))
  );
  const selected: typeof all = [];
  for (let index = 0; selected.length < 12 && groups.some((group) => group[index]); index++)
    for (const group of groups)
      if (group[index] && selected.length < 12) selected.push(group[index]);
  return selected;
}

export function gutResearchFingerprint(papers: GutResearchPaper[]) {
  let hash = 2166136261;
  const source = JSON.stringify(
    papers
      .slice(0, 6)
      .map((p) => [
        p.id,
        p.title,
        p.abstract,
        p.correctionNotice,
        p.publicationDate,
        p.publicationTypes,
      ])
  );
  for (const character of source) hash = Math.imul(hash ^ character.charCodeAt(0), 16777619);
  return `gut-research-${(hash >>> 0).toString(16)}`;
}

export interface GutReasoningInput {
  thread: Pick<
    GutQuestionThread,
    | 'question'
    | 'intent'
    | 'symptom'
    | 'focus'
    | 'symptomOnset'
    | 'researchConcept'
    | 'clarifications'
    | 'decision'
  > & { reflection?: string | null };
  evidence: GutEvidence | null;
  papers: GutResearchPaper[];
  topic: GutResearchTopic;
  contextRecords: Array<{
    id: string;
    kind: string;
    label: string;
    date: string;
    timing: string;
    sourceKind?: 'observation' | 'daily_digest';
  }>;
  contextFingerprint: string;
}

export interface GutReasoningSource {
  id: string;
  title: string;
  kind: 'meal' | 'report' | 'context' | 'paper' | 'question' | 'guide';
  sourceKind?: 'diet_meal' | 'observation' | 'daily_digest';
  sourceId?: string;
  localDate?: string;
  url?: string;
}

export interface GutReasoningResult extends GutSynthesis {
  sources: GutReasoningSource[];
}

/** Local freshness marker only; it contains no user text or account identifier. */
export function gutSynthesisFingerprint(
  thread: Pick<
    GutQuestionThread,
    | 'question'
    | 'symptom'
    | 'focus'
    | 'symptomOnset'
    | 'researchConcept'
    | 'clarifications'
    | 'decision'
  > & { reflection?: string | null },
  evidence: GutEvidence | null,
  contextFingerprint = '',
  researchTopic = ''
): string {
  const source = `${GUT_READING_VERSION}|${JSON.stringify(getGutPublicSourceGuide(thread.symptom))}|${JSON.stringify(getGutTopicSourceGuide(thread.symptom, researchTopic as GutResearchTopic))}|${evidence?.fingerprint || 'no-linked-records'}|${thread.symptom}|${thread.focus.trim().toLocaleLowerCase()}|${thread.question.trim().toLocaleLowerCase()}|${thread.researchConcept || ''}|${thread.symptomOnset?.occurredAt || 'onset-unknown'}|${thread.symptomOnset?.precision || 'unknown'}|${contextFingerprint}|${researchTopic}|${JSON.stringify(thread.clarifications || [])}|${JSON.stringify(thread.decision || null)}|${thread.reflection || ''}`;
  let hash = 2166136261;
  for (let index = 0; index < source.length; index += 1)
    hash = Math.imul(hash ^ source.charCodeAt(index), 16777619);
  return `gut-v3-${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

const text = (value: unknown, max: number) =>
  typeof value === 'string' ? value.replace(/\s+/g, ' ').trim().slice(0, max) : '';
const list = (value: unknown, maxItems: number, maxText: number) =>
  Array.isArray(value)
    ? value
        .map((item) => text(item, maxText))
        .filter(Boolean)
        .slice(0, maxItems)
    : [];

/**
 * Gemini interprets only the exact records and papers passed by the user. Record
 * identity, counts, time meaning, and all source links remain app-derived.
 */
export async function reasonOverGutEvidence(input: GutReasoningInput): Promise<GutReasoningResult> {
  const sources: GutReasoningSource[] = [
    { id: 'question:current', title: input.thread.question, kind: 'question' },
  ];
  const urgency = evaluateClinicalUrgency(
    [input.thread.question, ...(input.thread.clarifications || []).map((item) => item.answer)].join(
      '\n'
    )
  );
  if (urgency.level === 'urgent_emergency_care')
    return {
      at: new Date().toISOString(),
      promptVersion: GUT_READING_VERSION,
      evidenceFingerprint: gutSynthesisFingerprint(
        input.thread,
        input.evidence,
        input.contextFingerprint,
        input.topic
      ),
      researchTopic: input.topic,
      researchIds: [],
      researchFingerprint: gutResearchFingerprint(input.papers),
      headline: 'Seek emergency medical help now',
      personalReading: input.thread.question,
      personalSourceIds: ['question:current'],
      researchReading:
        'No model interpretation was requested because urgent human care takes priority.',
      researchSourceIds: [],
      connectionReading: `${urgency.action} ${urgency.reason}`,
      uncertainties: [],
      nextAction: 'prepare_care_question',
      nextReason: urgency.action,
      followUpQuestion: '',
      followUpWhy: '',
      supportingQuotes: [{ sourceId: 'question:current', quote: input.thread.question }],
      sources,
    };
  const guide = getGutPublicSourceGuide(input.thread.symptom);
  const generalGuidance = guide
    ? [
        {
          id: `guide:niddk:${input.thread.symptom}`,
          title: guide.title,
          text: `${guide.sentence} ${guide.relevance} ${guide.limit}`,
          url: guide.url,
        },
      ]
    : [];
  const topicGuide = getGutTopicSourceGuide(input.thread.symptom, input.topic);
  if (topicGuide)
    generalGuidance.push({
      id: `guide:topic:${input.topic}`,
      title: topicGuide.title,
      text: `${topicGuide.sourceSays} ${topicGuide.population} ${topicGuide.fit}`,
      url: topicGuide.url,
    });
  for (const item of generalGuidance)
    sources.push({ id: item.id, title: item.title, kind: 'guide', url: item.url });
  const clarifications = (input.thread.clarifications || []).slice(-3).map((item, index) => ({
    id: `clarification:${index}`,
    question: text(item.question, 180),
    answer: text(item.answer, 500),
  }));
  for (const item of clarifications)
    sources.push({ id: item.id, title: item.answer, kind: 'question' });
  const records = selectGutReasoningOccasions(input.evidence).map((occasion) => {
    const mealId = `meal:${occasion.meal.id}`;
    sources.push({
      id: mealId,
      title: `${occasion.meal.name} · ${occasion.meal.date}`,
      kind: 'meal',
      sourceKind: occasion.meal.sourceKind || 'diet_meal',
      sourceId: occasion.meal.id,
      localDate: occasion.meal.date,
    });
    const sourceIds = [mealId];
    for (const answerSource of occasion.edge.answerSources.slice(0, 3)) {
      const id = `report:${answerSource.id}`;
      if (!sources.some((source) => source.id === id)) {
        sources.push({
          id,
          title: `${answerSource.kind === 'gut_report' ? 'Gut report' : 'Diet reaction'} · ${occasion.meal.date}`,
          kind: 'report',
          sourceKind:
            answerSource.kind === 'gut_report'
              ? 'observation'
              : occasion.meal.sourceKind || 'diet_meal',
          sourceId: answerSource.kind === 'gut_report' ? answerSource.id : occasion.meal.id,
          localDate: occasion.meal.date,
        });
      }
      sourceIds.push(id);
    }
    const sameDateContext = occasion.alternativeContext.slice(0, 4).flatMap((item) => {
      if (item.kind === 'other_meal_same_date') {
        const relatedMeal = occasion.otherMeals.find((meal) => meal.id === item.sourceId);
        if (!relatedMeal) return [];
        const id = `meal:${relatedMeal.id}`;
        if (!sources.some((source) => source.id === id))
          sources.push({
            id,
            title: `${relatedMeal.name} · ${relatedMeal.date}`,
            kind: 'meal',
            sourceKind: relatedMeal.sourceKind || 'diet_meal',
            sourceId: relatedMeal.id,
            localDate: relatedMeal.date,
          });
        sourceIds.push(id);
        return [
          {
            id,
            type: 'other meal',
            title: relatedMeal.name,
            date: relatedMeal.date,
            timing: relatedMeal.time || 'not recorded',
            relation: 'recorded on the same date; meal order is not established',
          },
        ];
      }
      const id = `context:${item.sourceId}`;
      if (!sources.some((source) => source.id === id))
        sources.push({
          id,
          title: `${item.contextType || 'Other'} context · ${occasion.meal.date}`,
          kind: 'context',
          sourceKind: 'observation',
          sourceId: item.sourceId,
          localDate: occasion.meal.date,
        });
      sourceIds.push(id);
      return [
        {
          id,
          type: item.contextType || 'other',
          title: item.label,
          date: occasion.meal.date,
          timing: item.timePrecision.replace('_', ' '),
          relation: 'same-date context; sequence is not established',
        },
      ];
    });
    return {
      mealName: occasion.meal.name,
      date: occasion.meal.date,
      time: occasion.meal.time || 'not recorded',
      timePrecision: occasion.meal.timePrecision || 'unknown',
      occurredAt: occasion.meal.occurredAt || null,
      confirmedPreparation:
        occasion.meal.preparation?.source === 'user_confirmed' ? occasion.meal.preparation : null,
      reportedAnswers: (occasion.reportedAnswers || []).slice(0, 3),
      sequence:
        input.thread.symptomOnset?.precision === 'exact' &&
        occasion.meal.timePrecision === 'exact' &&
        input.thread.symptomOnset.occurredAt &&
        occasion.meal.occurredAt &&
        Number.isFinite(Date.parse(occasion.meal.occurredAt)) &&
        Number.isFinite(Date.parse(input.thread.symptomOnset.occurredAt))
          ? Date.parse(occasion.meal.occurredAt) > Date.parse(input.thread.symptomOnset.occurredAt)
            ? 'meal occurred after the reported symptom onset; cannot explain that onset as a preceding exposure'
            : 'meal preceded or coincided with reported onset; sequence alone does not establish cause'
          : 'exact symptom sequence is not established; date-only or approximate timing cannot determine exact order',
      outcome:
        occasion.answerOrigin === 'conflict'
          ? 'conflicting reports; unresolved'
          : occasion.answer === 'yes'
            ? `${input.thread.symptom} explicitly reported`
            : occasion.answer === 'no'
              ? `explicitly reported without ${input.thread.symptom}`
              : 'unknown; no symptom-specific answer',
      inclusionRule: occasion.edge.inclusionRule,
      sourceIds,
      sameDateContext,
    };
  });

  const contextRecords = input.contextRecords.slice(0, 8).map((record) => {
    const id = `context:${record.id}`;
    if (!sources.some((source) => source.id === id))
      sources.push({
        id,
        title: `${record.kind} · ${record.date}`,
        kind: 'context',
        sourceKind: record.sourceKind || 'observation',
        sourceId: record.id,
        localDate: record.date,
      });
    return {
      id,
      type: record.kind,
      date: record.date,
      timing: record.timing,
      label: record.label.slice(0, 120),
    };
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
      populationKnown: paper.populationKnown,
      titlePopulationCue: paper.titlePopulationCue,
      applicability:
        'General study, not a personal finding. State the studied population and intervention when using its results; if not known, say so.',
      abstractExcerpt: (paper.abstract || 'Abstract unavailable.').slice(0, 3000),
    };
  });

  const counts = {
    explicitlyReportedWith: input.evidence?.support ?? 0,
    explicitlyReportedWithout: input.evidence?.tension ?? 0,
    unknownOrConflicting: input.evidence?.unknown ?? 0,
    conflictingSources: input.evidence?.conflicts ?? 0,
    matchedMealNames: input.evidence?.occasions.length ?? 0,
  };
  const decision = input.thread.decision;
  const decisionText = decision
    ? `Options: ${decision.options.a.label} or ${decision.options.b.label}. Priority: ${decision.priority || 'not specified'}. Chosen: ${decision.chosen ? decision.options[decision.chosen].label : 'not chosen'}. Reported outcome: ${decision.outcome || 'not reported'}. A choice is not proof the meal was eaten.`
    : '';
  const reflection = text(input.thread.reflection, 1000);
  if (decisionText) sources.push({ id: 'decision:current', title: decisionText, kind: 'question' });
  if (reflection) sources.push({ id: 'reflection:current', title: reflection, kind: 'question' });
  const payload = {
    question: text(input.thread.question, 500),
    intent: input.thread.intent as GutIntent,
    symptom: input.thread.symptom as GutSymptom,
    selectedMealPhrase: text(input.thread.focus, 120) || 'not selected',
    deterministicRecordCounts: counts,
    recordCoverage: {
      total: counts.matchedMealNames,
      included: records.length,
      omitted: counts.matchedMealNames - records.length,
      selection: 'Balanced outcome groups; aggregate counts describe all matching records.',
    },
    reportedSymptomOnset: input.thread.symptomOnset || null,
    personalRecords: records,
    nearbyContext: contextRecords,
    researchTopic: input.topic,
    confirmedResearchConcept: input.thread.researchConcept || '',
    retrievedResearch: papers,
    generalGuidance,
    clarifications,
    decision: decisionText,
    reportedFollowUp: reflection,
    allowedSourceIds: [...new Set(sources.map((source) => source.id))],
  };
  const citationTexts = [
    { id: 'question:current', text: input.thread.question },
    ...(decisionText ? [{ id: 'decision:current', text: decisionText }] : []),
    ...(reflection ? [{ id: 'reflection:current', text: reflection }] : []),
    ...clarifications.map((item) => ({ id: item.id, text: item.answer })),
    ...generalGuidance.map((item) => ({ id: item.id, text: item.text })),
    ...contextRecords.map((item) => ({ id: item.id, text: item.label })),
    ...records.map((item) => ({
      id: item.sourceIds[0],
      text: `${item.mealName} · ${item.date}${item.confirmedPreparation ? ` · User-confirmed preparation: ${item.confirmedPreparation.detail}` : ''}`,
    })),
    ...records.flatMap((item) =>
      item.reportedAnswers.map((answer) => ({ id: `report:${answer.id}`, text: answer.text }))
    ),
    ...records.flatMap((item) =>
      item.sourceIds
        .slice(1)
        .filter((id) => !item.reportedAnswers.some((answer) => id === `report:${answer.id}`))
        .map((id) => ({ id, text: `Recorded outcome field: ${item.outcome}` }))
    ),
    ...records.flatMap((item) =>
      item.sameDateContext.map((context) => ({
        id: context.id,
        text: `${context.title} ${context.date} ${context.timing} ${context.relation}`,
      }))
    ),
    ...papers.map((item) => ({ id: item.id, text: item.abstractExcerpt })),
  ];
  const uniqueTexts = [...new Map(citationTexts.map((item) => [item.id, item])).values()];
  const citationPassages = uniqueTexts
    .flatMap((item) => {
      const sentences = item.text.split(/(?<=[.!?])\s+/).filter(Boolean);
      // Keep results/conclusions available even when a long abstract starts with background.
      const ordered = item.id.startsWith('paper:')
        ? [
            ...new Set([
              ...sentences.filter((sentence) => /\b(?:results?|conclusions?)\s*:/i.test(sentence)),
              ...sentences.slice(-3),
              ...sentences,
            ]),
          ]
        : sentences;
      return ordered
        .flatMap((sentence) => {
          const words = sentence.split(/\s+/);
          return Array.from({ length: Math.ceil(words.length / 18) }, (_, index) =>
            words.slice(index * 18, (index + 1) * 18).join(' ')
          );
        })
        .slice(0, item.id.startsWith('paper:') ? 24 : 12)
        .map((passage, index) => ({ id: `${item.id}#${index}`, sourceId: item.id, text: passage }));
    })
    .slice(0, 256);
  const raw = await fetchGutReasoning({ ...payload, citationPassages });
  const parsed = parseModelJson<Record<string, unknown>>(raw, null);
  if (!parsed) throw new Error('Gut reasoning returned an unreadable answer. Please try again.');

  // The model selects passages; exact text and links are owned by the app.
  // Provenance is checked here. Clinical interpretation remains labeled as AI.
  const passageById = new Map(citationPassages.map((item) => [item.id, item]));
  const selectedIds = list(parsed.citationPassageIds, 8, 200);
  if (!selectedIds.length || selectedIds.some((id) => !passageById.has(id)))
    throw new Error('The answer cited a passage outside this question. Please try again.');
  const selected = [
    ...new Map(
      selectedIds.map((id) => {
        const passage = passageById.get(id)!;
        return [passage.sourceId, passage];
      })
    ).values(),
  ];
  const personalSourceIds = selected
    .filter((item) => !item.sourceId.startsWith('paper:') && !item.sourceId.startsWith('guide:'))
    .map((item) => item.sourceId);
  const researchSourceIds = selected
    .filter((item) => item.sourceId.startsWith('paper:') || item.sourceId.startsWith('guide:'))
    .map((item) => item.sourceId);
  const supportingQuotes = selected.map((item) => ({ sourceId: item.sourceId, quote: item.text }));
  const readingText = (value: unknown, max: number) => {
    let prose = typeof value === 'string' ? value : '';
    for (const id of [...passageById.keys(), ...sources.map((source) => source.id)].sort(
      (a, b) => b.length - a.length
    ))
      prose = prose.split(id).join('');
    return text(prose.replace(/\(\s*[,;\s]*\)/g, '').replace(/\[\s*[,;\s]*\]/g, ''), max);
  };
  let headline = readingText(parsed.headline, 180);
  let connectionReading = readingText(parsed.connectionReading, 600);
  const personalReading = input.evidence?.occasions.length
    ? input.evidence.answer
    : readingText(parsed.personalReading, 900);
  let nextReason = readingText(parsed.nextReason, 260);
  if (
    !headline ||
    !connectionReading ||
    !personalReading ||
    !nextReason ||
    !personalSourceIds.length
  )
    throw new Error('Gemini returned an incomplete answer. Please try again.');
  const uncertainties = list(parsed.uncertainties, 3, 500).map((value) => readingText(value, 220));
  const researchReading = researchSourceIds.length
    ? readingText(parsed.researchReading, 900)
    : 'No relevant research passage is attached. This answer uses your description and saved information.';
  let followUpQuestion = clarifications.length < 3 ? readingText(parsed.followUpQuestion, 180) : '';
  const followUpWhy = readingText(parsed.followUpWhy, 220);
  const exactOnset = input.thread.symptomOnset;
  if (
    exactOnset?.precision === 'exact' &&
    input.evidence?.occasions.length &&
    input.evidence.occasions.every(
      (occasion) =>
        occasion.meal.timePrecision === 'exact' &&
        occasion.meal.occurredAt &&
        Date.parse(occasion.meal.occurredAt) > Date.parse(exactOnset.occurredAt)
    )
  ) {
    connectionReading =
      'According to the occurrence times you recorded, the meal came after your symptom onset. It cannot explain that onset as a preceding exposure; these records do not determine the cause.';
  }
  // Reject common explicit overclaims; this supplements the server instructions
  // and source checks, and is not represented as medical validation.
  const narrative = [
    headline,
    connectionReading,
    personalReading,
    researchReading,
    nextReason,
    followUpQuestion,
    followUpWhy,
    ...uncertainties,
  ].join(' ');
  if (
    /\b(?:definitely causes?|(?:start|stop|increase|reduce) (?:your )?(?:medication|dose)|guaranteed|100% safe)\b/i.test(
      narrative
    )
  )
    throw new Error(
      'The answer was too certain or included a treatment instruction. Please try again.'
    );
  const grounding = validateNarrativeGrounding(narrative, [{ fact: JSON.stringify(payload) }]);
  if (!grounding.isSupported)
    throw new Error('The answer included claims not supported by this question. Please try again.');
  if (
    input.evidence &&
    (input.evidence.tension > 0 || input.evidence.conflicts > 0) &&
    affirmativeMatch(
      `${headline}. ${connectionReading}`,
      /\b(?:consistently|every (?:record|occasion)|all (?:your |the )?(?:records|occasions)|strong association)\b/i
    )
  ) {
    headline = 'Your reports include counterexamples or unresolved conflicts';
    connectionReading = input.evidence.answer;
  }
  if (urgency.level !== 'not_assessed') {
    connectionReading = `${urgency.action} ${urgency.reason}`;
    nextReason = urgency.action;
    followUpQuestion = '';
  }
  const validActions = [
    'review_records',
    'open_research',
    'add_report',
    'prepare_care_question',
    'leave_open',
  ] as const;
  const nextAction = validActions.includes(parsed.nextAction as (typeof validActions)[number])
    ? (parsed.nextAction as (typeof validActions)[number])
    : 'leave_open';
  return {
    at: new Date().toISOString(),
    promptVersion: GUT_READING_VERSION,
    evidenceFingerprint: gutSynthesisFingerprint(
      input.thread,
      input.evidence,
      input.contextFingerprint,
      input.topic
    ),
    researchTopic: input.topic,
    researchIds: input.papers.slice(0, 6).map((paper) => paper.id),
    researchSources: input.papers
      .slice(0, 6)
      .map((paper) => ({
        id: paper.id,
        title: paper.title,
        publicationDate: paper.publicationDate || paper.year,
        publicationTypes: paper.publicationTypes,
        titlePopulationCue: paper.titlePopulationCue,
        correctionNotice: paper.correctionNotice,
      })),
    researchFingerprint: gutResearchFingerprint(input.papers),
    headline,
    personalReading,
    personalSourceIds,
    researchReading,
    researchSourceIds,
    connectionReading,
    uncertainties,
    nextAction,
    nextReason,
    followUpQuestion,
    followUpWhy,
    supportingQuotes,
    sources,
  };
}
