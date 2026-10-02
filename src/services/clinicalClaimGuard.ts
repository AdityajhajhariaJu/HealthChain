import { affirmativeMatch, sourceMeasurement, sourceMeasurements } from './clinicalEvidenceText';

export interface NarrativeGroundingCheck {
  isSupported: boolean;
  unsupportedClaims: string[];
  reason?: string;
}

export function validateNarrativeGrounding(
  text: string,
  verifiedFacts: any[]
): NarrativeGroundingCheck {
  if (!text || typeof text !== 'string') return { isSupported: true, unsupportedClaims: [] };

  const sourceCorpus = (verifiedFacts || [])
    .map((f) => `${f.fact || ''} ${f.finding || ''} ${f.text || ''}`)
    .join(' ')
    .toLowerCase();

  const sentences = text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const unsupportedClaims: string[] = [];
  const sourceSentences = sourceCorpus
    .split(/(?<=[.!?])\s+/)
    .filter(
      (sentence) =>
        !/\b(?:ignore (?:all |your )?(?:rules|instructions)|(?:say|state) (?:i|you) have|tell me to start)\b/i.test(
          sentence
        )
    );
  const numberWords = [
    'zero',
    'one',
    'two',
    'three',
    'four',
    'five',
    'six',
    'seven',
    'eight',
    'nine',
    'ten',
    'eleven',
    'twelve',
    'thirteen',
    'fourteen',
    'fifteen',
    'sixteen',
    'seventeen',
    'eighteen',
    'nineteen',
    'twenty',
  ];
  const sourceNumbers = new Set(sourceCorpus.match(/\d+(?:\.\d+)?/g) || []);
  for (const number of sourceNumbers) sourceNumbers.add(String(Number(number)));
  numberWords.forEach((word, index) => {
    if (new RegExp(`\\b${word}\\b`).test(sourceCorpus)) sourceNumbers.add(String(index));
  });

  const definitivePatterns = [
    /\b(confirmed|diagnosed|proven|definitive|positive for)\s+([a-z0-9\s\-]{3,50})/i,
    /\b(suffering from|afflicted with|has)\s+([a-z0-9\s\-]{3,50}\b(?:disease|syndrome|disorder|carcinoma|cancer|infection))/i,
    /\b(rare disease|autoimmune disease|malignancy|carcinoma)\b/i,
    /\b(?:you|the patient|patient)\s+(?:definitely\s+)?(?:have|has|suffer(?:s)? from)\s+(?:an?\s+)?(IBS|GERD|diabetes|coeliac disease|celiac disease|lactose intolerance|allergy|cancer|[a-z -]+(?:disease|syndrome|disorder|infection))\b/i,
  ];
  const measuredMarkers = [
    ...new Set(
      (verifiedFacts || [])
        .flatMap((f) => sourceMeasurements(f.fact || f.text || ''))
        .map((item) => item.analyte)
    ),
  ];
  const measurements = (verifiedFacts || []).flatMap((f) =>
    sourceMeasurements(f.fact || f.text || '')
  );
  const derivedDifference = (sentence: string, number: string, index: number) => {
    const before = sentence.slice(Math.max(0, index - 35), index);
    const after = sentence.slice(index + number.length);
    const unit = after.match(/^\s*([a-zA-Z%µμ][a-zA-Z0-9%µμ/^-]*)/)?.[1];
    if (
      !unit ||
      !(
        /\b(?:difference|change|rise|drop|increase|decrease)\s*(?:of|by|is)?\s*\(?\s*$/i.test(
          before
        ) ||
        /^\s*[a-zA-Z%µμ][a-zA-Z0-9%µμ/^-]*\s+(?:difference|change|rise|drop|increase|decrease)\b/i.test(
          after
        )
      )
    )
      return false;
    return measurements.some((a) =>
      measurements.some(
        (b) =>
          a !== b &&
          a.analyte.toLowerCase() === b.analyte.toLowerCase() &&
          a.unit.toLowerCase() === unit.toLowerCase() &&
          b.unit.toLowerCase() === unit.toLowerCase() &&
          Math.abs(Math.abs(Number(a.value) - Number(b.value)) - Number(number)) < 1e-9
      )
    );
  };

  for (const sentence of sentences) {
    const newNumbers = [...sentence.matchAll(/(?<![a-zA-Z0-9])\d+(?:\.\d+)?/g)].some(
      (match) =>
        !sourceNumbers.has(match[0]) && !derivedDifference(sentence, match[0], match.index!)
    );
    const assertedCause = affirmativeMatch(
      sentence,
      /\b(?:definitely (?:causes?|explains?)|(?:is|are) (?:the |a )?proven cause|(?:are|is) definitely caused by|proves (?:that )?.*caus)\b/i
    );
    const misboundMeasurement = measuredMarkers.some((marker) =>
      sourceMeasurement(sentence, marker).some(
        (claim) =>
          !sourceMeasurement(sourceCorpus, marker).some(
            (source) =>
              source.value === claim.value &&
              (!claim.unit || source.unit.toLowerCase() === claim.unit.toLowerCase())
          )
      )
    );
    if (newNumbers || assertedCause || misboundMeasurement) {
      unsupportedClaims.push(sentence);
      continue;
    }
    for (const pat of definitivePatterns) {
      for (const match of sentence.matchAll(new RegExp(pat.source, 'gi'))) {
        // A conditional mechanism ("if you have...") does not assert a diagnosis.
        const before = sentence.slice(0, match.index);
        const conditionalClause = before.split(/[,;:]|\b(?:but|then)\b/i).pop() || '';
        if (/\b(?:if|whether)\b/i.test(conditionalClause)) continue;
        if (/\b(?:if|whether|no|not|without)\s+(?:been\s+|a\s+|the\s+)?$/i.test(before)) continue;
        if (
          /\b(?:has|have|is|was)\s+not\s+(?:been\s+)?(?:diagnosed|confirmed|proven)\b/i.test(
            match[0]
          )
        )
          continue;
        const rawEntity = (match[2] || match[1] || match[0]).trim().toLowerCase();
        const benignObservational =
          /^(mild|intermittent|severe|knee|morning|joint|muscle)?\s*(discomfort|pain|fatigue|symptom|strain|evaluation|review)$/i;
        if (benignObservational.test(rawEntity)) {
          continue;
        }

        const entityWords = rawEntity
          .replace(/[^a-z0-9\s]/g, ' ')
          .split(/\s+/)
          .filter(
            (w) =>
              w.length > 3 &&
              !['from', 'this', 'that', 'with', 'have', 'been', 'case', 'symptom'].includes(w)
          );

        const isMentionedInSources =
          entityWords.length > 0 &&
          sourceSentences.some(
            (source) =>
              entityWords.every((w) => source.includes(w)) &&
              affirmativeMatch(source, pat) &&
              !/\b(?:not|no|never|rule out|excluded|denies|suspected|possible)\b/i.test(source)
          );

        if (!isMentionedInSources) {
          unsupportedClaims.push(sentence);
          break;
        }
      }
      if (unsupportedClaims.includes(sentence)) break;
    }
  }

  return {
    isSupported: unsupportedClaims.length === 0,
    unsupportedClaims,
    reason:
      unsupportedClaims.length > 0
        ? `Narrative asserts definitive conclusions or clinical entities not found in verified evidence: "${unsupportedClaims[0]}"`
        : undefined,
  };
}
