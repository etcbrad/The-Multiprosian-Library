
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { GameState, WorldModel, AdventureLogEntry, SaveGame, EngineMode, MutationLogEntry, ApiMutation, AdventureGenre, OfflineResources, GameMode } from './types';
import FileUploadScreen from './components/FileUploadScreen';
import ProcessingScreen from './components/ProcessingScreen';
import GameScreen from './components/GameScreen';
import GenreSelectionScreen from './components/GenreSelectionScreen';
import ModeSelectionScreen from './components/ModeSelectionScreen';
import { generateWorldModel, requestEvolution, generateAsciiArt, requestOfflineResource } from './services/geminiService';
import { localProcessPlayerCommand, localAdvanceSimulation, localRequestEvolution, localGenerateAsciiArt } from './services/localSimulationService';
import { generateLocalWorldModel } from './services/localWorldGenerationService';
import { validateAndApplyMutation } from './services/mutationService';
import * as pdfjsLib from 'pdfjs-dist';
import { ADVENTURE_GENRES } from './constants';


// Setup PDF.js worker. Note: This is a URL to a CDN.
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@4.4.168/build/pdf.worker.min.mjs`;

/**
 * Extracts text content from a PDF file.
 * @param file The PDF file to process.
 * @returns A promise that resolves to the text content of the PDF.
 */
const extractTextFromPdf = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument(new Uint8Array(arrayBuffer)).promise;
    let fullText = '';
    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map(item => ('str' in item ? item.str : '')).join(' ');
        fullText += pageText + '\n\n'; // Add double newline for paragraph breaks between pages
    }
    return fullText;
};


const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.UPLOADING);
  const [worldModel, setWorldModel] = useState<WorldModel | null>(null);
  const [adventureLog, setAdventureLog] = useState<AdventureLogEntry[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [engineMode, setEngineMode] = useState<EngineMode>('offline');
  const [mutationLog, setMutationLog] = useState<MutationLogEntry[]>([]);
  const [isEvolving, setIsEvolving] = useState(false);
  const [offlineResources, setOfflineResources] = useState<OfflineResources>({ asciiArt: {} });
  const [isImproving, setIsImproving] = useState(false);

  const [isTicking, setIsTicking] = useState(false);
  const [isAutoSimulating, setIsAutoSimulating] = useState(false);
  const intervalRef = useRef<number | null>(null);
  
  const [selectedGenre, setSelectedGenre] = useState<AdventureGenre | null>(null);

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
    setMutationLog([]);
    setSelectedGenre(null);
    stopAutoSimulation();
  }, [stopAutoSimulation]);
  
  const applyApiMutation = useCallback((mutation: ApiMutation, currentModel: WorldModel): WorldModel => {
    const { updatedWorldModel, narrativeUpdate } = validateAndApplyMutation(mutation, currentModel);
    
    if (narrativeUpdate) {
        setWorldModel(updatedWorldModel);
        
        if (mutation.type === 'ENHANCE_NARRATIVE') {
            // Find the last narrative entry and enhance it
            setAdventureLog(prevLog => {
                const lastNarrativeIndex = prevLog.slice().reverse().findIndex(e => e.type === 'narrative');
                if (lastNarrativeIndex !== -1) {
                    const originalIndex = prevLog.length - 1 - lastNarrativeIndex;
                    const newLog = [...prevLog];
                    newLog[originalIndex].content += `\n\n${narrativeUpdate}`;
                    return newLog;
                }
                return [...prevLog, { type: 'narrative', content: narrativeUpdate }];
            });
        } else {
             // For offline mode, use a more generic EVOLUTION tag
            const tag = engineMode === 'offline' ? '[EVOLUTION]' : '[AI EVOLUTION]';
            setAdventureLog(prevLog => [...prevLog, { type: 'simulation', content: `${tag} ${narrativeUpdate}` }]);
        }

        const newLogEntry: MutationLogEntry = {
            id: `mut-${Date.now()}`,
            timestamp: new Date().toISOString(),
            mutation,
            status: 'applied',
        };
        setMutationLog(prev => [newLogEntry, ...prev].slice(0, 10));
        return updatedWorldModel;
    }
    return currentModel;
  }, [engineMode]);

  const handleFileUploaded = useCallback(async (file: File) => {
    setGameState(GameState.PROCESSING);
    setErrorMessage(null);
    try {
      if (file.name.endsWith('.json')) {
        // Handle loading a save game file
        const fileContent = await file.text();
        const saveData: SaveGame = JSON.parse(fileContent);
        if (saveData.worldModel && saveData.adventureLog) {
          setWorldModel(saveData.worldModel);
          setAdventureLog(saveData.adventureLog);
          setGameState(GameState.PLAYING);
        } else {
          throw new Error("Invalid save file format.");
        }
      } else {
        // Handle generating a new game from a narrative file (txt, md, pdf)
        let narrativeText: string;
        if (file.name.endsWith('.pdf')) {
          narrativeText = await extractTextFromPdf(file);
        } else {
          narrativeText = await file.text();
        }
        
        const model = await generateWorldModel(narrativeText);
        setWorldModel(model);
        const initialEntry: AdventureLogEntry = { type: 'narrative', content: model.world_state.initial_description || "Your adventure begins." };
        setAdventureLog([initialEntry]);
        setGameState(GameState.PLAYING);
        // Generate art for the intro using the local, offline generator by default.
        const art = localGenerateAsciiArt(model, offlineResources.asciiArt);
        setAdventureLog(prevLog => [...prevLog, { type: 'ascii', content: art }]);
      }
    } catch (error) {
      console.error("Failed to load or generate world:", error);
      const err = error as Error;
      setErrorMessage(`Failed to initialize simulation: ${err.message}. Please try again.`);
      setGameState(GameState.UPLOADING);
    }
  }, [offlineResources.asciiArt]);

  const handleLoadRandom = useCallback(() => {
    setGameState(GameState.PROCESSING);
    setErrorMessage(null);
    
    // Short delay to allow processing screen to render and feel substantial
    setTimeout(() => {
        try {
            const randomGenre = ADVENTURE_GENRES[Math.floor(Math.random() * ADVENTURE_GENRES.length)];
            const model = generateLocalWorldModel(randomGenre, 'Open World'); // Default random to open world
            
            setWorldModel(model);
            const initialEntry: AdventureLogEntry = { type: 'narrative', content: model.world_state.initial_description || "Your adventure begins." };
            setAdventureLog([initialEntry]);
            const art = localGenerateAsciiArt(model, offlineResources.asciiArt);
            setAdventureLog(prevLog => [...prevLog, { type: 'ascii', content: art }]);
            setGameState(GameState.PLAYING);
        } catch (error) {
            console.error("Failed to generate random local adventure:", error);
            const err = error as Error;
            setErrorMessage(`Failed to load from archive: ${err.message}. Please try again.`);
            setGameState(GameState.UPLOADING);
        }
    }, 2500); // Simulate processing time

  }, [offlineResources.asciiArt]);

  const handleStartAdventure = useCallback(() => {
    setGameState(GameState.GENRE_SELECTION);
    setErrorMessage(null);
  }, []);

  const handleGenreSelected = useCallback((genre: AdventureGenre) => {
    setSelectedGenre(genre);
    setGameState(GameState.MODE_SELECTION);
  }, []);

  const handleModeSelected = useCallback((mode: GameMode) => {
    if (!selectedGenre) return;
    setGameState(GameState.PROCESSING);
    
    setTimeout(() => {
        try {
            const model = generateLocalWorldModel(selectedGenre, mode);
            setWorldModel(model);
            const initialEntry: AdventureLogEntry = { type: 'narrative', content: model.world_state.initial_description || "Your adventure begins." };
            setAdventureLog([initialEntry]);
            const art = localGenerateAsciiArt(model, offlineResources.asciiArt);
            setAdventureLog(prevLog => [...prevLog, { type: 'ascii', content: art }]);
            setGameState(GameState.PLAYING);
        } catch (error) {
            console.error("Failed to generate local adventure:", error);
            const err = error as Error;
            setErrorMessage(`Failed to load adventure: ${err.message}. Please try again.`);
            setGameState(GameState.UPLOADING);
        }
    }, 2500); // Simulate processing time
  }, [selectedGenre, offlineResources.asciiArt]);

  const handleBackToUpload = useCallback(() => {
    setGameState(GameState.UPLOADING);
  }, []);

  const handleBackToGenre = useCallback(() => {
    setGameState(GameState.GENRE_SELECTION);
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
    a.download = `multiprosian-library-save-${new Date().toISOString().replace(/:/g, '-')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [worldModel, adventureLog]);


  const handleCommandSubmit = useCallback(async (command: string) => {
    const commandLower = command.toLowerCase().trim();

    if (commandLower === 'reset') {
      handleReset();
      return;
    }
    if (commandLower === 'clear') {
      setAdventureLog([{ type: 'command', content: command }, { type: 'simulation', content: 'Log cleared.' }]);
      return;
    }
    if (commandLower === 'help') {
      const helpText = `CLIENT COMMANDS:\n[help] - Show this message.\n[clear] - Clear the screen log.\n[reset] - Reset the game.\n\nGAME COMMANDS:\nUse natural language (e.g., 'look around', 'take the book', 'go to the study').`;
      setAdventureLog(prevLog => [...prevLog, { type: 'command', content: command }, { type: 'simulation', content: helpText }]);
      return;
    }

    if (!worldModelRef.current || isTicking || isAutoSimulating) return;
    
    setAdventureLog(prevLog => [...prevLog, { type: 'command', content: command }]);

    const oldLocation = worldModelRef.current.world_state.current_location;

    // 1. Always process command with the local, deterministic engine first for immediate feedback.
    const { narrative: localNarrative, updatedWorldState: localUpdatedState } = localProcessPlayerCommand(worldModelRef.current, command);
    let currentModel = { ...worldModelRef.current, world_state: localUpdatedState };
    setWorldModel(currentModel);
    const narrativeEntry: AdventureLogEntry = { type: 'narrative', content: localNarrative };
    setAdventureLog(prevLog => [...prevLog, narrativeEntry]);

    const locationChanged = oldLocation !== currentModel.world_state.current_location;

    // 2. Handle evolution and art generation based on engine mode.
    if (engineMode === 'online') {
      setIsEvolving(true);
      try {
        const mutation = await requestEvolution(currentModel, adventureLogRef.current, command);
        if (mutation) {
          // 3. Validate and apply the mutation, updating state and logs.
          currentModel = applyApiMutation(mutation, currentModel);
        }
        // 4. Generate ASCII art only if the player's location changed to avoid rate limiting.
        if (locationChanged) {
            generateAsciiArt(localNarrative, currentModel).then(art => {
               setAdventureLog(prevLog => [...prevLog, { type: 'ascii', content: art }]);
            }).catch(err => console.error("ASCII art generation failed:", err));
        }

      } catch (error) {
        console.error("Failed to process API evolution:", error);
        const err = error as Error;
        setAdventureLog(prevLog => [...prevLog, { type: 'error', content: `API Evolution Error: ${err.message}` }]);
      } finally {
        setIsEvolving(false);
      }
    } else { // 'offline' mode emulation
        // Emulate evolution with a visual cue
        const mutation = localRequestEvolution(currentModel);
        if (mutation) {
            setIsEvolving(true);
            setTimeout(() => { // Give a small visual cue that something happened
                // Pass the latest model to apply mutation to
                if(worldModelRef.current) {
                    applyApiMutation(mutation, worldModelRef.current);
                }
                setIsEvolving(false);
            }, 300);
        }

        // Emulate ASCII art on location change
        if (locationChanged) {
            const art = localGenerateAsciiArt(currentModel, offlineResources.asciiArt);
            setAdventureLog(prevLog => [...prevLog, { type: 'ascii', content: art }]);
        }
    }
  }, [isTicking, isAutoSimulating, handleReset, engineMode, applyApiMutation, offlineResources.asciiArt]);


  const tick = useCallback(async () => {
      if (tickLock.current) return; 
      tickLock.current = true;
      setIsTicking(true);

      try {
          const currentWorldModel = worldModelRef.current;
          if (!currentWorldModel) throw new Error("World model is not available.");
          
          // 1. Always advance simulation with the local engine.
          const { narrative, updatedWorldState } = localAdvanceSimulation(currentWorldModel);
          let updatedModel = { ...currentWorldModel, world_state: updatedWorldState };
          setWorldModel(updatedModel);
          if (narrative) {
             setAdventureLog(prevLog => [...prevLog, { type: 'simulation', content: narrative }]);
          }

          // 2. Handle evolution based on engine mode.
          if (engineMode === 'online') {
            setIsEvolving(true);
            try {
                const mutation = await requestEvolution(updatedModel, adventureLogRef.current, "A moment passes...");
                if (mutation) {
                   updatedModel = applyApiMutation(mutation, updatedModel);
                }
            } catch (error) {
                console.error("Failed to process API evolution on tick:", error);
            } finally {
                setIsEvolving(false);
            }
          } else { // 'offline' mode tick emulation
            const mutation = localRequestEvolution(updatedModel);
            if (mutation) {
                setIsEvolving(true);
                // Directly apply mutation; applyApiMutation handles state updates.
                applyApiMutation(mutation, updatedModel);
                setTimeout(() => setIsEvolving(false), 300); // End signal after a short delay for UI feedback
            }
          }

      } catch (error) {
          console.error("Failed to advance simulation:", error);
          const err = error as Error;
          setAdventureLog(prevLog => [...prevLog, { type: 'error', content: `Simulation Error: ${err.message}` }]);
          stopAutoSimulation();
      } finally {
          tickLock.current = false;
          setIsTicking(false);
      }
  }, [stopAutoSimulation, engineMode, applyApiMutation]);
  
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

  const handleImproveOfflineEngine = useCallback(async () => {
    if (!worldModelRef.current || engineMode !== 'online' || isImproving) return;

    setIsImproving(true);
    setAdventureLog(prev => [...prev, { type: 'simulation', content: '[SYSTEM] Consulting the oracle to deepen world logic...' }]);

    try {
        const resource = await requestOfflineResource(worldModelRef.current);
        if (resource && resource.keyword && resource.ascii) {
            setOfflineResources(prev => ({
                ...prev,
                asciiArt: {
                    ...prev.asciiArt,
                    [resource.keyword]: resource.ascii
                }
            }));
            setAdventureLog(prev => [...prev, { type: 'simulation', content: `[SYSTEM] New offline aesthetic registered for '${resource.keyword}'.` }]);
        } else {
            setAdventureLog(prev => [...prev, { type: 'simulation', content: `[SYSTEM] The oracle provided no new insights.` }]);
        }
    } catch (error) {
        console.error("Failed to improve offline engine:", error);
        const err = error as Error;
        setAdventureLog(prev => [...prev, { type: 'error', content: `Oracle Error: ${err.message}` }]);
    } finally {
        setIsImproving(false);
    }
  }, [engineMode, isImproving]);


  const renderContent = () => {
    switch (gameState) {
      case GameState.UPLOADING:
        return <FileUploadScreen onFileUploaded={handleFileUploaded} onLoadRandom={handleLoadRandom} onStartAdventure={handleStartAdventure} errorMessage={errorMessage} />;
      case GameState.GENRE_SELECTION:
        return <GenreSelectionScreen onGenreSelected={handleGenreSelected} onBack={handleBackToUpload} />;
      case GameState.MODE_SELECTION:
        return <ModeSelectionScreen onModeSelected={handleModeSelected} onBack={handleBackToGenre} />;
      case GameState.LOADING:
      case GameState.PROCESSING:
        return <ProcessingScreen />;
      case GameState.PLAYING:
        return worldModel && <GameScreen 
          adventureLog={adventureLog} 
          worldModel={worldModel}
          mutationLog={mutationLog}
          onCommandSubmit={handleCommandSubmit}
          isTicking={isTicking}
          isAutoSimulating={isAutoSimulating}
          isEvolving={isEvolving}
          onStartSimulation={startAutoSimulation}
          onStopSimulation={stopAutoSimulation}
          onAdvanceTick={manualTick}
          onSaveGame={handleSaveGame}
          onReset={handleReset}
          engineMode={engineMode}
          onSetEngineMode={setEngineMode}
          isImproving={isImproving}
          onImproveOfflineEngine={handleImproveOfflineEngine}
        />;
      default:
        return <FileUploadScreen onFileUploaded={handleFileUploaded} onLoadRandom={handleLoadRandom} onStartAdventure={handleStartAdventure} errorMessage="An unknown error occurred." />;
    }
  };

  return (
    <main className="bg-black text-green-400 min-h-screen flex flex-col items-center justify-center p-4 selection:bg-green-700 selection:text-white">
      <div className="w-full max-w-6xl h-[90vh] border-2 border-green-700 bg-gray-900/50 shadow-lg shadow-green-900/50 rounded-lg flex flex-col">
        {renderContent()}
      </div>
       <footer className="text-center text-xs text-green-700 mt-2">
            Multiprosian Library Adventure Engine v0.9.0
        </footer>
    </main>
  );
};

export default App;