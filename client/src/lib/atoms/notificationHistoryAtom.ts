import { atom } from 'jotai';

export interface NotificationRecord {
  id: number;
  title: string;
  body?: string;
  timestamp: number;
}

export const notificationHistoryAtom = atom<NotificationRecord[]>([]);

// helper write atom for pushing a new record
export const pushNotificationAtom = atom(
  null,
  (get, set, record: NotificationRecord) => {
    set(notificationHistoryAtom, (prev) => [record, ...prev]);
  }
);
