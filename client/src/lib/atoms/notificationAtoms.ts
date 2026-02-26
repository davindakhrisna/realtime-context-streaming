import { atom } from 'jotai';

export type NotificationSettings = {
  sessionReminderMinutes: 0 | 5 | 10 | 30;
  dailyStreak: boolean;
  weeklySummary: boolean;
  motivationalQuotes: boolean;
};

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  sessionReminderMinutes: 10,
  dailyStreak: true,
  weeklySummary: true,
  motivationalQuotes: false,
};

export const notificationSettingsAtom = atom<NotificationSettings>(() => {
  if (typeof window === 'undefined') return DEFAULT_NOTIFICATION_SETTINGS;
  const saved = localStorage.getItem('studyai_notification_settings');
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      return DEFAULT_NOTIFICATION_SETTINGS;
    }
  }
  return DEFAULT_NOTIFICATION_SETTINGS;
});

// writeable atom that persists changes
export const persistNotificationSettingsAtom = atom(
  (get) => get(notificationSettingsAtom),
  (get, set, newSettings: NotificationSettings) => {
    set(notificationSettingsAtom, newSettings);
    if (typeof window !== 'undefined') {
      localStorage.setItem('studyai_notification_settings', JSON.stringify(newSettings));
    }
  }
);
