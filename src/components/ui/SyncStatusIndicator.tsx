import React, { useState, useEffect } from 'react';
import { CheckCircle2, UploadCloud, CloudOff, Smartphone, AlertOctagon, RefreshCw } from 'lucide-react';
import { flushSyncOutbox, getSyncStatus } from '../../services/SyncOutbox';
import { supabase } from '../../services/supabaseClient';
import { captureAccountScope, isAccountScopeCurrent } from '../../services/AccountScope';
import { SyncStatusState } from '../../services/SyncTypes';

interface SyncStatusIndicatorProps {
  className?: string;
  onConflictClick?: () => void;
}

export const SyncStatusIndicator: React.FC<SyncStatusIndicatorProps> = ({ className = '', onConflictClick }) => {
  const [status, setStatus] = useState<SyncStatusState>('saved_locally');
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    let syncRevision = 0;

    async function checkInitialStatus() {
      const revision = syncRevision;
      const scope = captureAccountScope();
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user || session.user.id !== scope.accountId) {
          if (mounted) setStatus('saved_locally');
          return;
        }
        const detail = await getSyncStatus(session.user.id);
        if (mounted && revision === syncRevision && isAccountScopeCurrent(scope)) {
          setPendingCount(detail.pendingCount);
          setStatus(previous => detail.state === 'sync_pending' && (previous === 'sync_failed' || previous === 'conflict_needs_review') ? previous : detail.state);
        }
      } catch {
        if (mounted) setStatus('saved_locally');
      }
    }

    checkInitialStatus();

    const onPending = (e: Event) => {
      syncRevision += 1;
      const count = (e as CustomEvent)?.detail?.count || 1;
      setPendingCount(count);
      setStatus('sync_pending');
      setErrorMessage(null);
    };

    const onComplete = () => {
      ++syncRevision;
      setIsSyncing(false);
      void checkInitialStatus();
    };

    const onError = (e: Event) => {
      syncRevision += 1;
      const err = (e as CustomEvent)?.detail;
      setErrorMessage(err?.message || 'Sync failed');
      setStatus('sync_failed');
      setIsSyncing(false);
    };

    const onConflict = () => {
      syncRevision += 1;
      setStatus('conflict_needs_review');
      setIsSyncing(false);
    };

    window.addEventListener('hc_sync_pending', onPending);
    window.addEventListener('hc_sync_complete', onComplete);
    window.addEventListener('hc_sync_error', onError);
    window.addEventListener('hc_sync_conflict', onConflict);

    return () => {
      mounted = false;
      window.removeEventListener('hc_sync_pending', onPending);
      window.removeEventListener('hc_sync_complete', onComplete);
      window.removeEventListener('hc_sync_error', onError);
      window.removeEventListener('hc_sync_conflict', onConflict);
    };
  }, []);

  const handleManualRetry = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      await flushSyncOutbox();
    } catch {
      setStatus('sync_failed');
    } finally {
      setIsSyncing(false);
    }
  };

  if (status === 'synced') {
    return (
      <div
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-teal-500/10 text-teal-400 border border-teal-500/20 transition-all ${className}`}
        title="Cloud-enabled changes are synced. Original documents stay on this device."
        aria-label="Status: Synced"
      >
        <CheckCircle2 size={14} className="text-teal-400" />
        <span>Synced</span>
      </div>
    );
  }

  if (status === 'sync_pending') {
    return (
      <button
        onClick={handleManualRetry}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-800/50 text-slate-300 border border-slate-700/50 active:scale-95 transition-all hover:bg-slate-700/50 ${className}`}
        title="Syncing pending updates... Tap to sync now"
        aria-label={`Status: Sync pending (${pendingCount})`}
      >
        <UploadCloud size={14} className={isSyncing ? 'animate-spin' : 'text-slate-400'} />
        <span>Saving {pendingCount > 0 ? `(${pendingCount})` : ''}</span>
      </button>
    );
  }

  if (status === 'conflict_needs_review') {
    return (
      <button
        onClick={onConflictClick}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-500/15 text-purple-300 border border-purple-500/30 active:scale-95 transition-all hover:bg-purple-500/25 ${className}`}
        title="Simultaneous edits detected between devices. Tap to review."
        aria-label="Status: Conflict needs review"
      >
        <AlertOctagon size={14} className="text-purple-400" />
        <span>Conflict needs review</span>
      </button>
    );
  }

  if (status === 'sync_failed') {
    return (
      <button
        onClick={handleManualRetry}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-rose-500/10 text-rose-300 border border-rose-500/20 active:scale-95 transition-all hover:bg-rose-500/20 ${className}`}
        title={errorMessage || 'Sync failed. Your data is safe on this device. Tap to retry.'}
        aria-label="Status: Sync failed, retry available"
      >
        <CloudOff size={14} className="text-rose-400" />
        <span>Sync failed</span>
        <RefreshCw size={12} className={isSyncing ? 'animate-spin' : ''} />
      </button>
    );
  }

  // Fallback: Saved on this device (local first / offline / guest)
  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-800/60 text-slate-400 border border-slate-700/40 ${className}`}
      title="Saved securely on this device"
      aria-label="Status: Saved on this device"
    >
      <Smartphone size={14} className="text-slate-400" />
      <span>Saved on this device</span>
    </div>
  );
};
