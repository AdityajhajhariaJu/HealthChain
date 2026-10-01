import { create } from 'zustand';

export type IslandType = 'medication' | 'lab' | 'alert' | 'idle' | 'calm';

export interface ActionIslandState {
  currentState: IslandType;
  title: string;
  subtitle: string;
  actionText: string;
  onAction?: () => void;
  triggerIsland: (type: IslandType, title: string, subtitle: string, actionText?: string, onAction?: () => void) => void;
  dismissIsland: () => void;
}

export const useActionIslandStore = create<ActionIslandState>((set) => ({
  currentState: 'idle',
  title: '',
  subtitle: '',
  actionText: 'Confirm',
  onAction: undefined,
  triggerIsland: (type, title, subtitle, actionText = 'Confirm', onAction) => set({ currentState: type, title, subtitle, actionText, onAction }),
  dismissIsland: () => set({ currentState: 'idle', onAction: undefined })
}));
