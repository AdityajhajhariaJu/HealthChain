import {
  CaseItem,
  CaseUpdate,
  ClinicalQuestion,
  MedicalRecord,
  ReviewSnapshot,
  CaseAction,
  AppointmentBrief,
} from './CaseEngine';
import { ConflictRecord } from './SyncTypes';

export interface MergeResult {
  merged: CaseItem;
  conflicts: ConflictRecord[];
  hasChanges: boolean;
}

function stableId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Merges two versions of a case (e.g. local offline edits vs remote server state)
 * without data loss. Independent additions are unioned by stable ID.
 * Competing edits to the same sub-entity generate inspectable ConflictRecords.
 */
export function mergeCaseItems(local: CaseItem, remote: CaseItem): MergeResult {
  if (!local && !remote) {
    throw new Error('Cannot merge null cases');
  }
  if (!local) return { merged: remote, conflicts: [], hasChanges: true };
  if (!remote) return { merged: local, conflicts: [], hasChanges: false };

  const now = new Date().toISOString();
  const conflicts: ConflictRecord[] = [];

  // Carry forward existing unresolved conflicts
  const existingConflicts = [...(local.conflicts || []), ...(remote.conflicts || [])];
  const conflictMap = new Map<string, ConflictRecord>();
  for (const c of existingConflicts) {
    if (!c.resolved) conflictMap.set(c.id, c);
  }

  // 1. Events Merge (Observations, notes, updates)
  const mergedEvents = mergeEvents(local.events || [], remote.events || [], local, remote, conflicts, now);

  // 2. Questions Merge
  const mergedQuestions = mergeQuestions(local.questions || [], remote.questions || [], local, remote, conflicts, now);

  // 3. Medical Records & Passages Merge
  const localRecords = local.medicalRecords || (local as any).records || [];
  const remoteRecords = remote.medicalRecords || (remote as any).records || [];
  const mergedRecords = mergeMedicalRecords(localRecords, remoteRecords);

  // 4. Appointment Briefs Merge
  const localBriefs = local.appointmentBriefs || (local as any).briefs;
  const remoteBriefs = remote.appointmentBriefs || (remote as any).briefs;
  const mergedAppointmentBriefs = mergeAppointmentBriefs(localBriefs, remoteBriefs);

  // 5. Reviews Merge
  const mergedReviews = mergeReviews(local.reviews || [], remote.reviews || []);

  // 6. Actions Merge
  const mergedActions = mergeActions(local.actions || [], remote.actions || []);

  // 7. Title & Metadata
  let title = local.title;
  if (local.title !== remote.title) {
    // If one title is default / untitled and other is specific, prefer specific
    if (local.title === 'Untitled health case' && remote.title !== 'Untitled health case') {
      title = remote.title;
    } else if (remote.title === 'Untitled health case') {
      title = local.title;
    } else {
      // Both have custom titles - record conflict
      conflicts.push({
        id: `conflict-title-${local.id}-${Date.now()}`,
        entityType: 'case',
        entityId: local.id,
        field: 'title',
        localValue: local.title,
        remoteValue: remote.title,
        localTimestamp: local.updatedAt,
        remoteTimestamp: remote.updatedAt,
        detectedAt: now,
        resolved: false,
      });
      // Deterministic: keep local for current device
      title = local.title;
    }
  }

  for (const c of conflicts) {
    conflictMap.set(c.id, c);
  }

  const baseRevision = Math.max(local.revision || 1, remote.revision || 1);
  const nextRevision = baseRevision + 1;

  const merged: CaseItem = {
    ...remote,
    ...local,
    id: local.id || remote.id,
    title,
    mode: local.mode || remote.mode,
    status: local.status === 'archived' || remote.status === 'archived' ? 'archived' : 'active',
    createdAt: local.createdAt && remote.createdAt
      ? new Date(local.createdAt).getTime() < new Date(remote.createdAt).getTime() ? local.createdAt : remote.createdAt
      : local.createdAt || remote.createdAt || now,
    updatedAt: now,
    revision: nextRevision,
    deletedAt: local.deletedAt || remote.deletedAt,
    events: mergedEvents,
    questions: mergedQuestions,
    medicalRecords: mergedRecords,
    appointmentBriefs: mergedAppointmentBriefs,
    reviews: mergedReviews,
    actions: mergedActions,
    differentials: local.differentials?.length ? local.differentials : remote.differentials,
    currentSummary: local.currentSummary && Object.keys(local.currentSummary).length ? local.currentSummary : remote.currentSummary,
    conflicts: Array.from(conflictMap.values()),
  };

  return {
    merged,
    conflicts: Array.from(conflictMap.values()),
    hasChanges: true,
  };
}

function mergeEvents(
  local: CaseUpdate[],
  remote: CaseUpdate[],
  localCase: CaseItem,
  remoteCase: CaseItem,
  conflicts: ConflictRecord[],
  now: string
): CaseUpdate[] {
  const map = new Map<string, CaseUpdate>();

  for (const ev of local) {
    if (ev?.id) map.set(ev.id, ev);
  }

  for (const ev of remote) {
    if (!ev?.id) continue;
    const existing = map.get(ev.id);
    if (!existing) {
      // Independent event added on remote survives
      map.set(ev.id, ev);
    } else {
      // Both exist with same ID: check if note/label diverged
      if (existing.note !== ev.note || existing.label !== ev.label) {
        conflicts.push({
          id: `conflict-event-${ev.id}-${Date.now()}`,
          entityType: 'event',
          entityId: ev.id,
          field: 'note',
          localValue: { label: existing.label, note: existing.note },
          remoteValue: { label: ev.label, note: ev.note },
          localTimestamp: localCase.updatedAt,
          remoteTimestamp: remoteCase.updatedAt,
          detectedAt: now,
          resolved: false,
        });
        // Deterministic: keep local note on local device
        map.set(ev.id, existing);
      }
    }
  }

  // Sort descending by date
  return Array.from(map.values())
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

function mergeQuestions(
  local: ClinicalQuestion[],
  remote: ClinicalQuestion[],
  localCase: CaseItem,
  remoteCase: CaseItem,
  conflicts: ConflictRecord[],
  now: string
): ClinicalQuestion[] {
  const map = new Map<string, ClinicalQuestion>();

  for (const q of local) {
    if (q?.id) map.set(q.id, q);
  }

  for (const q of remote) {
    if (!q?.id) continue;
    const existing = map.get(q.id);
    if (!existing) {
      // Independent question added on remote survives
      map.set(q.id, q);
    } else {
      // Both exist: check if status or answer diverged
      const statusDiverged = existing.status !== q.status;
      const answerDiverged = (existing.outcomeNote || '') !== (q.outcomeNote || '');

      if (statusDiverged || answerDiverged) {
        conflicts.push({
          id: `conflict-question-${q.id}-${Date.now()}`,
          entityType: 'question',
          entityId: q.id,
          field: statusDiverged && answerDiverged ? 'status_and_outcome' : statusDiverged ? 'status' : 'outcomeNote',
          localValue: { status: existing.status, outcomeNote: existing.outcomeNote },
          remoteValue: { status: q.status, outcomeNote: q.outcomeNote },
          localTimestamp: localCase.updatedAt,
          remoteTimestamp: remoteCase.updatedAt,
          detectedAt: now,
          resolved: false,
        });
        // Deterministic fallback: keep the more resolved status or local
        const statusPriority: Record<string, number> = {
          open: 1,
          prepared: 2,
          discussed: 3,
          deferred: 3,
          addressed: 4,
          resolved: 5,
        };
        const localScore = statusPriority[existing.status] || 0;
        const remoteScore = statusPriority[q.status] || 0;
        const winner = remoteScore > localScore ? q : existing;
        map.set(q.id, {
          ...winner,
          // If remote had an outcome note and local didn't, preserve remote's note
          outcomeNote: existing.outcomeNote || q.outcomeNote,
        });
      }
    }
  }

  return Array.from(map.values());
}

function mergeMedicalRecords(local: MedicalRecord[], remote: MedicalRecord[]): MedicalRecord[] {
  const map = new Map<string, MedicalRecord>();

  for (const r of local) {
    if (r?.id) map.set(r.id, r);
  }

  for (const r of remote) {
    if (!r?.id) continue;
    const existing = map.get(r.id);
    if (!existing) {
      // Independent medical record from remote survives
      map.set(r.id, r);
    } else {
      // Merge passages by passage ID
      const passageMap = new Map<string, any>();
      for (const p of existing.passages || []) if (p?.id) passageMap.set(p.id, p);
      for (const p of r.passages || []) if (p?.id && !passageMap.has(p.id)) passageMap.set(p.id, p);

      // Merge audit trails
      const combinedAudit = [...(existing.auditTrail || []), ...(r.auditTrail || [])];
      const auditMap = new Map<string, any>();
      for (const a of combinedAudit) {
        const k = `${a.action || a.originalText || ''}:${a.correctedAt || ''}:${a.field || a.correctedText || ''}`;
        if (!auditMap.has(k)) auditMap.set(k, a);
      }

      // If user corrected on either, preserve user_corrected
      const extractionStatus =
        existing.extractionStatus === 'user_corrected' || r.extractionStatus === 'user_corrected'
          ? 'user_corrected'
          : existing.extractionStatus || r.extractionStatus;

      map.set(r.id, {
        ...r,
        ...existing,
        passages: Array.from(passageMap.values()),
        auditTrail: Array.from(auditMap.values()),
        extractionStatus,
        findings: existing.extractionStatus === 'user_corrected' ? existing.findings : r.findings || existing.findings,
      });
    }
  }

  return Array.from(map.values());
}

function mergeAppointmentBriefs(
  local?: { current?: AppointmentBrief; history?: AppointmentBrief[] },
  remote?: { current?: AppointmentBrief; history?: AppointmentBrief[] }
): { current?: AppointmentBrief; history?: AppointmentBrief[] } | undefined {
  if (!local && !remote) return undefined;
  if (!local) return remote;
  if (!remote) return local;

  const historyMap = new Map<string, AppointmentBrief>();
  const allBriefs: AppointmentBrief[] = [
    ...(local.history || []),
    ...(remote.history || []),
    ...(local.current ? [local.current] : []),
    ...(remote.current ? [remote.current] : []),
  ];

  for (const b of allBriefs) {
    if (!b) continue;
    const key = `${b.sourceFingerprint || ''}_${b.generatedAt || ''}`;
    if (!historyMap.has(key)) historyMap.set(key, b);
  }

  // Sort history descending by generatedAt
  const sortedHistory = Array.from(historyMap.values()).sort(
    (a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime()
  );

  const current = sortedHistory[0] || local.current || remote.current;
  const history = sortedHistory.slice(1);

  return { current, history };
}

function mergeReviews(local: ReviewSnapshot[], remote: ReviewSnapshot[]): ReviewSnapshot[] {
  const map = new Map<string, ReviewSnapshot>();
  for (const rev of local) if (rev?.id) map.set(rev.id, rev);
  for (const rev of remote) if (rev?.id && !map.has(rev.id)) map.set(rev.id, rev);

  return Array.from(map.values())
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

function mergeActions(local: CaseAction[], remote: CaseAction[]): CaseAction[] {
  const map = new Map<string, CaseAction>();
  for (const a of local) if (a?.id) map.set(a.id, a);
  for (const a of remote) if (a?.id && !map.has(a.id)) map.set(a.id, a);

  return Array.from(map.values());
}
