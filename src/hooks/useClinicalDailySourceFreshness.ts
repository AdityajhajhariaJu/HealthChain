import { useEffect, useState } from 'react';
import { sourceFreshness } from '../../shared/health-source-freshness';
import { captureAccountScope, isAccountScopeCurrent } from '../services/AccountScope';
import type { CaseItem } from '../services/CaseEngine';
import { listObservationHistory } from '../services/HealthObservationService';

/** Keep saved interpretations from outliving corrected or deleted daily sources. */
export function useClinicalDailySourceFreshness(
  sourceCase?: CaseItem | null
): 'current' | 'checking' | 'changed' {
  const manifests = (sourceCase?.medicalRecords || []).flatMap((record) =>
    record.evidenceManifest ? [record.evidenceManifest] : []
  );
  const key = JSON.stringify(
    manifests.map((manifest) => [
      manifest.ownerId,
      manifest.profileId,
      manifest.sources.map((source) => [source.id, source.revision]),
    ])
  );
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState({ key: '', revision: -1, current: false });
  useEffect(() => {
    const changed = () => setRevision((value) => value + 1);
    window.addEventListener('hc_observations_updated', changed);
    window.addEventListener('hc_profile_updated', changed);
    window.addEventListener('hc_logout', changed);
    return () => {
      window.removeEventListener('hc_observations_updated', changed);
      window.removeEventListener('hc_profile_updated', changed);
      window.removeEventListener('hc_logout', changed);
    };
  }, []);
  useEffect(() => {
    if (!manifests.length) return;
    let active = true;
    const account = captureAccountScope();
    void listObservationHistory()
      .then((current) => {
        const valid =
          isAccountScopeCurrent(account) &&
          manifests.every(
            (manifest) =>
              manifest.ownerId === account.accountId &&
              manifest.profileId === account.profileId &&
              sourceFreshness(manifest.sources, current).every(
                (source) => source.status === 'current'
              )
          );
        if (active) setResult({ key, revision, current: valid });
      })
      .catch(() => {
        if (active) setResult({ key, revision, current: false });
      });
    return () => {
      active = false;
    };
  }, [key, revision]);
  if (!manifests.length) return 'current';
  if (result.key !== key || result.revision !== revision) return 'checking';
  return result.current ? 'current' : 'changed';
}
