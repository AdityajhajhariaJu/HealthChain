import { useEffect, useState } from 'react';
import { getCases, type CaseItem } from '../services/CaseEngine';

export function useCaseWorkspace(): CaseItem[] {
  const [cases, setCases] = useState(() => [...getCases()]);
  useEffect(() => {
    const refresh = () => setCases([...getCases()]);
    window.addEventListener('hc_cases_updated', refresh);
    window.addEventListener('hc_logout', refresh);
    refresh();
    return () => {
      window.removeEventListener('hc_cases_updated', refresh);
      window.removeEventListener('hc_logout', refresh);
    };
  }, []);
  return [...cases].sort((a, b) => (Date.parse(b.updatedAt) || 0) - (Date.parse(a.updatedAt) || 0));
}
