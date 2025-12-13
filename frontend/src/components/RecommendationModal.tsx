// Create this file: src/components/RecommendationModal.tsx

import { Sparkles, X, Heart } from 'lucide-react';

interface RecommendationModalProps {
  show: boolean;
  recommendation: string;
  mood: string;
  intensity: number;
  onClose: () => void;
  getMoodEmoji: (mood: string) => string;
}

export default function RecommendationModal({
  show,
  recommendation,
  mood,
  intensity,
  onClose,
  getMoodEmoji
}: RecommendationModalProps) {
  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-2xl w-full shadow-2xl border border-gray-100 animate-scale-in max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-indigo-100 to-purple-100 p-3 rounded-2xl">
              <Sparkles className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <h3 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Your Wellness Recommendation
              </h3>
              <p className="text-sm text-gray-600">Personalized for you by AI</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-xl transition-colors flex-shrink-0"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Mood Summary */}
        <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-4 mb-6 border border-indigo-100">
          <div className="flex items-center gap-3">
            <span className="text-4xl">{getMoodEmoji(mood)}</span>
            <div>
              <p className="font-semibold text-gray-800 capitalize">Feeling {mood}</p>
              <p className="text-sm text-gray-600">Intensity: {intensity}/10</p>
            </div>
          </div>
        </div>

        {/* Recommendation Content */}
        <div className="bg-white rounded-2xl p-5 border-2 border-gray-100 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Heart className="w-5 h-5 text-pink-500" />
            <p className="font-semibold text-gray-800">Here's what might help:</p>
          </div>
          <div className="text-gray-700 leading-relaxed whitespace-pre-line">
            {recommendation}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={onClose}
            className="flex-1 bg-gradient-to-r from-indigo-500 to-purple-500 text-white py-3 rounded-2xl font-semibold hover:shadow-lg transition-all duration-300 hover:scale-105"
          >
            Got it, thanks!
          </button>
        </div>

        {/* Footer Note */}
        <p className="text-xs text-gray-500 text-center mt-4">
          💡 Remember: These are suggestions, not medical advice. For serious concerns, please consult a healthcare professional.
        </p>
      </div>
    </div>
  );
}