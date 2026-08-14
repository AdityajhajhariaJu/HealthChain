import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

const routeNames: Record<string, string> = {
  app: 'Dashboard',
  today: 'Health Today',
  multi: 'Multiple-Specialists',
  mdthub: 'MDT Consensus',
  'my-cases': 'My Cases',
  pharmacy: 'Pharmacy Hub',
  dietician: 'Dietician',
  ava: 'Ava Health Buddy',
  reports: 'Lab Report Analyzer',
  trials: 'Clinical Trials',
  profile: 'Medical Profile',
  settings: 'Settings',
  cases: 'Case Details'
};

export default function Breadcrumbs() {
  const location = useLocation();
  const pathnames = location.pathname.split('/').filter((x) => x);

  // Don't show breadcrumbs on the main app dashboard
  if (pathnames.length <= 2 && pathnames[1] === 'today') {
    return null;
  }

  const isZeroMargin = ['/app/consult', '/app/collab', '/app/ava'].some(p => location.pathname.startsWith(p));

  return (
    <nav aria-label="breadcrumb" style={{ 
      padding: '10px 16px', 
      backgroundColor: 'var(--surface)', 
      border: '1px solid var(--border)', 
      borderRadius: '12px',
      marginBottom: isZeroMargin ? 0 : '20px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
    }}>
      <ol style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '8px', 
        listStyle: 'none', 
        padding: 0, 
        margin: 0,
        fontSize: '14px',
        color: 'var(--text-muted)'
      }}>
        <li>
          <Link to="/app/today" style={{ color: 'var(--text-muted)', textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
            <Home size={16} />
          </Link>
        </li>
        
        {pathnames.map((value, index) => {
          // Skip 'app' since Home represents it
          if (value === 'app') return null;

          let to = `/${pathnames.slice(0, index + 1).join('/')}`;
          if (to === '/app/cases') {
            to = '/app/my-cases';
          }
          const isLast = index === pathnames.length - 1;
          const name = routeNames[value] || value;

          return (
            <React.Fragment key={to}>
              <ChevronRight size={16} />
              <li>
                {isLast ? (
                  <span style={{ color: 'var(--text-main)', fontWeight: 500 }} aria-current="page">
                    {name.charAt(0).toUpperCase() + name.slice(1)}
                  </span>
                ) : (
                  <Link to={to} style={{ color: 'var(--teal)', textDecoration: 'none' }}>
                    {name.charAt(0).toUpperCase() + name.slice(1)}
                  </Link>
                )}
              </li>
            </React.Fragment>
          );
        })}
      </ol>
    </nav>
  );
}
