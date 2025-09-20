import React, { useState, useCallback } from 'react';
import { AlertTriangle, BookOpen } from 'lucide-react';

interface FileUploadScreenProps {
  onFileUploaded: (file: File) => void;
  onFetchRandom: () => void;
  errorMessage: string | null;
}

const FileUploadScreen: React.FC<FileUploadScreenProps> = ({ onFileUploaded, onFetchRandom, errorMessage }) => {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFileChange = (files: FileList | null) => {
    if (files && files.length > 0) {
      setFile(files[0]);
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
    handleFileChange(e.dataTransfer.files);
  };

  const handleSubmit = useCallback(() => {
    if (file) {
      onFileUploaded(file);
    }
  }, [file, onFileUploaded]);
  
  const fileNameDisplay = file ? (file.name.length > 28 ? file.name.substring(0, 25) + '...' : file.name) : '';
  const fileSizeDisplay = file ? `(${(file.size / 1024).toFixed(2)} KB)` : '';


  return (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center">
      <h1 className="font-display text-5xl text-green-300 mb-4 leading-tight">
        Multiprosian<br/>Library Adventure
      </h1>
      <h2 className="text-xl text-green-500 mb-8">Explore the endless stacks...</h2>
      
      {errorMessage && (
        <div className="bg-red-900/50 border border-red-500 text-red-300 p-4 rounded-md mb-6 flex items-center gap-4">
          <AlertTriangle className="h-6 w-6"/>
          <p className="text-left">{errorMessage}</p>
        </div>
      )}

      <label
        onDragEnter={handleDragEnter}
        onDragOver={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`w-full max-w-lg p-6 border-2 border-dashed rounded-lg cursor-pointer flex flex-col items-center justify-center transition-all duration-300 ${isDragging ? 'border-green-300 bg-green-900/30' : 'border-green-700 hover:border-green-500 hover:bg-green-900/10'}`}
      >
        <input
          type="file"
          accept=".txt, .md, .json, .pdf"
          className="hidden"
          onChange={(e) => handleFileChange(e.target.files)}
        />
         {file ? (
          <pre className="text-green-400 font-mono text-center text-sm leading-tight select-none whitespace-pre">{
`+------------------------------+
|     MANUSCRIPT ACCEPTED      |
+==============================+
|                              |
|  ${fileNameDisplay.padEnd(28, ' ')}  |
|  ${fileSizeDisplay.padEnd(28, ' ')}  |
|                              |
+------------------------------+`
          }</pre>
        ) : (
          <div className="flex flex-col items-center">
            <pre className="text-green-600 font-mono text-center text-sm leading-tight select-none whitespace-pre">{
`+------------------------------+
|      LIBRARY DEPOSITORY      |
+==============================+
|    / / / / / / / / / / / /   |
|   / / INSERT YOUR STORY / /  |
|  / / / / / / / / / / / / /   |
+------------------------------+`
            }</pre>
            <p className="text-sm text-green-700 mt-2">or click to select (.txt, .md, .json, .pdf)</p>
          </div>
        )}
      </label>

      <div className="flex items-center gap-4 mt-8">
         <button
            onClick={handleSubmit}
            disabled={!file}
            className="px-8 py-3 bg-green-600 text-black font-bold rounded-md transition-all duration-300 hover:bg-green-400 disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed shadow-lg shadow-green-900/50 disabled:shadow-none"
          >
            [ Initialize Simulation ]
        </button>
        <span className="text-green-700">or</span>
         <button
            onClick={onFetchRandom}
            className="flex items-center gap-2 px-6 py-3 bg-cyan-800 text-cyan-200 font-bold rounded-md transition-all duration-300 hover:bg-cyan-700 shadow-lg shadow-cyan-900/50"
          >
            <BookOpen size={18}/>
            [ Fetch from the Archive ]
        </button>
      </div>

    </div>
  );
};

export default FileUploadScreen;