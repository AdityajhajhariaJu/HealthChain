import { ArrowLeft, ShieldCheck } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Link, useSearchParams } from 'react-router-dom';
import { getLegalDocument, LEGAL_CONFIG, legalIdentityComplete, POLICY_DATE, POLICY_LINKS, policyHeadingId } from '../../../shared/legal-documents.js';
import './LegalPage.css';

export default function LegalPage({ document: documentId = 'terms', hub = false }: { document?: string; hub?: boolean }) {
  const [params, setParams] = useSearchParams();
  const region = params.get('region') === 'us' ? 'us' : 'international';
  const requested = hub ? params.get('document') || documentId : documentId;
  const selected = POLICY_LINKS.find(link => link.id === requested) || POLICY_LINKS[0];
  const text = getLegalDocument(selected.id, region);
  const headings = [...text.matchAll(/^## (.+)$/gm)].map(match => match[1]);
  return <main className="hc-legal-page">
    <div className="hc-legal-container">
      <header className="hc-legal-header">
        <Link to="/" className="hc-legal-back"><ArrowLeft size={18} /> HealthChain</Link>
        <Link to="/terms-policies"><ShieldCheck size={18} /> Policies and your choices</Link>
      </header>
      {!legalIdentityComplete() && <p className="hc-legal-draft" role="status">
        Publication draft for operator review. Identity, eligibility, retention and launch markets
        must be confirmed before this notice is published as final.
      </p>}
      <h1>{hub ? 'Terms and policies' : selected.title}</h1>
      <p className="hc-legal-date">Updated {POLICY_DATE} · Applies to web, Android and iOS</p>
      <div className="hc-legal-regions" role="group" aria-label="Policy region">
        {(['us', 'international'] as const).map(value => <button key={value}
          aria-pressed={region === value} onClick={() => {
            const next = new URLSearchParams(params); next.set('region', value); setParams(next);
          }}>{value === 'us' ? 'United States' : 'International'}</button>)}
      </div>
      <nav className="hc-legal-documents" aria-label="Legal documents">
        <Link to="/pricing">Pricing and plans</Link>
        {POLICY_LINKS.map(link => hub ? <button key={link.id} aria-current={selected.id === link.id ? 'page' : undefined}
          onClick={() => { const next = new URLSearchParams(params); next.set('document', link.id); setParams(next); }}>
          {link.title}
        </button> : <Link key={link.id} to={link.path + '?region=' + region}
          aria-current={selected.id === link.id ? 'page' : undefined}>{link.title}</Link>)}
      </nav>
      {hub && <h2 className="hc-legal-selected-title">{selected.title}</h2>}
      <div className="hc-legal-layout">
        <nav className="hc-legal-contents" aria-label="On this page">
          <strong>On this page</strong>
          <ol>{headings.map(title => <li key={title}><a href={'#' + policyHeadingId(title)}>{title}</a></li>)}</ol>
        </nav>
        <article className="hc-legal-document" aria-label={selected.title}>
          <ReactMarkdown components={{
            h2: ({ children }) => <h2 id={policyHeadingId(children)}>{children}</h2>,
            a: ({ href, children }) => <a href={href} {...(href?.startsWith('http') ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>{children}</a>,
          }}>{text}</ReactMarkdown>
        </article>
      </div>
      <footer className="hc-legal-footer">
        <Link to="/delete-account">Delete your account</Link>
        <Link to="/app/settings">Privacy controls</Link>
        <a href={'mailto:' + LEGAL_CONFIG.privacyEmail}>Privacy and support contact</a>
        <button onClick={() => window.print()}>Print or save this notice</button>
      </footer>
    </div>
  </main>;
}
