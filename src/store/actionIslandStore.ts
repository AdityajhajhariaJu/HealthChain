import { create } from 'zustand';

export type IslandType = 'medication' | 'lab' | 'alert' | 'idle';

export interface ActionIslandState {
  currentState: IslandType;
  title: string;
  subtitle: string;
  actionText: string;
  triggerIsland: (type: IslandType, title: string, subtitle: string, actionText?: string) => void;
  dismissIsland: () => void;
}

export const useActionIslandStore = create<ActionIslandState>((set) => ({
  currentState: 'idle',
  title: '',
  subtitle: '',
  actionText: 'Confirm',
  triggerIsland: (type, title, subtitle, actionText = 'Confirm') => set({ currentState: type, title, subtitle, actionText }),
  dismissIsland: () => set({ currentState: 'idle' })
}));
