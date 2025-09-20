
import React, { useState } from 'react';
import { AlertTriangle, BookOpen, Dices, BookMarked } from 'lucide-react';

interface FileUploadScreenProps {
  onFileUploaded: (file: File) => void;
  onLoadRandom: () => void;
  onStartAdventure: () => void;
  errorMessage: string | null;
}

const FileUploadScreen: React.FC<FileUploadScreenProps> = ({ onFileUploaded, onLoadRandom, onStartAdventure, errorMessage }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isDepositing, setIsDepositing] = useState(false);

  const handleFileSelected = (file: File) => {
    if (isDepositing) return;
    setIsDepositing(true);
    setTimeout(() => {
        onFileUploaded(file);
    }, 1500); // Animation duration
  };
  
  const handleFileChange = (files: FileList | null) => {
    if (files && files.length > 0) {
      handleFileSelected(files[0]);
    }
  };

  const handleDragEnter = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if(e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        handleFileSelected(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center">
      {/* Add animation keyframes dynamically */}
      <style>
        {`
          @keyframes deposit-book-animation {
            0% {
              opacity: 0;
              transform: translateY(80px) rotate(-10deg);
            }
            50% {
              opacity: 1;
              transform: translateY(0) rotate(5deg);
            }
            100% {
              opacity: 0;
              transform: translateY(-20px) scale(1, 0.1) rotate(0deg);
            }
          }
          .book-deposit-animation {
            animation: deposit-book-animation 1.5s ease-in-out forwards;
          }
        `}
      </style>

      <h1 className="font-display text-5xl text-green-300 mb-2 leading-tight">
        Welcome, Archivist.
      </h1>
      <h2 className="text-xl text-green-500 mb-8">Deposit your foundational text to begin a new simulation.</h2>
      
      {errorMessage && (
        <div className="bg-red-900/50 border border-red-500 text-red-300 p-4 rounded-md mb-6 flex items-center gap-4 w-full max-w-lg">
          <AlertTriangle className="h-6 w-6 flex-shrink-0"/>
          <p className="text-left text-sm">{errorMessage}</p>
        </div>
      )}

      <div className="w-full max-w-lg flex flex-col items-center gap-6">
        <div className="h-48 w-full"> {/* Animation container */}
            {!isDepositing ? (
                <div className="w-full flex flex-col items-center">
                    <div className="w-full bg-gray-800/50 p-1 rounded-t-md border-t-2 border-x-2 border-gray-700">
                        <div className="bg-gray-900/80 text-gray-400 font-bold text-center tracking-widest text-sm py-1 shadow-inner">
                            LIBRARY BOOK RETURN
                        </div>
                    </div>
                    <label
                        onDragEnter={handleDragEnter}
                        onDragOver={handleDragEnter}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        className={`p-10 border-2 border-x-gray-700 border-b-gray-700 rounded-b-lg cursor-pointer flex flex-col items-center justify-center gap-2 transition-all duration-300 w-full bg-black/50 shadow-[inset_0_8px_10px_rgba(0,0,0,0.7)] ${isDragging ? 'border-green-300 text-green-300 ring-4 ring-green-500/50' : 'border-gray-800 text-green-600 hover:text-green-400'}`}
                    >
                        <span className="font-semibold text-lg">Deposit Manuscript Here</span>
                        <span className="text-xs text-green-800">Drag & Drop or Click | .txt, .md, .json, .pdf</span>
                        <input
                        type="file"
                        accept=".txt, .md, .json, .pdf"
                        className="hidden"
                        onChange={(e) => handleFileChange(e.target.files)}
                        />
                    </label>
                </div>
            ) : (
                <div className="w-full h-full flex items-center justify-center">
                    <BookMarked size={64} className="text-green-300 book-deposit-animation" />
                </div>
            )}
        </div>
        
        {!isDepositing && (
            <>
                <div className="flex items-center w-full">
                    <div className="flex-grow h-px bg-green-800"></div>
                    <span className="px-4 text-green-700 text-sm">or choose an option</span>
                    <div className="flex-grow h-px bg-green-800"></div>
                </div>

                <div className="flex items-center gap-4 w-full">
                    <button
                        onClick={onLoadRandom}
                        className="flex-1 flex flex-col items-center justify-center gap-2 p-4 border border-dashed border-cyan-700 text-cyan-600 rounded-md transition-all duration-300 hover:border-cyan-500 hover:bg-cyan-900/20 hover:text-cyan-400"
                    >
                        <BookOpen size={20}/>
                        <span className="text-sm font-semibold">Quick Start</span>
                    </button>
                    <button
                        onClick={onStartAdventure}
                        className="flex-1 flex flex-col items-center justify-center gap-2 p-4 border border-dashed border-yellow-700 text-yellow-600 rounded-md transition-all duration-300 hover:border-yellow-500 hover:bg-yellow-900/20 hover:text-yellow-400"
                    >
                        <Dices size={20}/>
                        <span className="text-sm font-semibold">Start an Adventure</span>
                    </button>
                </div>
                <p className="text-xs text-green-800 mt-2">Selecting an option will begin the simulation immediately.</p>
            </>
        )}
      </div>

    </div>
  );
};

export default FileUploadScreen;
