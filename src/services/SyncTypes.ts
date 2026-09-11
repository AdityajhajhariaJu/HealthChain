export type SyncStatusState =
  | 'saved_locally'
  | 'sync_pending'
  | 'synced'
  | 'conflict_needs_review'
  | 'sync_failed';

export interface ConflictRecord {
  id: string;
  entityType: 'case' | 'event' | 'question' | 'record' | 'brief';
  entityId: string;
  field: string;
  localValue: any;
  remoteValue: any;
  localTimestamp?: string;
  remoteTimestamp?: string;
  detectedAt: string;
  resolved: boolean;
  resolution?: 'keep_local' | 'keep_remote' | 'merged' | 'manual';
  resolvedAt?: string;
}

export interface Tombstone {
  id: string;
  entityType: 'case' | 'record';
  deletedAt: string;
  userId?: string;
  profileId?: string;
}

export interface SyncStatusDetail {
  state: SyncStatusState;
  pendingCount: number;
  lastSyncedAt?: string;
  lastError?: string;
  conflictsCount: number;
}
