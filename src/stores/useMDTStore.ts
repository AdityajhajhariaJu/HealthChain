import { create } from 'zustand';
import { persist, StateStorage, createJSONStorage } from 'zustand/middleware';
import { get, set, del } from 'idb-keyval';
import { getItemSync, setItemSync, removeItemSync } from '../services/storage';
import { getAccountScope } from '../services/RunContext';

const scopedKey = (name: string) => `${name}_${getAccountScope()}`;

const idbStorage: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    try {
      const key = scopedKey(name);
      const val = await get(key);
      if (val !== undefined && val !== null) return typeof val === 'string' ? val : JSON.stringify(val);
      return getItemSync(key);
    } catch (e) { return getItemSync(scopedKey(name)); }
  },
  setItem: async (name: string, value: string): Promise<void> => {
    try { await set(scopedKey(name), value); } catch (e) { try { setItemSync(scopedKey(name), value); } catch (e2) {} }
  },
  removeItem: async (name: string): Promise<void> => {
    try { await del(scopedKey(name)); } catch (e) {}
    try { removeItemSync(scopedKey(name)); } catch (e2) {}
  },
};

export type MDTPhase = 'intake' | 'dashboard' | 'select' | 'assessment' | 'compiling' | 'conference' | 'report' | 'action_plan' | 'failed';

interface MDTState {
  phase: MDTPhase;
  dashboardTab: 'specialists' | 'mdt';
  intakeData: {
    chiefComplaint: string;
    history: string;
    redFlags: boolean;
    sharedCaseMaterial?: string;
    importedCaseId?: string;
    importedReviewId?: string;
  };
  selectedSpecialists: any[];
  specialistTranscripts: Record<string, any[]>;
  isSelecting: boolean;
  
  setPhase: (phase: MDTPhase) => void;
  setDashboardTab: (tab: 'specialists' | 'mdt') => void;
  setIntakeData: (data: Partial<MDTState['intakeData']>) => void;
  setSelectedSpecialists: (specialists: any[]) => void;
  setSpecialistTranscripts: (transcripts: Record<string, any[]> | ((prev: Record<string, any[]>) => Record<string, any[]>)) => void;
  setIsSelecting: (isSelecting: boolean) => void;
  reset: () => void;
}

const initialState = {
  phase: 'intake' as MDTPhase,
  dashboardTab: 'specialists' as const,
  intakeData: {
    chiefComplaint: '',
    history: '',
    redFlags: false,
  },
  selectedSpecialists: [],
  specialistTranscripts: {},
  isSelecting: false,
};

export const useMDTStore = create<MDTState>()(
  persist(
    (set) => ({
      ...initialState,
      setPhase: (phase) => set({ phase }),
      setDashboardTab: (dashboardTab) => set({ dashboardTab }),
      setIntakeData: (data) => set((state) => ({ intakeData: { ...state.intakeData, ...data } })),
      setSelectedSpecialists: (selectedSpecialists) => set({ selectedSpecialists }),
      setSpecialistTranscripts: (transcripts) => set((state) => ({
        specialistTranscripts: typeof transcripts === 'function' ? transcripts(state.specialistTranscripts) : transcripts
      })),
      setIsSelecting: (isSelecting) => set({ isSelecting }),
      reset: () => set(initialState),
    }),
    {
      name: 'hc_mdt_session',
      storage: createJSONStorage(() => idbStorage),
      // Only preserve the harmless intake draft and selected dashboard tab.
      // Running phases and AI transcripts must never resurrect after a reload,
      // account switch, or an interrupted request.
      partialize: (state) => ({
        phase: 'intake' as MDTPhase,
        dashboardTab: state.dashboardTab,
        intakeData: state.intakeData,
        selectedSpecialists: [],
        specialistTranscripts: {}
      })
    }
  )
);

export async function clearPersistedMDTSession() {
  const key = scopedKey('hc_mdt_session');
  try { await del(key); } catch {}
  try { removeItemSync(key); } catch {}
}
