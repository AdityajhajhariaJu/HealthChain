import { evaluateClinicalUrgency, type ClinicalUrgency } from '../../services/clinicalTriageEngine';

/** Visible before authentication, network requests and expandable answers. */
export function ClinicalUrgencyNotice({
  text = '',
  urgency: supplied,
}: {
  text?: string;
  urgency?: ClinicalUrgency;
}) {
  const urgency = supplied || evaluateClinicalUrgency(text);
  if (urgency.level === 'not_assessed') return null;
  return (
    <aside
      role="alert"
      data-urgency={urgency.level}
      style={{
        background: '#FEF2F2',
        border: '1px solid #FECACA',
        borderRadius: 12,
        padding: 16,
        color: '#991B1B',
        margin: '12px 0',
      }}
    >
      <strong>
        {urgency.level === 'urgent_emergency_care'
          ? 'Get urgent human help now'
          : 'Medical assessment needs priority'}
      </strong>
      <p>{urgency.action}</p>
      <small>{urgency.reason}</small>
    </aside>
  );
}
