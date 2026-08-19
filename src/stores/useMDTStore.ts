import { create } from 'zustand';
import { persist, StateStorage, createJSONStorage } from 'zustand/middleware';
import { get, set, del } from 'idb-keyval';

// Custom IndexedDB storage adapter for Zustand
const idbStorage: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    return (await get(name)) || null;
  },
  setItem: async (name: string, value: string): Promise<void> => {
    await set(name, value);
  },
  removeItem: async (name: string): Promise<void> => {
    await del(name);
  },
};

export type MDTPhase = 'intake' | 'dashboard' | 'select' | 'assessment' | 'compiling' | 'conference' | 'report' | 'action_plan';

interface MDTState {
  phase: MDTPhase;
  dashboardTab: 'specialists' | 'mdt';
  intakeData: {
    chiefComplaint: string;
    history: string;
    redFlags: boolean;
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
      partialize: (state) => ({ 
        phase: state.phase,
        dashboardTab: state.dashboardTab,
        intakeData: state.intakeData,
        selectedSpecialists: state.selectedSpecialists,
        specialistTranscripts: state.specialistTranscripts
      }) // Omit transient UI states like isSelecting
    }
  )
);
