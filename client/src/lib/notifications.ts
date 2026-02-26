import type { Session } from '../pages/Schedule';
import { DEFAULT_NOTIFICATION_SETTINGS } from './atoms/notificationAtoms';
import type { NotificationSettings } from './atoms/notificationAtoms';

const STORAGE_KEY = 'studyai_notification_settings';

export function loadNotificationSettings(): NotificationSettings {
  if (typeof window === 'undefined') return DEFAULT_NOTIFICATION_SETTINGS;
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      return DEFAULT_NOTIFICATION_SETTINGS;
    }
  }
  return DEFAULT_NOTIFICATION_SETTINGS;
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  const perm = await Notification.requestPermission();
  return perm === 'granted';
}

export function notify(title: string, options?: NotificationOptions) {
  if (typeof window === 'undefined') return;
  const record = { id: Date.now(), title, body: options?.body, timestamp: Date.now() };
  // emit an event for in-app listeners (history)
  window.dispatchEvent(new CustomEvent('studyai-notification', { detail: record }));

  if (Notification.permission === 'granted') {
    new Notification(title, options);
  }
}

export function scheduleSessionReminder(session: Session) {
  const settings = loadNotificationSettings();
  const offset = settings.sessionReminderMinutes;
  if (offset <= 0) return;
  const sessionDate = new Date(session.date);
  const remindTime = new Date(sessionDate.getTime() - offset * 60 * 1000);
  const delay = remindTime.getTime() - Date.now();
  if (delay > 0) {
    setTimeout(() => {
      notify('Upcoming session', {
        body: `${session.title} starts in ${offset} minutes`,
      });
    }, delay);
  }
}

export function scheduleRemindersForSessions(sessions: Session[]) {
  sessions.forEach(scheduleSessionReminder);
}

export function setupDailyStreakReminder() {
  const settings = loadNotificationSettings();
  if (!settings.dailyStreak) return;
  const now = new Date();
  const next = new Date(now);
  next.setHours(8, 0, 0, 0);
  if (next <= now) next.setDate(next.getDate() + 1);
  const delay = next.getTime() - now.getTime();
  setTimeout(() => {
    notify('Daily streak reminder', {
      body: "Don't break your streak!",
    });
    setupDailyStreakReminder();
  }, delay);
}

export function setupWeeklySummaryReminder() {
  const settings = loadNotificationSettings();
  if (!settings.weeklySummary) return;
  const now = new Date();
  const next = new Date(now);
  // schedule for next Sunday at 6pm
  const daysUntilSunday = (7 - now.getDay()) % 7;
  next.setDate(now.getDate() + daysUntilSunday);
  next.setHours(18, 0, 0, 0);
  if (next <= now) next.setDate(next.getDate() + 7);
  const delay = next.getTime() - now.getTime();
  setTimeout(() => {
    notify('Weekly progress summary', {
      body: 'Check your statistics and keep learning!',
    });
    setupWeeklySummaryReminder();
  }, delay);
}

const QUOTES = [
  "Believe you can and you're halfway there.",
  "Don't watch the clock; do what it does. Keep going.",
  "You are capable of amazing things.",
  "The future depends on what you do today.",
];

export function sendMotivationalQuote() {
  const settings = loadNotificationSettings();
  if (!settings.motivationalQuotes) return;
  const quote = QUOTES[Math.floor(Math.random() * QUOTES.length)];
  notify('Motivation', { body: quote });
}
