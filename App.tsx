
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { GameState, WorldModel, AdventureLogEntry, SaveGame } from './types';
import FileUploadScreen from './components/FileUploadScreen';
import ProcessingScreen from './components/ProcessingScreen';
import GameScreen from './components/GameScreen';
import { generateWorldModel, processPlayerCommand, advanceSimulation, generateAsciiArt } from './services/geminiService';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.UPLOADING);
  const [worldModel, setWorldModel] = useState<WorldModel | null>(null);
  const [adventureLog, setAdventureLog] = useState<AdventureLogEntry[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [isTicking, setIsTicking] = useState(false);
  const [isAutoSimulating, setIsAutoSimulating] = useState(false);
  const intervalRef = useRef<number | null>(null);
  
  // Refs to hold the latest state for use in callbacks without dependency issues.
  const worldModelRef = useRef(worldModel);
  useEffect(() => { worldModelRef.current = worldModel; }, [worldModel]);

  const adventureLogRef = useRef(adventureLog);
  useEffect(() => { adventureLogRef.current = adventureLog; }, [adventureLog]);

  // Ref to prevent re-entrant ticks
  const tickLock = useRef(false);

  const stopAutoSimulation = useCallback(() => {
    if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
    }
    setIsAutoSimulating(false);
  }, []);

  const handleReset = useCallback(() => {
    setGameState(GameState.UPLOADING);
    setWorldModel(null);
    setAdventureLog([]);
    setErrorMessage(null);
    stopAutoSimulation();
  }, [stopAutoSimulation]);

  const handleFileUploaded = useCallback(async (file: File) => {
    setGameState(GameState.PROCESSING);
    setErrorMessage(null);
    try {
      const fileContent = await file.text();
      if (file.name.endsWith('.json')) {
        // Handle loading a save game file
        const saveData: SaveGame = JSON.parse(fileContent);
        if (saveData.worldModel && saveData.adventureLog) {
          setWorldModel(saveData.worldModel);
          setAdventureLog(saveData.adventureLog);
          setGameState(GameState.PLAYING);
        } else {
          throw new Error("Invalid save file format.");
        }
      } else {
        // Handle generating a new game from a narrative file
        const model = await generateWorldModel(fileContent);
        setWorldModel(model);
        const initialEntry: AdventureLogEntry = { type: 'narrative', content: model.world_state.initial_description || "Your adventure begins." };
        setAdventureLog([initialEntry]);
        setGameState(GameState.PLAYING);
        // Generate art for the intro
        generateAsciiArt(initialEntry.content, model).then(art => {
            setAdventureLog(prevLog => [...prevLog, { type: 'ascii', content: art }]);
        }).catch(err => console.error("Initial ASCII art generation failed:", err));
      }
    } catch (error) {
      console.error("Failed to load or generate world:", error);
      const err = error as Error;
      setErrorMessage(`Failed to initialize simulation: ${err.message}. Please try again.`);
      setGameState(GameState.UPLOADING);
    }
  }, []);
  
  const handleSaveGame = useCallback(() => {
    if (!worldModel || !adventureLog) return;

    const saveData: SaveGame = {
      worldModel,
      adventureLog,
    };

    const jsonString = JSON.stringify(saveData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ascii-adventure-save-${new Date().toISOString().replace(/:/g, '-')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [worldModel, adventureLog]);


  const handleCommandSubmit = useCallback(async (command: string) => {
    const commandLower = command.toLowerCase().trim();

    // Handle client-side commands first
    if (commandLower === 'reset') {
      handleReset();
      return;
    }
    if (commandLower === 'clear') {
      setAdventureLog([{ type: 'command', content: command }, { type: 'simulation', content: 'Log cleared.' }]);
      return;
    }
    if (commandLower === 'help') {
      const helpText = `CLIENT COMMANDS:\n[help] - Show this message.\n[clear] - Clear the screen log.\n[reset] - Reset the game to the file upload screen.\n\nGAME COMMANDS:\nUse natural language to interact with the world.\n(e.g., 'look around', 'talk to the old man', 'go north')`;
      setAdventureLog(prevLog => [...prevLog, { type: 'command', content: command }, { type: 'simulation', content: helpText }]);
      return;
    }

    // Handle game commands
    if (!worldModelRef.current || isTicking || isAutoSimulating) return;
    
    setAdventureLog(prevLog => [...prevLog, { type: 'command', content: command }]);

    try {
      const currentWorldModel = worldModelRef.current;
      const currentLog = adventureLogRef.current;
      
      const { narrative, updatedWorldState } = await processPlayerCommand(currentWorldModel.world_state, currentWorldModel.characters, currentLog, command);
      
      const updatedModel = { ...currentWorldModel, world_state: updatedWorldState };
      setWorldModel(updatedModel);
      
      const narrativeEntry: AdventureLogEntry = { type: 'narrative', content: narrative };
      setAdventureLog(prevLog => [...prevLog, narrativeEntry]);

      generateAsciiArt(narrative, updatedModel).then(art => {
        setAdventureLog(prevLog => [...prevLog, { type: 'ascii', content: art }]);
      }).catch(err => {
          console.error("ASCII art generation failed:", err);
      });

    } catch (error) {
      console.error("Failed to process command:", error);
      const err = error as Error;
      setAdventureLog(prevLog => [...prevLog, { type: 'error', content: `Error processing command: ${err.message}` }]);
    }
  }, [isTicking, isAutoSimulating, handleReset]);


  const tick = useCallback(async () => {
      if (tickLock.current) return; // Prevent re-entrant ticks
      tickLock.current = true;
      setIsTicking(true);

      try {
          const currentWorldModel = worldModelRef.current;
          const currentAdventureLog = adventureLogRef.current;

          if (!currentWorldModel) {
              throw new Error("World model is not available.");
          }
          
          const { narrative, updatedWorldState } = await advanceSimulation(currentWorldModel.world_state, currentWorldModel.characters, currentAdventureLog);
          
          const updatedModel = { ...currentWorldModel, world_state: updatedWorldState };
          setWorldModel(updatedModel);
          setAdventureLog(prevLog => [...prevLog, { type: 'simulation', content: narrative }]);

          generateAsciiArt(narrative, updatedModel).then(art => {
            setAdventureLog(prevLog => [...prevLog, { type: 'ascii', content: art }]);
          }).catch(err => {
              console.error("ASCII art generation failed:", err);
          });

      } catch (error) {
          console.error("Failed to advance simulation:", error);
          const err = error as Error;
          setAdventureLog(prevLog => [...prevLog, { type: 'error', content: `Simulation Error: ${err.message}` }]);
          stopAutoSimulation();
      } finally {
          tickLock.current = false;
          setIsTicking(false);
      }
  }, [stopAutoSimulation]);
  
  const startAutoSimulation = useCallback(() => {
      if (isTicking || isAutoSimulating) return;
      setIsAutoSimulating(true);
      tick();
      intervalRef.current = window.setInterval(tick, 5000);
  }, [isTicking, isAutoSimulating, tick]);

  const manualTick = useCallback(() => {
      if (isTicking || isAutoSimulating) return;
      tick();
  }, [isTicking, isAutoSimulating, tick]);


  const renderContent = () => {
    switch (gameState) {
      case GameState.UPLOADING:
        return <FileUploadScreen onFileUploaded={handleFileUploaded} errorMessage={errorMessage} />;
      case GameState.PROCESSING:
        return <ProcessingScreen />;
      case GameState.PLAYING:
        return worldModel && <GameScreen 
          adventureLog={adventureLog} 
          worldModel={worldModel}
          onCommandSubmit={handleCommandSubmit}
          isTicking={isTicking}
          isAutoSimulating={isAutoSimulating}
          onStartSimulation={startAutoSimulation}
          onStopSimulation={stopAutoSimulation}
          onAdvanceTick={manualTick}
          onSaveGame={handleSaveGame}
          onReset={handleReset}
        />;
      default:
        return <FileUploadScreen onFileUploaded={handleFileUploaded} errorMessage="An unknown error occurred." />;
    }
  };

  return (
    <main className="bg-black text-green-400 min-h-screen flex flex-col items-center justify-center p-4 selection:bg-green-700 selection:text-white">
      <div className="w-full max-w-6xl h-[90vh] border-2 border-green-700 bg-gray-900/50 shadow-lg shadow-green-900/50 rounded-lg flex flex-col">
        {renderContent()}
      </div>
       <footer className="text-center text-xs text-green-700 mt-2">
            Advanced ASCII Text Adventure Engine v0.4.0
        </footer>
    </main>
  );
};

export default App;
