
import React from 'react';
import { GameMode } from '../types';
import { ArrowLeft, BookText, Globe2 } from 'lucide-react';

interface ModeSelectionScreenProps {
  onModeSelected: (mode: GameMode) => void;
  onBack: () => void;
}

const ModeSelectionScreen: React.FC<ModeSelectionScreenProps> = ({ onModeSelected, onBack }) => {
  return (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center">
      <h1 className="font-display text-5xl text-green-300 mb-2 leading-tight">
        Select Play Style
      </h1>
      <h2 className="text-xl text-green-500 mb-8">How do you wish to experience this world?</h2>

      <div className="flex flex-col md:flex-row gap-8 w-full max-w-3xl mb-10">
        <button
          onClick={() => onModeSelected('Narrative')}
          className="flex-1 p-8 border-2 border-green-800 rounded-lg flex flex-col items-center text-center hover:bg-green-900/30 hover:border-green-600 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-green-400"
        >
          <BookText className="w-12 h-12 text-cyan-400 mb-4" />
          <h3 className="font-display text-3xl text-green-300 mb-3">Narrative Adventure</h3>
          <p className="text-sm text-green-500">
            A guided experience with clear objectives and a story to unravel. Recommended for a classic text-adventure feel.
          </p>
        </button>
        <button
          onClick={() => onModeSelected('Open World')}
          className="flex-1 p-8 border-2 border-green-800 rounded-lg flex flex-col items-center text-center hover:bg-green-900/30 hover:border-green-600 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-green-400"
        >
          <Globe2 className="w-12 h-12 text-yellow-400 mb-4" />
          <h3 className="font-display text-3xl text-green-300 mb-3">Open World</h3>
          <p className="text-sm text-green-500">
            A sandbox simulation with no set goals. Explore, interact, and create your own story in a living world.
          </p>
        </button>
      </div>

      <button
        onClick={onBack}
        className="flex items-center gap-2 px-6 py-2 bg-gray-800 text-gray-300 font-bold rounded-md transition-all duration-300 hover:bg-gray-700"
      >
        <ArrowLeft size={16} />
        Back to Genre Selection
      </button>
    </div>
  );
};

export default ModeSelectionScreen;
