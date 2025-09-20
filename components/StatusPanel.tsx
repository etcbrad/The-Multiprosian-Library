
import React from 'react';
import { WorldModel } from '../types';

const StatusPanel: React.FC<{ worldModel: WorldModel }> = ({ worldModel }) => {
    const { world_state, characters } = worldModel;
    const { current_location, time, player_inventory, character_locations } = world_state;

    const charactersInLocation = Object.values(characters).filter(
        char => character_locations[char.name] === current_location
    );

    return (
        <div className="w-1/3 border-l-2 border-green-800 p-4 flex flex-col overflow-y-hidden text-green-400">
            <h3 className="font-display text-2xl text-green-300 mb-4 flex-shrink-0">// STATUS REPORT //</h3>
            <div className="overflow-y-auto pr-2 space-y-4 scrollbar-thin scrollbar-thumb-green-700 scrollbar-track-black/50 text-sm">
                
                <div>
                    <h4 className="font-bold text-green-300">Location</h4>
                    <p>{current_location}</p>
                </div>

                <div>
                    <h4 className="font-bold text-green-300">Time</h4>
                    <p>{time}</p>
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

            </div>
        </div>
    );
};

export default StatusPanel;
