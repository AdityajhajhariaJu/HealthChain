import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type MDTPhase = 'intake' | 'dashboard' | 'select' | 'assessment' | 'conference' | 'report' | 'action_plan';

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
    }
  )
);
