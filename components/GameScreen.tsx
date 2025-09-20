
import React, { useState, useEffect, useRef } from 'react';
import { AdventureLogEntry, WorldModel } from '../types';
import { Play, Square, FastForward, Save, Power } from 'lucide-react';
import StatusPanel from './StatusPanel';

interface GameScreenProps {
  adventureLog: AdventureLogEntry[];
  worldModel: WorldModel;
  onCommandSubmit: (command: string) => void;
  isTicking: boolean;
  isAutoSimulating: boolean;
  onStartSimulation: () => void;
  onStopSimulation: () => void;
  onAdvanceTick: () => void;
  onSaveGame: () => void;
  onReset: () => void;
}

const BlinkingCursor: React.FC = () => (
    <span className="w-2.5 h-5 bg-green-400 inline-block align-bottom animate-pulse"></span>
);

const GameScreen: React.FC<GameScreenProps> = ({ 
  adventureLog, 
  worldModel,
  onCommandSubmit,
  isTicking,
  isAutoSimulating,
  onStartSimulation,
  onStopSimulation,
  onAdvanceTick,
  onSaveGame,
  onReset
}) => {
  const [input, setInput] = useState('');
  const logEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const isSimulationRunning = isTicking || isAutoSimulating;

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [adventureLog]);
  
  useEffect(() => {
    if(!isSimulationRunning){
      inputRef.current?.focus();
    }
  },[isSimulationRunning]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isSimulationRunning) {
      onCommandSubmit(input.trim());
      setInput('');
    }
  };
  
  const handleScreenClick = () => {
    if (!isSimulationRunning) {
        inputRef.current?.focus();
    }
  }

  return (
    <div className="flex h-full p-4 gap-4" onClick={handleScreenClick}>
      <div className="flex-grow flex flex-col">
        <div className="flex-grow overflow-y-auto mb-4 pr-2 scrollbar-thin scrollbar-thumb-green-700 scrollbar-track-black/50">
          {adventureLog.map((entry, index) => (
            <div key={index} className="mb-2">
              {entry.type === 'command' && (
                  <p className="whitespace-pre-wrap"><span className="text-green-700 mr-2">&gt;</span>{entry.content}</p>
              )}
              {entry.type === 'narrative' && (
                  <p className="whitespace-pre-wrap">{entry.content}</p>
              )}
              {entry.type === 'simulation' && (
                  <p className="text-cyan-400 whitespace-pre-wrap"><span className="text-cyan-600 mr-2">[SIM]</span>{entry.content}</p>
              )}
               {entry.type === 'error' && (
                  <p className="text-red-400 whitespace-pre-wrap"># {entry.content}</p>
              )}
              {entry.type === 'ascii' && (
                  <pre className={`text-green-700 text-sm leading-tight whitespace-pre my-4 ${entry.content.includes('failed') ? 'text-red-600' : ''}`}>
                    {entry.content}
                  </pre>
              )}
            </div>
          ))}
          <div ref={logEndRef} />
        </div>
        <div className="flex items-center gap-4 mb-2">
            <button 
              onClick={isAutoSimulating ? onStopSimulation : onStartSimulation}
              disabled={isTicking}
              className="flex items-center gap-2 px-4 py-2 bg-green-800 text-green-300 font-bold rounded-md transition-all duration-300 hover:bg-green-700 disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed"
              title={isAutoSimulating ? "Stop Automated Simulation" : "Start Automated Simulation"}
            >
              {isAutoSimulating ? <Square size={16}/> : <Play size={16} />}
              {isTicking && isAutoSimulating ? 'TICKING' : isAutoSimulating ? 'RUNNING' : 'AUTO'}
            </button>
            <button 
              onClick={onAdvanceTick}
              disabled={isSimulationRunning}
              className="flex items-center gap-2 px-4 py-2 bg-green-800 text-green-300 font-bold rounded-md transition-all duration-300 hover:bg-green-700 disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed"
              title="Advance Simulation by one Tick"
            >
              <FastForward size={16}/>
              {isTicking && !isAutoSimulating ? 'TICKING' : 'TICK'}
            </button>
            <button 
              onClick={onSaveGame}
              disabled={isSimulationRunning}
              className="flex items-center gap-2 px-4 py-2 bg-blue-800 text-blue-300 font-bold rounded-md transition-all duration-300 hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed"
              title="Save Game State"
            >
              <Save size={16}/>
              SAVE
            </button>
             <button 
              onClick={onReset}
              disabled={isSimulationRunning}
              className="flex items-center gap-2 px-4 py-2 bg-yellow-800 text-yellow-300 font-bold rounded-md transition-all duration-300 hover:bg-yellow-700 disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed"
              title="Reset Game"
            >
              <Power size={16}/>
              RESET
            </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="flex items-center border-t-2 border-green-800 pt-2">
            <span className="text-green-400 mr-2">&gt;</span>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="bg-transparent border-none text-green-400 w-full focus:outline-none disabled:text-gray-600"
              disabled={isSimulationRunning}
              placeholder={isSimulationRunning ? 'Simulation in progress...' : 'Enter your command...'}
            />
            {!isSimulationRunning && <BlinkingCursor />}
          </div>
        </form>
      </div>
      <StatusPanel worldModel={worldModel} />
    </div>
  );
};

export default GameScreen;
