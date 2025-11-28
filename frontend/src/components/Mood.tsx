import { Smile } from 'lucide-react';

interface MoodProps {
  currentMood: string;
  setCurrentMood: (s: string) => void;
  moodIntensity: number;
  setMoodIntensity: (n: number) => void;
  moodNote: string;
  setMoodNote: (s: string) => void;
  submitMoodCheckIn: () => Promise<void> | void;
  moodOptions: { emoji: string; label: string; value: string; color: string }[];
  showMoodCheckin: boolean;
  setShowMoodCheckin: (b: boolean) => void;
  renderOnlyModal?: boolean;
}

export default function Mood({ currentMood, setCurrentMood, moodIntensity, setMoodIntensity, moodNote, setMoodNote, submitMoodCheckIn, moodOptions, showMoodCheckin, setShowMoodCheckin, renderOnlyModal = false }: MoodProps) {
  // If this instance is only responsible for rendering the modal, return only the modal markup
  if (renderOnlyModal) {
    return (
      <>
        {showMoodCheckin && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
            <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl border border-gray-100 animate-scale-in">
              <h3 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-2">
                Quick Mood Check-in
              </h3>
              <p className="text-gray-600 mb-6">How are you feeling right now?</p>

              <div className="grid grid-cols-3 gap-3 mb-6">
                {moodOptions.map((mood) => (
                  <button
                    key={mood.value}
                    onClick={() => setCurrentMood(mood.value)}
                    className={`p-4 rounded-2xl border-2 text-center transition-all duration-300 ${
                      currentMood === mood.value
                        ? 'border-indigo-500 bg-gradient-to-br ' + mood.color + ' shadow-lg scale-105'
                        : 'border-gray-200 hover:border-indigo-300 hover:shadow-md hover:scale-102'
                    }`}
                  >
                    <div className="text-3xl mb-2">{mood.emoji}</div>
                    <div className="text-xs font-semibold text-gray-700">{mood.label}</div>
                  </button>
                ))}
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setShowMoodCheckin(false);
                    setCurrentMood('');
                  }}
                  className="flex-1 border-2 border-gray-200 text-gray-700 py-3 rounded-2xl font-semibold hover:bg-gray-50 transition-all duration-300 hover:scale-105"
                >
                  Skip
                </button>
                <button
                  onClick={submitMoodCheckIn}
                  disabled={!currentMood}
                  className="flex-1 bg-gradient-to-r from-indigo-500 to-purple-500 text-white py-3 rounded-2xl font-semibold hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 hover:scale-105"
                >
                  Check-in
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <>
      <div className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-10">
            <div className="bg-gradient-to-br from-indigo-100 to-purple-100 p-5 rounded-3xl inline-block mb-5 shadow-lg">
              <Smile className="w-14 h-14 text-indigo-600" />
            </div>
            <h2 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-3">
              How are you feeling?
            </h2>
            <p className="text-gray-600 text-lg">Take a moment to check in with yourself</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
            {moodOptions.map((mood) => (
              <button
                key={mood.value}
                onClick={() => setCurrentMood(mood.value)}
                className={`p-6 rounded-3xl border-2 text-center transition-all duration-300 ${
                  currentMood === mood.value
                    ? 'border-indigo-500 bg-gradient-to-br ' + mood.color + ' shadow-xl scale-105'
                    : 'border-gray-200 bg-white hover:border-indigo-300 hover:shadow-lg hover:scale-102'
                }`}
              >
                <div className="text-4xl mb-3">{mood.emoji}</div>
                <div className="font-semibold text-gray-800">{mood.label}</div>
              </button>
            ))}
          </div>

          {currentMood && (
            <div className="space-y-6 animate-fade-in">
              <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100">
                <label className="block text-sm font-semibold text-gray-700 mb-4">
                  Intensity Level: <span className="text-indigo-600 text-lg">{moodIntensity}/10</span>
                </label>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={moodIntensity}
                  onChange={(e) => setMoodIntensity(parseInt(e.target.value))}
                  className="w-full h-3 bg-gradient-to-r from-indigo-200 to-purple-200 rounded-full appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, rgb(129 140 248) 0%, rgb(129 140 248) ${moodIntensity * 10}%, rgb(224 231 255) ${moodIntensity * 10}%, rgb(224 231 255) 100%)`
                  }}
                />
              </div>

              <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100">
                <label className="block text-sm font-semibold text-gray-700 mb-3">Additional notes (optional)</label>
                <textarea
                  value={moodNote}
                  onChange={(e) => setMoodNote(e.target.value)}
                  placeholder="What's contributing to this mood?"
                  className="w-full border-2 border-gray-200 rounded-2xl p-4 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent resize-none transition-all duration-300"
                  rows={4}
                />
              </div>

              <button
                onClick={submitMoodCheckIn}
                className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 text-white py-5 rounded-2xl font-bold text-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
              >
                Submit Mood Check-in
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

