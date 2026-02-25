import { atom } from 'jotai';

/**
 * Chat message types for the Study Assistant
 */
export type MessageType = 'user' | 'ai' | 'error' | 'system';

export interface ChatMessage {
  id: string;
  type: MessageType;
  content: string;
  timestamp: number;
  sources?: Array<{
    start_time: string;
    end_time: string;
    session_id: string;
    relevance_score: number;
  }>;
  model?: string;
  usedGroq?: boolean;
}

/**
 * Atom for storing chat message history
 */
export const queryHistoryAtom = atom<ChatMessage[]>([]);

/**
 * Atom for tracking loading state during queries
 */
export const isLoadingQueryAtom = atom<boolean>(false);

/**
 * Atom for storing the current user input
 */
export const queryInputAtom = atom<string>('');

/**
 * Atom for tracking if Groq is available/enabled
 */
export const isGroqEnabledAtom = atom<boolean>(true);

/**
 * Atom for storing Groq API error messages
 */
export const groqErrorAtom = atom<string | null>(null);

/**
 * Atom for controlling the Study Assistant panel visibility
 */
export const isAssistantPanelOpenAtom = atom<boolean>(false);

/**
 * Atom for storing the current session ID
 */
export const currentSessionIdAtom = atom<string | null>(null);

/**
 * Derived atom for getting only user messages
 */
export const userMessagesAtom = atom((get) => {
  const history = get(queryHistoryAtom);
  return history.filter((msg) => msg.type === 'user');
});

/**
 * Derived atom for getting only AI messages
 */
export const aiMessagesAtom = atom((get) => {
  const history = get(queryHistoryAtom);
  return history.filter((msg) => msg.type === 'ai');
});
