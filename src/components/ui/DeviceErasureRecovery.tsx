import React, { useEffect, useState } from 'react';
import { pendingErasedOwners } from '../../services/DurableHealthStorage';
import { eraseOwnerHealthData } from '../../services/AccountErasure';

export default function DeviceErasureRecovery() {
  const [owners, setOwners] = useState(pendingErasedOwners);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function retry() {
    if (busy) return;
    setBusy(true);
    try { for (const owner of pendingErasedOwners()) await eraseOwnerHealthData(owner); setError(''); }
    catch { setError('Device cleanup could not finish. Keep this app installed and retry.'); }
    finally { setOwners(pendingErasedOwners()); setBusy(false); }
  }
  useEffect(() => {
    const refresh = () => setOwners(pendingErasedOwners());
    window.addEventListener('hc_owner_erased', refresh);
    window.addEventListener('hc_erasure_cleanup_complete', refresh);
    if (pendingErasedOwners().length) void retry();
    return () => { window.removeEventListener('hc_owner_erased', refresh); window.removeEventListener('hc_erasure_cleanup_complete', refresh); };
  }, []);
  if (!owners.length) return null;
  return <div role="alert" style={{ position: 'fixed', top: 12, left: 12, right: 12, zIndex: 10000, padding: 14, background: '#fff', color: '#111827', border: '1px solid #e11d48', borderRadius: 12 }}>
    <strong>Finish removing deleted account data from this device</strong>
    <p>{error || 'The account was deleted remotely. Local device cleanup is still pending.'}</p>
    <button onClick={retry} disabled={busy}>{busy ? 'Removing device records…' : 'Retry device cleanup'}</button>
  </div>;
}
