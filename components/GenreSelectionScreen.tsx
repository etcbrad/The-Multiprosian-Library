

import React from 'react';
import { AdventureGenre } from '../types';
import { ADVENTURE_GENRES } from '../constants';
import { ArrowLeft, BookHeart, Ghost, Rocket, Brain, FlaskConical } from 'lucide-react';

interface GenreSelectionScreenProps {
  onGenreSelected: (genre: AdventureGenre) => void;
  onBack: () => void;
}

const GenreIcon: React.FC<{ title: string }> = ({ title }) => {
    const lowerTitle = title.toLowerCase();
    // Match new adventure titles to existing icons and colors for thematic consistency.
    if (lowerTitle.includes('rabbit-hole')) return <Rocket className="w-10 h-10 text-yellow-400 mb-3" />; // Whimsical journey
    if (lowerTitle.includes('loomings')) return <BookHeart className="w-10 h-10 text-cyan-400 mb-3" />; // Classic literature, sea theme
    if (lowerTitle.includes('prometheus')) return <Ghost className="w-10 h-10 text-purple-400 mb-3" />; // Gothic horror/sci-fi
    if (lowerTitle.includes('telemachus')) return <Brain className="w-10 h-10 text-pink-400 mb-3" />; // Cerebral / stream of consciousness
    if (lowerTitle.includes('alchemist')) return <FlaskConical className="w-10 h-10 text-indigo-400 mb-3" />; // Puzzle / scientific
    return null;
};

const GenreSelectionScreen: React.FC<GenreSelectionScreenProps> = ({ onGenreSelected, onBack }) => {
  return (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center">
      <h1 className="font-display text-5xl text-green-300 mb-2 leading-tight">
        Choose Your Adventure
      </h1>
      <h2 className="text-xl text-green-500 mb-8">Select a scenario to begin.</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 w-full max-w-6xl mb-8">
        {ADVENTURE_GENRES.map((genre) => (
          <button
            key={genre.title}
            onClick={() => onGenreSelected(genre)}
            className="p-6 border-2 border-green-800 rounded-lg flex flex-col items-center text-left hover:bg-green-900/30 hover:border-green-600 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-green-400"
          >
            <GenreIcon title={genre.title} />
            <h3 className="font-display text-2xl text-green-300 mb-2 text-center">{genre.title}</h3>
            <p className="text-sm text-green-500 text-center flex-grow">{genre.description}</p>
          </button>
        ))}
      </div>

      <button
        onClick={onBack}
        className="flex items-center gap-2 px-6 py-2 bg-gray-800 text-gray-300 font-bold rounded-md transition-all duration-300 hover:bg-gray-700"
      >
        <ArrowLeft size={16} />
        Back
      </button>
    </div>
  );
};

export default GenreSelectionScreen;