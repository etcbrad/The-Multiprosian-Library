
import React, { useState, useEffect, useRef } from 'react';
import { AdventureLogEntry, WorldModel, EngineMode, MutationLogEntry } from '../types';
import { Play, Square, FastForward, Save, Power, Wifi, WifiOff, Bot, BrainCircuit, Loader } from 'lucide-react';
import StatusPanel from './StatusPanel';

interface GameScreenProps {
  adventureLog: AdventureLogEntry[];
  worldModel: WorldModel;
  mutationLog: MutationLogEntry[];
  onCommandSubmit: (command: string) => void;
  isTicking: boolean;
  isAutoSimulating: boolean;
  isEvolving: boolean;
  onStartSimulation: () => void;
  onStopSimulation: () => void;
  onAdvanceTick: () => void;
  onSaveGame: () => void;
  onReset: () => void;
  engineMode: EngineMode;
  onSetEngineMode: (mode: EngineMode) => void;
  isImproving: boolean;
  onImproveOfflineEngine: () => void;
}

const BlinkingCursor: React.FC = () => (
    <span className="w-2.5 h-5 bg-green-400 inline-block align-bottom animate-pulse"></span>
);

const GameScreen: React.FC<GameScreenProps> = ({ 
  adventureLog, 
  worldModel,
  mutationLog,
  onCommandSubmit,
  isTicking,
  isAutoSimulating,
  isEvolving,
  onStartSimulation,
  onStopSimulation,
  onAdvanceTick,
  onSaveGame,
  onReset,
  engineMode,
  onSetEngineMode,
  isImproving,
  onImproveOfflineEngine
}) => {
  const [input, setInput] = useState('');
  const logEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const isSimulationRunning = isTicking || isAutoSimulating || isEvolving;

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
  
  const getPlaceholder = () => {
      if (isTicking) return 'Simulation tick in progress...';
      if (isAutoSimulating) return 'Auto-simulation running...';
      if (isEvolving) return 'World is evolving...';
      if (isImproving) return 'Deepening world logic...';
      return 'Enter your command...';
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
                  <p className="text-cyan-400 whitespace-pre-wrap"><span className="text-cyan-600 mr-2">{entry.content.startsWith('[EVOLUTION]') ? <Bot size={14} className="inline -mt-1"/> : '[SIM]'}</span>{entry.content.replace('[EVOLUTION]', '')}</p>
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
        <div className="flex items-center gap-4 mb-2 flex-wrap">
            <div className="flex items-center gap-2 border border-gray-700 rounded-md p-1">
                <button
                    onClick={() => onSetEngineMode('online')}
                    disabled={isSimulationRunning || isImproving}
                    className={`flex items-center gap-2 px-3 py-1 text-sm rounded-md transition-all duration-200 disabled:cursor-not-allowed disabled:text-gray-600 ${engineMode === 'online' ? 'bg-purple-700 text-purple-100' : 'bg-transparent text-gray-400 hover:bg-gray-800'}`}
                    title="Online Mode: The world evolves with creative AI assistance."
                ><Wifi size={14}/> Online</button>
                <button
                    onClick={() => onSetEngineMode('offline')}
                    disabled={isSimulationRunning || isImproving}
                    className={`flex items-center gap-2 px-3 py-1 text-sm rounded-md transition-all duration-200 disabled:cursor-not-allowed disabled:text-gray-600 ${engineMode === 'offline' ? 'bg-gray-600 text-gray-100' : 'bg-transparent text-gray-400 hover:bg-gray-800'}`}
                    title="Offline Mode: The simulation runs fully locally."
                ><WifiOff size={14}/> Offline</button>
                 <button 
                  onClick={onImproveOfflineEngine}
                  disabled={engineMode === 'offline' || isSimulationRunning || isImproving}
                  className="flex items-center gap-2 px-3 py-1 text-sm rounded-md transition-all duration-200 bg-teal-800 text-teal-200 hover:bg-teal-700 disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed"
                  title="Use AI to generate new assets for the offline engine."
                >
                  {isImproving ? <Loader size={14} className="animate-spin" /> : <BrainCircuit size={14}/>}
                  {isImproving ? 'IMPROVING' : 'DEEPEN LOGIC'}
                </button>
            </div>
            <div className="h-6 w-px bg-gray-700"></div>
            <button 
              onClick={isAutoSimulating ? onStopSimulation : onStartSimulation}
              disabled={isTicking || isEvolving || isImproving}
              className="flex items-center gap-2 px-4 py-2 bg-green-800 text-green-300 font-bold rounded-md transition-all duration-300 hover:bg-green-700 disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed"
              title={isAutoSimulating ? "Stop Automated Simulation" : "Start Automated Simulation"}
            >
              {isAutoSimulating ? <Square size={16}/> : <Play size={16} />}
              {isTicking && isAutoSimulating ? 'TICKING' : isAutoSimulating ? 'RUNNING' : 'AUTO'}
            </button>
            <button 
              onClick={onAdvanceTick}
              disabled={isSimulationRunning || isImproving}
              className="flex items-center gap-2 px-4 py-2 bg-green-800 text-green-300 font-bold rounded-md transition-all duration-300 hover:bg-green-700 disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed"
              title="Advance Simulation by one Tick"
            >
              <FastForward size={16}/>
              {isTicking && !isAutoSimulating ? 'TICKING' : 'TICK'}
            </button>
            <button 
              onClick={onSaveGame}
              disabled={isSimulationRunning || isImproving}
              className="flex items-center gap-2 px-4 py-2 bg-blue-800 text-blue-300 font-bold rounded-md transition-all duration-300 hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed"
              title="Save Game State"
            >
              <Save size={16}/>
              SAVE
            </button>
             <button 
              onClick={onReset}
              disabled={isSimulationRunning || isImproving}
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
              disabled={isSimulationRunning || isImproving}
              placeholder={getPlaceholder()}
            />
            {!(isSimulationRunning || isImproving) && <BlinkingCursor />}
          </div>
        </form>
      </div>
      <StatusPanel worldModel={worldModel} mutationLog={mutationLog} />
    </div>
  );
};

export default GameScreen;
