import { Link } from 'react-router-dom';
import { ArrowRight, MessageCircle, FolderHeart, FileText } from 'lucide-react';
import { useCaseWorkspace } from '../../hooks/useCaseWorkspace';
import { caseActionLabel } from '../../services/caseWorkspace';
import './caseWorkspace.css';

export function TodayCaseWorkspace() {
  const cases = useCaseWorkspace().filter(item => item.status !== 'archived');
  const recent = cases[0];
  const actions = cases.flatMap(item => (item.actions || []).filter(action => action.status !== 'completed')
    .map(action => ({ item, action }))).slice(0, 3);
  return <section className="case-workspace" aria-labelledby="today-cases-title">
    <div className="case-workspace-heading">
      <div><span className="case-workspace-eyebrow">YOUR HEALTH, IN CONTEXT</span>
        <h2 id="today-cases-title">{recent ? 'Pick up where you left off' : 'A clearer picture starts here'}</h2>
        <p>{recent ? 'Keep your records, conversations, and appointment preparation connected.' : 'Bring your questions and records together in a case you can return to.'}</p>
      </div>
      <Link className="case-workspace-link" to="/app/my-cases">My Cases <ArrowRight size={16} aria-hidden="true" /></Link>
    </div>
    {recent && <div className="case-workspace-current">
      <FolderHeart size={24} aria-hidden="true" />
      <div><Link to={`/app/cases/${recent.id}`}>{recent.title}</Link>
        <p>{recent.medicalRecords?.length || 0} records · {recent.reviews?.length || 0} saved reviews</p></div>
    </div>}
    <div className="case-workspace-grid">
      <Link className="case-workspace-tile" to={recent ? `/app/ava?caseId=${encodeURIComponent(recent.id)}` : '/app/ava'}>
        <MessageCircle aria-hidden="true" size={22} /><strong>Check in with Ava</strong><span>Talk through changes and questions{recent ? ' with this case in context.' : ' about your day.'}</span>
      </Link>
      <Link className="case-workspace-tile" to={recent ? `/app/consult?caseId=${encodeURIComponent(recent.id)}&review=new` : '/app/consult'}>
        <FileText aria-hidden="true" size={22} /><strong>Review your records</strong><span>Use Clinical Data Engine to organize evidence and identify questions.</span>
      </Link>
      <Link className="case-workspace-tile" to={recent ? `/app/case-prep?caseId=${encodeURIComponent(recent.id)}` : '/app/my-cases?new=true'}>
        <FolderHeart aria-hidden="true" size={22} /><strong>Prepare for a visit</strong><span>Bring a concise health story to your next appointment.</span>
      </Link>
    </div>
    {actions.length > 0 && <div className="case-workspace-next"><h3>Next steps to review</h3>
      <p>Saved suggestions for discussion with your clinician.</p>
      <ul>{actions.map(({ item, action }) => <li key={`${item.id}-${action.id}`}><Link to={`/app/cases/${item.id}`}>
        <span>{caseActionLabel(action)}<small>{item.title}</small></span><ArrowRight size={16} aria-hidden="true" />
      </Link></li>)}</ul>
    </div>}
  </section>;
}
