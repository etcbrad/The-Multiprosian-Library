import React from 'react';
import { DownloadCloud } from 'lucide-react';

interface FetchingScreenProps {
    message: string;
}

const FetchingScreen: React.FC<FetchingScreenProps> = ({ message }) => {
    return (
        <div className="flex flex-col items-center justify-center h-full p-8 text-center">
            <DownloadCloud className="w-24 h-24 text-cyan-400 mb-8 animate-pulse" />
            <h1 className="font-display text-5xl text-cyan-300 mb-4 animate-pulse">Accessing Archive...</h1>
            <p className="text-cyan-400 text-lg">{message || "Please wait while the narrative is being retrieved."}</p>
        </div>
    );
};

export default FetchingScreen;
