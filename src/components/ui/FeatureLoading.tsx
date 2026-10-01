export function FeatureLoading({ label = 'Loading…' }: { label?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      style={{ padding: '16px', color: 'var(--text-muted)', textAlign: 'center' }}
    >
      {label}
    </div>
  );
}
