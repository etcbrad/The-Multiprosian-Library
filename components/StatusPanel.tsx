import React from 'react';
import { WorldModel, MutationLogEntry, WorldObject, Objective } from '../types';
import { Bot, FilePlus, MessageSquarePlus, Clock, Target, CheckCircle2, Circle } from 'lucide-react';
import MapView from './MapView';

const StatusPanel: React.FC<{ worldModel: WorldModel; mutationLog: MutationLogEntry[] }> = ({ worldModel, mutationLog }) => {
    const { world_state, characters } = worldModel;
    const { current_location, time, player_inventory, character_locations, environment, mode, objectives } = world_state;

    const charactersInLocation = characters.filter(
        char => character_locations.some(loc => loc.characterName === char.name && loc.locationName === current_location)
    );
    
    const renderMutation = (entry: MutationLogEntry) => {
        const { mutation } = entry;
        switch(mutation.type) {
            case 'ADD_OBJECT':
                const obj = mutation.payload as WorldObject;
                return (
                    <div className="flex gap-2">
                        <FilePlus size={16} className="text-purple-400 flex-shrink-0 mt-1"/>
                        <div>
                            <p className="font-semibold text-purple-300">Object Added: {obj.name}</p>
                            <p className="text-xs text-gray-400 italic">"{mutation.reason}"</p>
                        </div>
                    </div>
                )
            case 'ENHANCE_NARRATIVE':
                 return (
                    <div className="flex gap-2">
                        <MessageSquarePlus size={16} className="text-cyan-400 flex-shrink-0 mt-1"/>
                        <div>
                             <p className="font-semibold text-cyan-300">Narrative Enhanced</p>
                            <p className="text-xs text-gray-400 italic">"{mutation.payload as string}"</p>
                        </div>
                    </div>
                )
            default:
                return <p>Unknown mutation type.</p>
        }
    }
    
    const renderObjectives = (objectives: Objective[]) => {
        return (
             <div>
                <h4 className="font-bold text-green-300 flex items-center gap-2 mt-4 border-t border-green-800 pt-4"><Target size={16}/> Objectives</h4>
                {objectives.length > 0 ? (
                    <ul className="space-y-2 mt-2">
                        {objectives.map(obj => (
                            <li key={obj.description} className={`flex items-start gap-2 ${obj.is_completed ? 'text-gray-500 line-through' : ''}`}>
                                {obj.is_completed ? <CheckCircle2 size={16} className="flex-shrink-0 mt-0.5"/> : <Circle size={16} className="flex-shrink-0 mt-0.5"/>}
                                <span>{obj.description}</span>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="text-green-600">None</p>
                )}
            </div>
        )
    }

    return (
        <div className="w-1/3 border-l-2 border-green-800 p-4 flex flex-col overflow-y-hidden text-green-400">
            <h3 className="font-display text-2xl text-green-300 mb-4 flex-shrink-0">// WORLD STATE //</h3>
            <MapView worldModel={worldModel} />
            <div className="overflow-y-auto pr-2 space-y-4 scrollbar-thin scrollbar-thumb-green-700 scrollbar-track-black/50 text-sm mt-4 pt-4 border-t border-green-800">
                
                <div>
                    <h4 className="font-bold text-green-300">Location</h4>
                    <p>{current_location}</p>
                </div>

                <div>
                    <h4 className="font-bold text-green-300 flex items-center gap-2">
                        <Clock size={14}/>
                        Time
                    </h4>
                    <p className="pl-6">{time}</p>
                </div>

                <div>
                    <h4 className="font-bold text-green-300">Environment</h4>
                    <p>Weather: {environment?.weather || 'N/A'}</p>
                    <p>Lighting: {environment?.lighting || 'N/A'}</p>
                </div>
                
                <div>
                    <h4 className="font-bold text-green-300">Inventory</h4>
                    {player_inventory.length > 0 ? (
                        <ul>
                            {player_inventory.map(item => <li key={item}>- {item}</li>)}
                        </ul>
                    ) : (
                        <p className="text-green-600">Empty</p>
                    )}
                </div>

                <div>
                    <h4 className="font-bold text-green-300">Characters Present</h4>
                     {charactersInLocation.length > 0 ? (
                        <ul>
                            {charactersInLocation.map(char => (
                                <li key={char.name} className="mb-2">
                                    <span className="font-semibold">{char.name}</span>
                                    <p className="text-xs text-green-500 pl-2">{char.personality.join(', ')}</p>
                                </li>
                            ))}
                        </ul>
                     ) : (
                        <p className="text-green-600">None</p>
                     )}
                </div>

                {mode === 'Narrative' && renderObjectives(objectives)}

                <div>
                    <h4 className="font-bold text-green-300 flex items-center gap-2 mt-4 border-t border-green-800 pt-4"><Bot size={16}/> Mutation Log</h4>
                    {mutationLog.length > 0 ? (
                        <ul className="space-y-3 mt-2">
                            {mutationLog.map(entry => <li key={entry.id}>{renderMutation(entry)}</li>)}
                        </ul>
                    ) : (
                        <p className="text-green-600">No API evolutions applied yet.</p>
                    )}
                </div>

            </div>
        </div>
    );
};

export default StatusPanel;