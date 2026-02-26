import React, { useEffect } from 'react';
import { useAtom } from 'jotai';
import { focusTimerAtom } from '../atoms/focusTimerAtom';
import { requestNotificationPermission, setupDailyStreakReminder, setupWeeklySummaryReminder } from '../notifications';
import { pushNotificationAtom } from '../atoms/notificationHistoryAtom';
import type { NotificationRecord } from '../atoms/notificationHistoryAtom';

// helper for persistence keys
const STORAGE_KEY = 'studyai_focus_timer';

export function FocusTimerProvider({ children }: { children: React.ReactNode }) {
  const [timer, setTimer] = useAtom(focusTimerAtom);
  const [, pushNotification] = useAtom(pushNotificationAtom);

  // load stored state on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const now = Date.now();
        let newState = { ...timer, ...parsed } as any;
        if (parsed.isActive && parsed.endTimestamp) {
          const remaining = Math.max(0, Math.round((parsed.endTimestamp - now) / 1000));
          newState.timeLeft = remaining;
          newState.isActive = remaining > 0;
          if (remaining <= 0) {
            // timer expired while away
            newState.endTimestamp = null;
          }
        }
        setTimer(newState);
      } catch {
        // ignore
      }
    }
    // ask for notification permission & schedule reminders
    requestNotificationPermission().then(() => {
      setupDailyStreakReminder();
      setupWeeklySummaryReminder();
    });

    // listen for custom notification events and push to history atom
    const handler = (e: CustomEvent<NotificationRecord>) => {
      pushNotification(e.detail);
    };
    window.addEventListener('studyai-notification', handler as EventListener);
    return () => {
      window.removeEventListener('studyai-notification', handler as EventListener);
    };
    // we can't call hook inside listener, instead register separately below

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // tick interval; only active when timer.isActive
  useEffect(() => {
    if (!timer.isActive || !timer.endTimestamp) return;
    const id = setInterval(() => {
      const now = Date.now();
      const remaining = Math.max(0, Math.round((timer.endTimestamp! - now) / 1000));
      setTimer(t => ({
        ...t,
        timeLeft: remaining,
        isActive: remaining > 0,
        endTimestamp: remaining > 0 ? t.endTimestamp : null,
      }));
      if (remaining <= 0) {
        localStorage.removeItem(STORAGE_KEY);
      }
    }, 1000);
    return () => clearInterval(id);
  }, [timer.isActive, timer.endTimestamp, setTimer]);

  // persist whenever timer object changes
  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(timer));
  }, [timer]);

  return <>{children}</>;
}
