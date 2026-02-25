import { useAtom } from 'jotai';
import { useState } from 'react';
import { Send, X, Loader2, MessageSquare, AlertCircle } from 'lucide-react';
import {
  queryHistoryAtom,
  isLoadingQueryAtom,
  queryInputAtom,
  isAssistantPanelOpenAtom,
  groqErrorAtom,
  currentSessionIdAtom,
  type ChatMessage,
} from '../atoms/queryAtoms';
import { useInquire } from '../hooks/useStudyQueries';

/**
 * Study Assistant Chat Panel Component
 * 
 * A floating panel that allows users to ask questions about their screen content.
 * Uses RAG with ChromaDB retrieval and Groq LLM for intelligent answers.
 */
export function StudyAssistantPanel() {
  const [isAssistantOpen, setIsAssistantOpen] = useAtom(isAssistantPanelOpenAtom);
  const [queryHistory, setQueryHistory] = useAtom(queryHistoryAtom);
  const [isLoading, setIsLoading] = useAtom(isLoadingQueryAtom);
  const [input, setInput] = useAtom(queryInputAtom);
  const [, setGroqError] = useAtom(groqErrorAtom);
  const [sessionId] = useAtom(currentSessionIdAtom);

  const inquireMutation = useInquire();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: input.trim(),
      timestamp: Date.now(),
    };

    // Add user message to history
    setQueryHistory((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await inquireMutation.mutateAsync({
        query: userMessage.content,
        session_id: sessionId,
        n_results: 5,
      });

      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: response.answer,
        timestamp: Date.now(),
        sources: response.sources,
        model: response.model,
        usedGroq: response.used_groq,
      };

      setQueryHistory((prev) => [...prev, aiMessage]);
      setGroqError(null);
    } catch (error) {
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'error',
        content: error instanceof Error ? error.message : 'Failed to send inquiry',
        timestamp: Date.now(),
      };

      setQueryHistory((prev) => [...prev, errorMessage]);
      setGroqError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearHistory = () => {
    setQueryHistory([]);
  };

  if (!isAssistantOpen) {
    return (
      <button
        onClick={() => setIsAssistantOpen(true)}
        className="fixed bottom-6 right-6 p-4 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-colors z-50"
        aria-label="Open Study Assistant"
      >
        <MessageSquare className="w-6 h-6" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 w-96 bg-white dark:bg-gray-900 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 z-50 flex flex-col max-h-[600px]">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-blue-600" />
          <h3 className="font-semibold text-gray-900 dark:text-white">Study Assistant</h3>
        </div>
        <div className="flex items-center gap-2">
          {queryHistory.length > 0 && (
            <button
              onClick={handleClearHistory}
              className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              aria-label="Clear history"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => setIsAssistantOpen(false)}
            className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            aria-label="Close panel"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {queryHistory.length === 0 ? (
          <div className="text-center text-gray-500 dark:text-gray-400 py-8">
            <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">Ask me anything about your screen content!</p>
            <p className="text-xs mt-1 text-gray-400">
              I can help explain concepts, summarize content, or create study materials.
            </p>
          </div>
        ) : (
          queryHistory.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))
        )}
        {isLoading && (
          <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">Thinking...</span>
          </div>
        )}
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question..."
            className="flex-1 px-3 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="p-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
}

interface MessageBubbleProps {
  message: ChatMessage;
}

function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.type === 'user';
  const isError = message.type === 'error';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] rounded-lg p-3 ${
          isUser
            ? 'bg-blue-600 text-white'
            : isError
              ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 border border-red-200 dark:border-red-800'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white'
        }`}
      >
        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        
        {/* Sources */}
        {!isUser && !isError && message.sources && message.sources.length > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-300 dark:border-gray-600">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Sources:</p>
            <div className="space-y-1">
              {message.sources.slice(0, 3).map((source, idx) => (
                <div
                  key={idx}
                  className="text-xs text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-700 rounded px-2 py-1"
                >
                  <span className="font-medium">#{idx + 1}</span>{' '}
                  {new Date(source.start_time).toLocaleTimeString()} -{' '}
                  {new Date(source.end_time).toLocaleTimeString()}
                  {source.relevance_score && (
                    <span className="ml-2 text-gray-400">
                      ({Math.round(source.relevance_score * 100)}% match)
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Model indicator */}
        {!isUser && !isError && message.usedGroq && (
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
            Powered by {message.model || 'Groq AI'}
          </p>
        )}

        {/* Timestamp */}
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
          {new Date(message.timestamp).toLocaleTimeString()}
        </p>
      </div>
    </div>
  );
}
