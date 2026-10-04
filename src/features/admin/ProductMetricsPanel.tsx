import { useEffect, useState } from 'react';
import { apiEndpoint } from '../../services/ApiEndpoint';
import { captureAccountScope, isAccountScopeCurrent } from '../../services/AccountScope';
import { supabase } from '../../services/supabaseClient';

interface MetricRow { day: string; event: string; dimension: string; platform: string; hits: number; }
const names: Record<string, string> = { page_view: 'Visits', feature_used: 'Workspace actions',
  button_click: 'Buttons', onboarding: 'Onboarding', audio_action: 'Audio', ai_request: 'AI requests',
  begin_checkout: 'Checkout starts', purchase: 'Reported checkout completions', app_error: 'App errors' };
export default function ProductMetricsPanel() {
  const [days, setDays] = useState(30);
  const [revision, setRevision] = useState(0);
  const [rows, setRows] = useState<MetricRow[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const request = new AbortController();
    const scope = captureAccountScope();
    setLoading(true); setError(''); setRows([]);
    void (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (!data.session || !isAccountScopeCurrent(scope)) throw new Error('Sign in with an authorized administrator account.');
        const response = await fetch(apiEndpoint(`/api/product-metrics?days=${days}`), {
          headers: { Authorization: `Bearer ${data.session.access_token}` }, signal: request.signal,
        });
        if (!response.ok) throw new Error(response.status === 403 ? 'This account cannot view product reports.' : 'Product reports could not load. Please retry.');
        const result = await response.json();
        if (!request.signal.aborted && isAccountScopeCurrent(scope)) setRows(result.rows || []);
      } catch (failure) {
        if (!request.signal.aborted && isAccountScopeCurrent(scope)) setError(failure instanceof Error ? failure.message : 'Product reports could not load.');
      } finally { if (!request.signal.aborted) setLoading(false); }
    })();
    return () => request.abort();
  }, [days, revision]);
  const totals = new Map<string, number>();
  for (const row of rows) {
    const label = `${names[row.event] || row.event} · ${row.dimension} · ${row.platform}`;
    totals.set(label, (totals.get(label) || 0) + Number(row.hits));
  }
  const download = () => {
    const csv = ['day,event,dimension,platform,count', ...rows.map(row => [row.day, row.event, row.dimension, row.platform, row.hits].join(','))].join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a'); link.href = url; link.download = `healthchain-product-counts-${days}-days.csv`; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return <section aria-label="Product analytics" className="bg-white rounded-3xl border border-slate-200 p-6 mb-8">
    <h2 className="text-xl font-bold text-slate-900">Product analytics</h2>
    <p className="text-sm text-slate-600 my-3">Consenting visitors' combined daily counts. These are event counts, not unique users, individual histories or verified revenue. Health details and selected sound names are excluded. Up to 90 days are retained.</p>
    <div className="flex flex-wrap gap-3 mb-4">
      <label>Period <select aria-label="Analytics period" value={days} onChange={event => setDays(Number(event.target.value))} className="border rounded-lg p-2">
        <option value={7}>7 days</option><option value={30}>30 days</option><option value={90}>90 days</option>
      </select></label>
      <button type="button" onClick={() => setRevision(value => value + 1)} disabled={loading} className="border rounded-lg px-3">Refresh counts</button>
      <button type="button" onClick={download} disabled={loading || !!error || !rows.length} className="border rounded-lg px-3">Download counts CSV</button>
    </div>
    {loading ? <p role="status">Loading counts...</p> : error ? <p role="alert">{error}</p> : !rows.length ? <p>No optional measurement received in this period.</p> :
      <div style={{ overflowX: 'auto' }}><table className="w-full text-left text-sm"><thead><tr><th scope="col" className="p-2">Event / category / platform</th><th scope="col" className="p-2">Count</th></tr></thead>
        <tbody>{[...totals].sort((a, b) => b[1] - a[1]).map(([label, count]) => <tr key={label}><td className="p-2 border-t">{label}</td><td className="p-2 border-t">{count.toLocaleString()}</td></tr>)}</tbody></table></div>}
  </section>;
}
