import type { MoodEntry } from '../types';
import { History as HistoryIcon } from 'lucide-react';

interface HistoryProps {
  moodHistory: MoodEntry[];
  setSelectedRecord: (r: MoodEntry | null) => void;
  setShowRecordDetail: (b: boolean) => void;
  getMoodEmoji: (mood: string) => string;
  retrieveChatForSession?: (sessionId: string) => void;
}

export default function History({ moodHistory, setSelectedRecord, setShowRecordDetail, getMoodEmoji, retrieveChatForSession }: HistoryProps) {
  return (
    <div className="flex-1 p-8 overflow-y-auto">
      <div className="max-w-3xl mx-auto">
        <h2 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-8">
          Your Mood Journey
        </h2>

        {moodHistory.length === 0 ? (
          <div className="text-center py-16">
            <div className="bg-gradient-to-br from-indigo-100 to-purple-100 p-6 rounded-3xl inline-block mb-6 shadow-lg">
              <HistoryIcon className="w-16 h-16 text-indigo-600" />
            </div>
            <p className="text-gray-600 text-lg">No mood check-ins yet. Start tracking your wellness!</p>
          </div>
        ) : (
          <div className="space-y-5">
            {moodHistory.map((entry) => (
              <div
                key={entry.id}
                className="bg-white border-2 border-gray-100 rounded-3xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-102 group"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-4">
                    <div className="text-5xl transform group-hover:scale-110 transition-transform duration-300">{getMoodEmoji(entry.mood)}</div>
                    <div>
                      <div className="font-bold text-xl text-gray-800 capitalize">{entry.mood}</div>
                      <div className="text-sm text-gray-500 font-medium">{entry.timestamp}</div>
                    </div>
                  </div>
                  <div className="text-right bg-gradient-to-br from-indigo-50 to-purple-50 px-5 py-3 rounded-2xl">
                    <div className="text-xs text-gray-600 font-semibold mb-1">Intensity</div>
                    <div className="font-bold text-2xl bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">{entry.intensity}/10</div>
                  </div>
                </div>
                {entry.note && (
                  <div className="text-sm text-gray-700 bg-gradient-to-br from-gray-50 to-gray-100 p-4 rounded-2xl border border-gray-200">{entry.note}</div>
                )}
                <div className="mt-3 flex gap-2">
                  {retrieveChatForSession && (
                    <button
                      className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white px-4 py-2 rounded-2xl font-semibold hover:shadow-lg transition-all duration-300 hover:scale-105"
                      onClick={() => retrieveChatForSession(entry.sessionId)}
                    >
                      Retrieve Chat
                    </button>
                  )}
                  <button
                    className="bg-gray-100 text-indigo-600 px-4 py-2 rounded-2xl font-semibold hover:bg-gray-200 transition-all duration-300 hover:scale-105"
                    onClick={() => {
                      setSelectedRecord(entry);
                      setShowRecordDetail(true);
                    }}
                  >
                    Details
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
