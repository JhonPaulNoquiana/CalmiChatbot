import { Smile } from 'lucide-react';

interface MoodProps {
  currentMood: string;
  setCurrentMood: (s: string) => void;
  moodIntensity: number;
  setMoodIntensity: (n: number) => void;
  moodNote: string;
  setMoodNote: (s: string) => void;
  selectedEmotions: string[];
  setSelectedEmotions: (emotions: string[]) => void;
  submitMoodCheckIn: () => Promise<void> | void;
  moodOptions: { emoji: string; label: string; value: string; color: string }[];
  showMoodCheckin: boolean;
  setShowMoodCheckin: (b: boolean) => void;
  renderOnlyModal?: boolean;
}

// Common emotions list
const emotionsList = [
  { label: 'Worried', value: 'worried' },
  { label: 'Stressed', value: 'stressed' },
  { label: 'Overwhelmed', value: 'overwhelmed' },
  { label: 'Peaceful', value: 'peaceful' },
  { label: 'Energetic', value: 'energetic' },
  { label: 'Hopeful', value: 'hopeful' },
  { label: 'Grateful', value: 'grateful' },
  { label: 'Frustrated', value: 'frustrated' },
  { label: 'Excited', value: 'excited' },
  { label: 'Content', value: 'content' },
  { label: 'Irritated', value: 'irritated' },
  { label: 'Relaxed', value: 'relaxed' },
];

// Intensity scale labels
const intensityLabels: Record<number, string> = {
  1: 'Very Low',
  2: 'Low',
  3: 'Mild',
  4: 'Mild-Moderate',
  5: 'Moderate',
  6: 'Moderate-High',
  7: 'High',
  8: 'Very High',
  9: 'Intense',
  10: 'Extreme',
};

export default function Mood({ 
  currentMood, 
  setCurrentMood, 
  moodIntensity, 
  setMoodIntensity, 
  moodNote, 
  setMoodNote,
  selectedEmotions,
  setSelectedEmotions,
  submitMoodCheckIn, 
  moodOptions, 
  showMoodCheckin, 
  setShowMoodCheckin, 
  renderOnlyModal = false 
}: MoodProps) {
  
  const toggleEmotion = (emotion: string) => {
    if (selectedEmotions.includes(emotion)) {
      setSelectedEmotions(selectedEmotions.filter(e => e !== emotion));
    } else {
      setSelectedEmotions([...selectedEmotions, emotion]);
    }
  };

  // If this instance is only responsible for rendering the modal, return only the modal markup
  if (renderOnlyModal) {
    return (
      <>
        {showMoodCheckin && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
            <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-gray-100 animate-scale-in max-h-[90vh] overflow-y-auto">
              <h3 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-2">
                Quick Mood Check-in
              </h3>
              <p className="text-gray-600 mb-6 text-sm sm:text-base">How are you feeling right now?</p>

              {/* Mood Selection */}
              <div className="grid grid-cols-4 gap-3 mb-6">
                {moodOptions.map((mood) => (
                  <button
                    key={mood.value}
                    onClick={() => setCurrentMood(mood.value)}
                    className={`p-3 sm:p-4 rounded-2xl border-2 text-center transition-all duration-300 ${
                      currentMood === mood.value
                        ? 'border-indigo-500 bg-gradient-to-br ' + mood.color + ' shadow-lg scale-105'
                        : 'border-gray-200 hover:border-indigo-300 hover:shadow-md hover:scale-102'
                    }`}
                  >
                    <div className="text-2xl sm:text-3xl mb-1 sm:mb-2">{mood.emoji}</div>
                    <div className="text-xs font-semibold text-gray-700">{mood.label}</div>
                  </button>
                ))}
              </div>

              {/* Intensity Slider - Show when mood is selected */}
              {currentMood && (
                <div className="mb-6 animate-fade-in">
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    Intensity: <span className="text-indigo-600">{moodIntensity}/10</span>
                    <span className="text-xs text-gray-500 ml-2">({intensityLabels[moodIntensity]})</span>
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
              )}

              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setShowMoodCheckin(false);
                    setCurrentMood('');
                    setSelectedEmotions([]);
                  }}
                  className="flex-1 border-2 border-gray-200 text-gray-700 py-2.5 sm:py-3 rounded-2xl font-semibold hover:bg-gray-50 transition-all duration-300 hover:scale-105 text-sm sm:text-base"
                >
                  Skip
                </button>
                <button
                  onClick={submitMoodCheckIn}
                  disabled={!currentMood}
                  className="flex-1 bg-gradient-to-r from-indigo-500 to-purple-500 text-white py-2.5 sm:py-3 rounded-2xl font-semibold hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 hover:scale-105 text-sm sm:text-base"
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
      <div className="flex-1 p-4 sm:p-8 overflow-y-auto">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-8 sm:mb-10">
            <div className="bg-gradient-to-br from-indigo-100 to-purple-100 p-4 sm:p-5 rounded-3xl inline-block mb-4 sm:mb-5 shadow-lg">
              <Smile className="w-12 h-12 sm:w-14 sm:h-14 text-indigo-600" />
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-2 sm:mb-3">
              How are you feeling?
            </h2>
            <p className="text-gray-600 text-base sm:text-lg">Take a moment to check in with yourself</p>
          </div>

          {/* Primary Mood Selection */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Select your primary mood</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
              {moodOptions.map((mood) => (
                <button
                  key={mood.value}
                  onClick={() => setCurrentMood(mood.value)}
                  className={`p-4 sm:p-6 rounded-3xl border-2 text-center transition-all duration-300 ${
                    currentMood === mood.value
                      ? 'border-indigo-500 bg-gradient-to-br ' + mood.color + ' shadow-xl scale-105'
                      : 'border-gray-200 bg-white hover:border-indigo-300 hover:shadow-lg hover:scale-102'
                  }`}
                >
                  <div className="text-3xl sm:text-4xl mb-2 sm:mb-3">{mood.emoji}</div>
                  <div className="font-semibold text-gray-800 text-sm sm:text-base">{mood.label}</div>
                </button>
              ))}
            </div>
          </div>

          {currentMood && (
            <div className="space-y-4 sm:space-y-6 animate-fade-in">
              {/* Intensity Slider */}
              <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-lg border border-gray-100">
                <label className="block text-sm font-semibold text-gray-700 mb-4">
                  Intensity Level: <span className="text-indigo-600 text-lg">{moodIntensity}/10</span>
                  <span className="text-sm text-gray-500 ml-2">({intensityLabels[moodIntensity]})</span>
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
                <div className="flex justify-between text-xs text-gray-500 mt-2">
                  <span>Very Low</span>
                  <span>Moderate</span>
                  <span>Extreme</span>
                </div>
              </div>

              {/* Multiple Emotions Selection */}
              <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-lg border border-gray-100">
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Additional emotions (select all that apply)
                </label>
                <div className="flex flex-wrap gap-2">
                  {emotionsList.map((emotion) => (
                    <button
                      key={emotion.value}
                      onClick={() => toggleEmotion(emotion.value)}
                      className={`px-3 sm:px-4 py-2 rounded-full text-xs sm:text-sm font-medium transition-all duration-300 ${
                        selectedEmotions.includes(emotion.value)
                          ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-md scale-105'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:scale-102'
                      }`}
                    >
                      {emotion.label}
                    </button>
                  ))}
                </div>
                {selectedEmotions.length > 0 && (
                  <p className="text-xs text-gray-500 mt-3">
                    {selectedEmotions.length} emotion{selectedEmotions.length !== 1 ? 's' : ''} selected
                  </p>
                )}
              </div>

              {/* Notes */}
              <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-lg border border-gray-100">
                <label className="block text-sm font-semibold text-gray-700 mb-3">Additional notes (optional)</label>
                <textarea
                  value={moodNote}
                  onChange={(e) => setMoodNote(e.target.value)}
                  placeholder="What's contributing to this mood? What's on your mind?"
                  className="w-full border-2 border-gray-200 rounded-2xl p-3 sm:p-4 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent resize-none transition-all duration-300 text-sm sm:text-base"
                  rows={4}
                />
              </div>

              {/* Submit Button */}
              <button
                onClick={submitMoodCheckIn}
                className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 text-white py-4 sm:py-5 rounded-2xl font-bold text-base sm:text-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
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