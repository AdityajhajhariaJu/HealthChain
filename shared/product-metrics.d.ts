export const MEASUREMENT_VERSION: string;
export const METRIC_DIMENSIONS: Readonly<Record<string, readonly string[]>>;
export function validMetric(value: unknown): boolean;
export function metricPayload(event: string, payload: unknown): { dimension: string } | null;
