import { atom } from 'jotai';

export type TimerMode = 'work' | 'shortBreak' | 'longBreak';

export interface FocusTimerState {
  mode: TimerMode;
  durations: { work: number; shortBreak: number; longBreak: number };
  timeLeft: number; // seconds
  isActive: boolean;
  endTimestamp: number | null; // epoch ms when the timer should finish
}

// default 25/5/15 durations
export const focusTimerAtom = atom<FocusTimerState>({
  mode: 'work',
  durations: { work: 25, shortBreak: 5, longBreak: 15 },
  timeLeft: 25 * 60,
  isActive: false,
  endTimestamp: null,
});
