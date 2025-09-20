
import React, { useState, useEffect } from 'react';
import { PIPELINE_STEPS } from '../constants';
import { CheckCircle2, Loader, Settings } from 'lucide-react';

const StepStatusIcon: React.FC<{ status: 'pending' | 'running' | 'complete' }> = ({ status }) => {
  switch (status) {
    case 'running':
      return <Loader className="w-5 h-5 animate-spin text-yellow-400" />;
    case 'complete':
      return <CheckCircle2 className="w-5 h-5 text-green-400" />;
    default:
      return <Settings className="w-5 h-5 text-gray-600" />;
  }
};


const ProcessingScreen: React.FC = () => {
    const [statuses, setStatuses] = useState<Record<string, 'pending' | 'running' | 'complete'>>(
        PIPELINE_STEPS.reduce((acc, step) => ({ ...acc, [step]: 'pending' }), {})
    );

    useEffect(() => {
        let i = 0;
        const intervalId = setInterval(() => {
            if (i < PIPELINE_STEPS.length) {
                setStatuses(prev => ({
                    ...prev,
                    ...(i > 0 && { [PIPELINE_STEPS[i - 1]]: 'complete' }),
                    [PIPELINE_STEPS[i]]: 'running'
                }));
                i++;
            } else {
                 setStatuses(prev => ({
                    ...prev,
                    [PIPELINE_STEPS[PIPELINE_STEPS.length - 1]]: 'complete'
                }));
                clearInterval(intervalId);
            }
        }, 150);

        return () => clearInterval(intervalId);
    }, []);

    return (
        <div className="flex flex-col items-center justify-center h-full p-8">
            <h1 className="font-display text-5xl text-green-300 mb-4 animate-pulse">Building World Model...</h1>
            <p className="text-green-500 mb-8">Please wait while the simulation is initialized.</p>
            
            <div className="w-full max-w-2xl h-80 overflow-y-auto p-4 border border-green-800 bg-black/30 rounded-md scrollbar-thin scrollbar-thumb-green-700 scrollbar-track-black/50">
                <ul className="space-y-2">
                    {PIPELINE_STEPS.map((step, index) => (
                        <li key={step} className="flex items-center gap-3 text-sm">
                            <StepStatusIcon status={statuses[step]} />
                            <span className={`${statuses[step] === 'complete' ? 'text-green-500' : statuses[step] === 'running' ? 'text-yellow-300' : 'text-gray-500'}`}>
                                {`[${String(index + 1).padStart(2, '0')}] ${step}`}
                            </span>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
};

export default ProcessingScreen;
