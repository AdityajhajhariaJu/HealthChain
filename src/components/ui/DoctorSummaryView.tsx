import React, { useEffect, useState } from 'react';
import { Clipboard, FileText } from 'lucide-react';
import { formatGutVisitNote, getGutSnapshot } from '../../services/GutHealthSummary';

/** Source-based visit preparation retained under the legacy Doctor Export route. */
export const DoctorSummaryView: React.FC = () => {
  const [revision, setRevision] = useState(0);
  const [message, setMessage] = useState('');
  useEffect(() => {
    const refresh = () => setRevision((value) => value + 1);
    window.addEventListener('hc_profile_updated', refresh);
    window.addEventListener('storage', refresh);
    return () => { window.removeEventListener('hc_profile_updated', refresh); window.removeEventListener('storage', refresh); };
  }, []);
  void revision;
  const snapshot = getGutSnapshot();
  const note = formatGutVisitNote(snapshot);
  const copy = async () => {
    try { await navigator.clipboard.writeText(note); setMessage('Visit note copied.'); }
    catch { setMessage('Copy failed. You can select the text below.'); }
  };
  return <section style={{ background: 'linear-gradient(145deg,#FFFCFA,#FFF3EF)', border: '1px solid #ECD9D0', borderRadius: 20, padding: 18, color: '#493830' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
      <span aria-hidden="true" style={{ width: 43, height: 43, borderRadius: 14, display: 'grid', placeItems: 'center', color: '#9B675B', background: 'radial-gradient(circle at 30% 25%,#FFF,#F7DED4 72%,#ECC3B4)', boxShadow: 'inset 0 1px 2px #FFF,0 4px 12px #C18E7950' }}><FileText size={20} /></span>
      <div><h2 className="serif-heading" style={{ margin: 0, fontSize: 21 }}>Visit notes</h2><p style={{ margin: '3px 0 0', fontSize: 13, color: '#78655D' }}>A draft from your recorded entries, for you to review before sharing.</p></div>
    </div>
    <p style={{ color: '#78655D', lineHeight: 1.5 }}>This note separates missing information from recorded observations. It cannot establish a trigger, diagnosis, or treatment outcome.</p>
    <button type="button" onClick={copy} style={{ minHeight: 44, border: '1px solid #D8A999', background: '#9B675B', color: 'white', borderRadius: 11, padding: '9px 15px', fontWeight: 700, cursor: 'pointer' }}><Clipboard size={15} style={{ verticalAlign: 'middle', marginRight: 5 }} />Copy visit note</button>
    {message && <p role="status" style={{ color: '#765248' }}>{message}</p>}
    <pre style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', fontFamily: 'inherit', fontSize: 13, lineHeight: 1.55, background: '#FFFDFC', padding: 16, border: '1px solid #ECD9D0', borderRadius: 12, marginBottom: 0 }}>{note}</pre>
  </section>;
};
