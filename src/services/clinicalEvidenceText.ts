/** Source-text helpers only: these locate reported measurements, not diagnoses. */
const escape = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const knownUnits =
  /^(?:mg\/d[lL]|g\/d[lL]|mmol\/[lL]|[µμu]mol\/[lL]|ng\/m[lL]|pg\/m[lL]|mg\/[lL]|mIU\/[lL]|IU\/[lL]|U\/[lL]|fL|%|mm\/hr|bpm|mmHg|kg|lbs|cells\/[µμu]?[lL]|K\/[µμu]?[lL])$/i;

export interface SourceMeasurement {
  analyte: string;
  value: string;
  unit: string;
  excerpt: string;
}

export function sourceMeasurement(text: string, marker: string): SourceMeasurement[] {
  if (!text || !marker?.trim()) return [];
  const pattern = new RegExp(
    `(?:^|[^\\p{L}\\p{N}])(${escape(marker.trim())})\\s*(?::|=|is\\b|was\\b|of\\b|measured\\b|result\\b|level\\b)?\\s*:?\\s*((?:<=|>=|[<>≤≥~])?\\s*\\d+(?:\\.\\d+)?)\\s*([a-zA-Z%µμ][a-zA-Z0-9%µμ/^-]*)?`,
    'giu'
  );
  return [...text.matchAll(pattern)].map((match) => ({
    analyte: marker.trim(),
    value: match[2].replace(/\s+/g, ''),
    unit: knownUnits.test(match[3] || '') ? match[3] : '',
    excerpt: text
      .slice(match.index! + match[0].indexOf(match[1]))
      .split(/[;\n]|,\s*(?=[\p{L}][\p{L} _/-]*\s*[:=]?\s*\d)|(?<=[.!?])\s+/u)[0],
  }));
}

export function sourceMeasurements(text: string): SourceMeasurement[] {
  const segments = (text || '').split(/[;\n]|(?<=[.!?])\s+/);
  return segments.flatMap((segment) => {
    const match = segment
      .trim()
      .match(
        /^([\p{L}][\p{L}\p{N} _()/-]{0,60}?)\s*:?\s*((?:<=|>=|[<>≤≥~])?\s*\d+(?:\.\d+)?)\s*([a-zA-Z%µμ][a-zA-Z0-9%µμ/^-]*)/u
      );
    if (!match || !knownUnits.test(match[3])) return [];
    return [
      {
        analyte: match[1].trim().replace(/\s+(?:measured|result|level|is|was)$/i, ''),
        value: match[2].replace(/\s+/g, ''),
        unit: match[3],
        excerpt: segment.trim(),
      },
    ];
  });
}

export function explicitCollectionDate(text: string): string | undefined {
  const match = (text || '').match(
    /(?:sample (?:collected|taken)|collection date|collected on|sampling date)\s*:?\s*(\d{4}-\d{2}-\d{2})/i
  );
  return match?.[1];
}

/** Exclude clear denials and resolved past events; never treat a no-match as safe. */
export function reportedCurrentClauses(text: string): string[] {
  return (text || '').split(/[.!;\n]|\bbut\b/i).filter((clause, index, clauses) => {
    if (
      /^\s*(?:what (?:is|are|does)|how (?:does|do)|can you explain|tell me about|for (?:a|my) (?:class|assignment)|in a (?:book|movie)|hypothetically)/i.test(
        clause
      )
    )
      return false;
    const historical =
      /\b(?:had|previously|history of|last year|\d+\s+(?:days?|weeks?|months?|years?)\s+ago)\b/i.test(
        clause
      );
    const resolved =
      /\b(?:resolved|went away|no longer|am (?:well|fine|symptom.free)|fully recovered)\b/i.test(
        [clause, clauses[index + 1] || ''].join(' ')
      );
    const active =
      /\b(?:happening|experiencing|started|returned|back again|worsening|right now|currently)\b/i.test(
        clause
      );
    return !(historical && resolved && !active);
  });
}

export function affirmativeMatch(clause: string, pattern: RegExp): boolean {
  const regex = new RegExp(pattern.source, pattern.flags.replace('g', '') + 'g');
  return [...clause.matchAll(regex)].some((match) => {
    const before = clause.slice(Math.max(0, match.index! - 75), match.index!);
    const after = clause.slice(match.index! + match[0].length, match.index! + match[0].length + 45);
    return (
      !/\b(?:no|not|never|without|denies|denied|do not have|don'?t have|does not have|doesn'?t have|have not had|never had)\s+(?:any\s+|currently\s+|having\s+|experiencing\s+|a\s+|the\s+|feeling\s+|get\s+|getting\s+|have\s+|feel\s+|report\s+|experience\s+){0,4}$/i.test(
        before
      ) &&
      !/\b(?:and|with|or|but)\s+(?:no|not|without|denies)\b/i.test(match[0]) &&
      !/^\s+(?:is|was|are|were)\s+(?:absent|denied|not present)\b/i.test(after)
    );
  });
}
