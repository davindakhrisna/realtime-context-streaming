import { useMemo } from 'react';
import { useAtom } from 'jotai';
import { BarChart, Bar, PieChart, Pie, Cell, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { BookOpen, Clock, Target, TrendingUp, Award } from 'lucide-react';
import { currentSessionIdAtom } from '../atoms/queryAtoms';
import { useSessionStats, useSessions } from '../hooks/useStudyQueries';

/**
 * Statistics Dashboard Component
 * 
 * Visualizes study metrics including time studied, topics covered, and flashcard accuracy.
 */
export function StatsDashboard() {
  const [sessionId] = useAtom(currentSessionIdAtom);
  const { data: sessionsData } = useSessions();
  const { data: statsData } = useSessionStats(sessionId || undefined);

  // Process session data for charts
  const stats = useMemo(() => {
    if (!statsData) return null;

    // If it's an array, it's the all-sessions response
    if ('sessions' in statsData) {
      const sessions = statsData.sessions;
      return {
        totalSessions: sessions.length,
        totalTimeStudied: sessions.reduce((acc, s) => acc + s.duration_minutes, 0),
        totalFlashcards: sessions.reduce((acc, s) => acc + s.total_flashcards, 0),
        avgAccuracy: sessions.length > 0
          ? sessions.reduce((acc, s) => acc + s.accuracy_rate, 0) / sessions.length
          : 0,
        sessions,
      };
    }

    // Single session stats
    return {
      session_id: statsData.session_id,
      duration_minutes: statsData.duration_minutes,
      total_flashcards: statsData.total_flashcards,
      flashcards_reviewed: statsData.flashcards_reviewed,
      accuracy_rate: statsData.accuracy_rate,
      topics_covered: statsData.topics_covered,
      difficulty_distribution: statsData.difficulty_distribution,
    };
  }, [statsData]);

  // Prepare difficulty distribution data for pie chart
  const difficultyData = useMemo(() => {
    if (!stats || !('difficulty_distribution' in stats) || !stats.difficulty_distribution) {
      return [];
    }

    return [
      { name: 'Easy', value: stats.difficulty_distribution.easy, color: '#22c55e' },
      { name: 'Medium', value: stats.difficulty_distribution.medium, color: '#eab308' },
      { name: 'Hard', value: stats.difficulty_distribution.hard, color: '#ef4444' },
    ].filter((d) => d.value > 0);
  }, [stats]);

  // Prepare topics data for bar chart
  const topicsData = useMemo(() => {
    if (!stats || !('topics_covered' in stats) || !stats.topics_covered) {
      return [];
    }

    // Count topic frequency (simplified - in real app, track this properly)
    const topicCounts: Record<string, number> = {};
    stats.topics_covered.forEach((topic: string) => {
      topicCounts[topic] = (topicCounts[topic] || 0) + 1;
    });

    return Object.entries(topicCounts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5); // Top 5 topics
  }, [stats]);

  if (!stats) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center text-gray-500 dark:text-gray-400">
          <TrendingUp className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No statistics available yet</p>
          <p className="text-sm mt-1">Start studying to see your progress</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Study Statistics</h2>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          icon={Clock}
          title="Time Studied"
          value={`${Math.round('duration_minutes' in stats ? stats.duration_minutes : stats.totalTimeStudied || 0)} min`}
          color="blue"
        />
        <StatCard
          icon={BookOpen}
          title="Flashcards"
          value={String('total_flashcards' in stats ? stats.total_flashcards : stats.totalFlashcards || 0)}
          color="green"
        />
        <StatCard
          icon={Target}
          title="Accuracy"
          value={`${Math.round('accuracy_rate' in stats ? stats.accuracy_rate : stats.avgAccuracy || 0)}%`}
          color="purple"
        />
        <StatCard
          icon={Award}
          title="Topics"
          value={String('topics_covered' in stats ? (stats.topics_covered?.length || 0) : (stats.totalSessions || 0))}
          color="orange"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Difficulty Distribution */}
        {difficultyData.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Flashcard Difficulty Distribution
            </h3>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={difficultyData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {difficultyData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Topics Coverage */}
        {topicsData.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Top Topics</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={topicsData}>
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Session History (if viewing all sessions) */}
      {'sessions' in stats && stats.sessions && stats.sessions.length > 0 && (
        <div className="mt-8 bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Session History</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-2 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">
                    Session ID
                  </th>
                  <th className="text-left py-2 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">
                    Duration
                  </th>
                  <th className="text-left py-2 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">
                    Flashcards
                  </th>
                  <th className="text-left py-2 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">
                    Accuracy
                  </th>
                </tr>
              </thead>
              <tbody>
                {stats.sessions.slice(0, 10).map((session, idx) => (
                  <tr
                    key={session.session_id}
                    className={idx !== stats.sessions.length - 1 ? 'border-b border-gray-100 dark:border-gray-800' : ''}
                  >
                    <td className="py-3 px-4 text-sm text-gray-900 dark:text-white font-mono">
                      {session.session_id.slice(0, 8)}...
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                      {Math.round(session.duration_minutes)} min
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                      {session.total_flashcards}
                    </td>
                    <td className="py-3 px-4 text-sm">
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          session.accuracy_rate >= 80
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                            : session.accuracy_rate >= 50
                              ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                              : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                        }`}
                      >
                        {Math.round(session.accuracy_rate)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

interface StatCardProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  value: string;
  color: 'blue' | 'green' | 'purple' | 'orange';
}

function StatCard({ icon: Icon, title, value, color }: StatCardProps) {
  const colorClasses = {
    blue: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
    green: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
    purple: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
    orange: 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400',
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400">{title}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{value}</p>
        </div>
        <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
}
