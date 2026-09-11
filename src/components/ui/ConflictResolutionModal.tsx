import React, { useState } from 'react';
import { AlertOctagon, X, Check, ArrowRight, HardDrive, Cloud } from 'lucide-react';
import { ConflictRecord } from '../../services/SyncTypes';
import { CaseItem, getCases, saveCasePrepCase } from '../../services/CaseEngine';

interface ConflictResolutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  caseItem: CaseItem | null;
  onResolved?: (updatedCase: CaseItem) => void;
}

export const ConflictResolutionModal: React.FC<ConflictResolutionModalProps> = ({
  isOpen,
  onClose,
  caseItem,
  onResolved,
}) => {
  if (!isOpen || !caseItem) return null;

  const unresolvedConflicts = (caseItem.conflicts || []).filter((c) => !c.resolved);
  const [selectedConflictIndex, setSelectedConflictIndex] = useState(0);

  if (unresolvedConflicts.length === 0) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
        <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 text-center shadow-2xl">
          <div className="w-12 h-12 rounded-full bg-teal-500/10 text-teal-400 flex items-center justify-center mx-auto mb-4 border border-teal-500/20">
            <Check size={24} />
          </div>
          <h3 className="text-lg font-semibold text-slate-100 mb-2">All Conflicts Resolved</h3>
          <p className="text-sm text-slate-400 mb-6">
            Every concurrent edit between your devices has been reconciled into your unified medical record.
          </p>
          <button
            onClick={onClose}
            className="w-full py-2.5 px-4 bg-teal-600 hover:bg-teal-500 text-white rounded-xl font-medium text-sm transition-all"
          >
            Done
          </button>
        </div>
      </div>
    );
  }

  const currentConflict = unresolvedConflicts[selectedConflictIndex] || unresolvedConflicts[0];

  const handleResolve = (choice: 'keep_local' | 'keep_remote' | 'merge') => {
    const updatedConflicts = (caseItem.conflicts || []).map((c) => {
      if (c.id === currentConflict.id) {
        return {
          ...c,
          resolved: true,
          resolution: choice === 'merge' ? 'merged' : choice,
          resolvedAt: new Date().toISOString(),
        } as ConflictRecord;
      }
      return c;
    });

    // Apply chosen resolution to case
    let updatedCase = { ...caseItem, conflicts: updatedConflicts };

    if (currentConflict.entityType === 'question') {
      const qId = currentConflict.entityId;
      updatedCase.questions = (updatedCase.questions || []).map((q) => {
        if (q.id === qId) {
          if (choice === 'keep_local') {
            return {
              ...q,
              status: currentConflict.localValue?.status || q.status,
              outcomeNote: currentConflict.localValue?.outcomeNote || q.outcomeNote,
            };
          } else if (choice === 'keep_remote') {
            return {
              ...q,
              status: currentConflict.remoteValue?.status || q.status,
              outcomeNote: currentConflict.remoteValue?.outcomeNote || q.outcomeNote,
            };
          } else {
            // Merge notes
            const combinedNote = [currentConflict.localValue?.outcomeNote, currentConflict.remoteValue?.outcomeNote]
              .filter(Boolean)
              .join(' | ');
            return {
              ...q,
              outcomeNote: combinedNote,
            };
          }
        }
        return q;
      });
    } else if (currentConflict.entityType === 'event') {
      const evId = currentConflict.entityId;
      updatedCase.events = (updatedCase.events || []).map((ev) => {
        if (ev.id === evId) {
          if (choice === 'keep_local') {
            return { ...ev, note: currentConflict.localValue?.note || ev.note };
          } else if (choice === 'keep_remote') {
            return { ...ev, note: currentConflict.remoteValue?.note || ev.note };
          } else {
            return {
              ...ev,
              note: `${currentConflict.localValue?.note || ''} (Sync Note: ${currentConflict.remoteValue?.note || ''})`,
            };
          }
        }
        return ev;
      });
    }

    if (onResolved) {
      onResolved(updatedCase);
    }

    // Advance to next conflict or close if finished
    if (unresolvedConflicts.length <= 1) {
      onClose();
    } else {
      setSelectedConflictIndex((prev) => Math.min(prev, unresolvedConflicts.length - 2));
    }
  };

  const formatVal = (val: any) => {
    if (typeof val === 'string') return val;
    if (typeof val === 'object' && val !== null) {
      return Object.entries(val)
        .map(([k, v]) => `${k}: ${v}`)
        .join(', ');
    }
    return String(val ?? '');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-xl w-full p-6 shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-500/15 text-purple-400 flex items-center justify-center border border-purple-500/30">
              <AlertOctagon size={20} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-100">Simultaneous Edits Detected</h2>
              <p className="text-xs text-slate-400">
                Conflict {selectedConflictIndex + 1} of {unresolvedConflicts.length}: {currentConflict.entityType} ({currentConflict.field})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800 transition-all"
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="my-5 overflow-y-auto space-y-4">
          <p className="text-sm text-slate-300">
            This item was modified on two devices before syncing. Choose how you want to record it in your unified timeline:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Local Card */}
            <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2 text-xs font-semibold text-teal-400">
                  <HardDrive size={15} />
                  <span>This Device</span>
                </div>
                <div className="p-3 bg-slate-900/80 rounded-lg text-sm text-slate-200 break-words font-mono text-xs">
                  {formatVal(currentConflict.localValue)}
                </div>
              </div>
              <button
                onClick={() => handleResolve('keep_local')}
                className="mt-4 w-full py-2 px-3 bg-slate-700 hover:bg-teal-600/80 text-slate-200 hover:text-white rounded-lg text-xs font-medium transition-all"
              >
                Keep This Version
              </button>
            </div>

            {/* Remote Card */}
            <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2 text-xs font-semibold text-purple-400">
                  <Cloud size={15} />
                  <span>Other Device</span>
                </div>
                <div className="p-3 bg-slate-900/80 rounded-lg text-sm text-slate-200 break-words font-mono text-xs">
                  {formatVal(currentConflict.remoteValue)}
                </div>
              </div>
              <button
                onClick={() => handleResolve('keep_remote')}
                className="mt-4 w-full py-2 px-3 bg-slate-700 hover:bg-purple-600/80 text-slate-200 hover:text-white rounded-lg text-xs font-medium transition-all"
              >
                Keep Other Version
              </button>
            </div>
          </div>

          {/* Merge Both Option */}
          <div className="p-3 rounded-xl bg-slate-800/30 border border-slate-700/30 flex items-center justify-between">
            <span className="text-xs text-slate-400">Want to retain notes from both devices?</span>
            <button
              onClick={() => handleResolve('merge')}
              className="py-1.5 px-3 bg-teal-600/20 text-teal-300 hover:bg-teal-600/30 border border-teal-500/30 rounded-lg text-xs font-medium transition-all"
            >
              Combine Both Notes
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-slate-200 transition-all"
          >
            Review Later
          </button>
        </div>
      </div>
    </div>
  );
};
