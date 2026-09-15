import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useCaseWorkspace } from '../../hooks/useCaseWorkspace';
import { caseActionLabel } from '../../services/caseWorkspace';
import './caseWorkspace.css';

export function TodayCaseWorkspace() {
  const recent = useCaseWorkspace().find((item) => item.status !== 'archived');
  const nextAction = recent?.actions?.find((action) => action.status !== 'completed');
  const caseParam = recent ? `?caseId=${encodeURIComponent(recent.id)}` : '';

  return (
    <section className="case-workspace" aria-labelledby="today-cases-title">
      <div className="case-workspace-heading">
        <div>
          <h2 id="today-cases-title">{recent ? 'Pick up where you left off' : 'A clearer picture starts here'}</h2>
          <p>
            {recent
              ? nextAction
                ? caseActionLabel(nextAction)
                : 'Add what changed, review your records, or prepare for your visit.'
              : 'Start a case to keep your records, questions, and next steps together.'}
          </p>
        </div>
        <Link className="case-workspace-link" to={recent ? `/app/cases/${recent.id}` : '/app/my-cases?new=true'}>
          {recent ? recent.title : 'Start a case'} <ArrowRight size={16} aria-hidden="true" />
        </Link>
      </div>

      <div className="case-workspace-grid">
        <Link className="case-workspace-tile" to={recent ? `/app/consult${caseParam}&review=new` : '/app/consult'}>
          <strong>Review your records</strong>
          <span>Organize evidence and questions.</span>
        </Link>
        <Link className="case-workspace-tile" to={`/app/ava${caseParam}`}>
          <strong>Check in with Ava</strong>
          <span>Discuss a change or question.</span>
        </Link>
        <Link className="case-workspace-tile" to={recent ? `/app/case-prep${caseParam}` : '/app/my-cases?new=true'}>
          <strong>Prepare for a visit</strong>
          <span>Create a concise brief.</span>
        </Link>
      </div>
    </section>
  );
}
