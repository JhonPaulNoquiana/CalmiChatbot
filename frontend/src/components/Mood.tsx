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
  
  const toggleMood = (moodValue: string) => {
    if (selectedEmotions.includes(moodValue)) {
      setSelectedEmotions(selectedEmotions.filter(e => e !== moodValue));
      setCurrentMood('');
    } else {
      setSelectedEmotions([...selectedEmotions, moodValue]);
      setCurrentMood(moodValue); // Keep for backward compatibility
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
                Check-in Your Mood
              </h3>
              <p className="text-gray-600 mb-6 text-sm sm:text-base">Select all the moods you're feeling right now</p>

              {/* Mood Selection - Multiple selection allowed */}
              <div className="grid grid-cols-4 gap-3 mb-6">
                {moodOptions.map((mood) => (
                  <button
                    key={mood.value}
                    onClick={() => toggleMood(mood.value)}
                    className={`p-3 sm:p-4 rounded-2xl border-2 text-center transition-all duration-300 ${
                      selectedEmotions.includes(mood.value)
                        ? 'border-indigo-500 bg-gradient-to-br ' + mood.color + ' shadow-lg scale-105'
                        : 'border-gray-200 hover:border-indigo-300 hover:shadow-md hover:scale-102'
                    }`}
                  >
                    <div className="text-2xl sm:text-3xl mb-1 sm:mb-2">{mood.emoji}</div>
                    <div className="text-xs font-semibold text-gray-700">{mood.label}</div>
                  </button>
                ))}
              </div>

              {/* Selected moods display */}
              {selectedEmotions.length > 0 && (
                <div className="mb-4 p-3 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border border-indigo-100">
                  <p className="text-sm text-gray-700 mb-1">
                    Selected: <span className="font-semibold text-indigo-600">
                      {selectedEmotions.map(mood => {
                        const moodOption = moodOptions.find(m => m.value === mood);
                        return moodOption ? moodOption.label : mood;
                      }).join(', ')}
                    </span>
                  </p>
                  <p className="text-xs text-gray-500">
                    {selectedEmotions.length} mood{selectedEmotions.length !== 1 ? 's' : ''} selected
                  </p>
                </div>
              )}

              {/* Intensity Slider - Show when moods are selected */}
              {selectedEmotions.length > 0 && (
                <div className="mb-6 animate-fade-in">
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    Overall Intensity: <span className="text-indigo-600">{moodIntensity}/10</span>
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
                  disabled={selectedEmotions.length === 0}
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
              Check-in Your Mood
            </h2>
            <p className="text-gray-600 text-base sm:text-lg">Select all the moods you're feeling right now</p>
          </div>

          {/* Primary Mood Selection - Multiple selection allowed */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Select your mood(s)</h3>
            <p className="text-sm text-gray-600 mb-4">You can select multiple moods that describe how you're feeling</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
              {moodOptions.map((mood) => (
                <button
                  key={mood.value}
                  onClick={() => toggleMood(mood.value)}
                  className={`p-4 sm:p-6 rounded-3xl border-2 text-center transition-all duration-300 ${
                    selectedEmotions.includes(mood.value)
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

          {selectedEmotions.length > 0 && (
            <div className="space-y-4 sm:space-y-6 animate-fade-in">
              {/* Selected moods summary */}
              <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-3xl p-5 sm:p-6 shadow-lg border border-indigo-100">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h4 className="font-semibold text-gray-800">Your Selected Moods</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      {selectedEmotions.length} mood{selectedEmotions.length !== 1 ? 's' : ''} selected
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    {selectedEmotions.slice(0, 3).map((mood, index) => {
                      const moodOption = moodOptions.find(m => m.value === mood);
                      return (
                        <div key={index} className="text-2xl" title={moodOption?.label}>
                          {moodOption?.emoji}
                        </div>
                      );
                    })}
                    {selectedEmotions.length > 3 && (
                      <div className="text-sm text-gray-500 flex items-center">
                        +{selectedEmotions.length - 3} more
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-sm text-gray-700">
                  <span className="font-medium">Feeling: </span>
                  {selectedEmotions.map((mood, index) => {
                    const moodOption = moodOptions.find(m => m.value === mood);
                    return (
                      <span key={index}>
                        {moodOption ? moodOption.label : mood}
                        {index < selectedEmotions.length - 1 ? ', ' : ''}
                      </span>
                    );
                  })}
                </div>
              </div>

              {/* Intensity Slider */}
              <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-lg border border-gray-100">
                <label className="block text-sm font-semibold text-gray-700 mb-4">
                  Overall Intensity Level: <span className="text-indigo-600 text-lg">{moodIntensity}/10</span>
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

              {/* Notes */}
              <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-lg border border-gray-100">
                <label className="block text-sm font-semibold text-gray-700 mb-3">Additional notes (optional)</label>
                <textarea
                  value={moodNote}
                  onChange={(e) => setMoodNote(e.target.value)}
                  placeholder="What's contributing to these moods? What's on your mind?"
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