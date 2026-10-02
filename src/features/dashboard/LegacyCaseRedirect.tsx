import { Navigate, useLocation } from 'react-router-dom';
import { getActiveCaseId } from '../../services/CaseEngine';
/**
 * War Room & Cases redirector that routes to the active Health Canvas (/app/cases/:id)
 * if an active case exists, or falls back to /app/my-cases. Does not invent a competing canvas.
 */
export default function LegacyCaseRedirect() {
  const location = useLocation();
  const activeCaseId = getActiveCaseId();
  const targetPath = activeCaseId ? `/app/cases/${activeCaseId}` : '/app/my-cases';
  return <Navigate to={`${targetPath}${location.search}${location.hash}`} replace />;
}
