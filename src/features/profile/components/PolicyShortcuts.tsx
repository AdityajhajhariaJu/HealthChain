import { ChevronRight, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import './PolicyShortcuts.css';

const policies = [
  { to: '/terms', label: 'Terms of Service' },
  { to: '/privacy', label: 'Privacy Policy' },
  { to: '/privacy-security', label: 'Privacy and security' },
  { to: '/delete-account', label: 'Account deletion' },
];

export default function PolicyShortcuts() {
  return <section className="hc-policy-shortcuts" aria-labelledby="hc-policy-shortcuts-title">
    <h2 id="hc-policy-shortcuts-title"><ShieldCheck size={20} aria-hidden="true" /> Terms and policies</h2>
    <p>Read our policies and choose the United States or International edition.</p>
    <nav aria-label="Terms and privacy policies">
      <Link className="hc-policy-shortcuts-hub" to="/terms-policies">
        <span>All policies</span><ChevronRight size={18} aria-hidden="true" />
      </Link>
      {policies.map(policy => <Link key={policy.to} to={policy.to}>
        <span>{policy.label}</span><ChevronRight size={18} aria-hidden="true" />
      </Link>)}
    </nav>
  </section>;
}
