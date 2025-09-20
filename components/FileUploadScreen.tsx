
import React, { useState, useCallback } from 'react';
import { UploadCloud, FileText, AlertTriangle } from 'lucide-react';

interface FileUploadScreenProps {
  onFileUploaded: (file: File) => void;
  errorMessage: string | null;
}

const FileUploadScreen: React.FC<FileUploadScreenProps> = ({ onFileUploaded, errorMessage }) => {
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

  return (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center">
      <h1 className="font-display text-6xl text-green-300 mb-2">A.S.C.I.I.</h1>
      <h2 className="text-xl text-green-500 mb-8">Advanced Simulation & Chronicle Interpretation Interface</h2>
      
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
        className={`w-full max-w-lg p-10 border-2 border-dashed rounded-lg cursor-pointer transition-all duration-300 ${isDragging ? 'border-green-300 bg-green-900/30' : 'border-green-700 hover:border-green-500 hover:bg-green-900/10'}`}
      >
        <input
          type="file"
          accept=".txt, .md, .json, text/plain"
          className="hidden"
          onChange={(e) => handleFileChange(e.target.files)}
        />
        <div className="flex flex-col items-center">
          {file ? (
            <>
              <FileText className="w-16 h-16 text-green-400 mb-4" />
              <p className="text-lg font-bold">{file.name}</p>
              <p className="text-sm text-green-600">{(file.size / 1024).toFixed(2)} KB</p>
            </>
          ) : (
            <>
              <UploadCloud className="w-16 h-16 text-green-600 mb-4" />
              <p className="text-lg">Drag & drop a narrative file or save file</p>
              <p className="text-sm text-green-700">or click to select (.txt, .md, .json)</p>
            </>
          )}
        </div>
      </label>

      <button
        onClick={handleSubmit}
        disabled={!file}
        className="mt-8 px-8 py-3 bg-green-600 text-black font-bold rounded-md transition-all duration-300 hover:bg-green-400 disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed shadow-lg shadow-green-900/50 disabled:shadow-none"
      >
        [ Initialize Simulation ]
      </button>
    </div>
  );
};

export default FileUploadScreen;
