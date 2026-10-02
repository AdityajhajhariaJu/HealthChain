/** Keep the guided selections and the editable narrative consistent. Labels are user reports. */
const valueFor = (text: string, label: string) =>
  text.match(new RegExp(`(?:^|[.\\n]\\s*)${label}:\\s*([^\\n.]+)`, 'i'))?.[1].trim() || null;
export function readClinicalIntakeHistory(text: string) {
  return {
    symptoms: (valueFor(text, 'Primary symptoms') || '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean),
    onset: valueFor(text, 'Onset'),
    progression: valueFor(text, 'Progression'),
  };
}
export function updateClinicalIntakeField(
  text: string,
  label: 'Primary symptoms' | 'Onset' | 'Progression',
  value: string | null
): string {
  const cleaned = text
    .replace(new RegExp(`(^|[.\\n]\\s*)${label}:\\s*[^.\\n]*[.]?\\s*`, 'gi'), '$1')
    .trim();
  return value ? `${label}: ${value}. ${cleaned}`.trim() : cleaned;
}
