
import React, { useMemo, useEffect, useState } from 'react';
import { WorldModel } from '../types';

interface MapViewProps {
    worldModel: WorldModel;
}

interface LocationLayout {
    [locationName: string]: { x: number; y: number };
}

const GLYPHS = {
    PLAYER: '@',
    CHARACTER: '&',
    OBJECT: '*',
};

const MapView: React.FC<MapViewProps> = ({ worldModel }) => {
    const { settings, world_state } = worldModel;
    const [pulseKey, setPulseKey] = useState(0);

    const layout = useMemo<LocationLayout>(() => {
        const newLayout: LocationLayout = {};
        const gridWidth = Math.ceil(Math.sqrt(settings.length));
        settings.forEach((setting, i) => {
            newLayout[setting.name] = {
                x: i % gridWidth,
                y: Math.floor(i / gridWidth),
            };
        });
        return newLayout;
    }, [settings]);

    // This effect triggers the pulse animation on the current location whenever it changes.
    useEffect(() => {
        setPulseKey(prev => prev + 1);
    }, [world_state.current_location]);


    const gridHeight = settings.length > 0 ? Math.ceil(settings.length / Math.ceil(Math.sqrt(settings.length))) : 0;
    const CELL_SIZE = 80; // size of each grid cell in pixels

    return (
        <div className="bg-black/30 border border-green-800 p-2 rounded-md h-48 overflow-auto relative scrollbar-thin scrollbar-thumb-green-700 scrollbar-track-black/50">
            <div className="relative" style={{ width: Math.ceil(Math.sqrt(settings.length)) * CELL_SIZE, height: gridHeight * CELL_SIZE }}>
                {settings.map(setting => {
                    const { x, y } = layout[setting.name];
                    const isCurrentLocation = setting.name === world_state.current_location;

                    const charactersInLocation = world_state.character_locations
                        .filter(loc => loc.locationName === setting.name)
                        .map(loc => loc.characterName);
                    
                    const objectsInLocation = world_state.object_locations
                        .filter(loc => loc.locationName === setting.name)
                        .map(loc => loc.objectName);

                    return (
                        <div
                            key={setting.name}
                            className={`absolute border border-green-900 rounded-sm p-1 transition-all duration-500 ${isCurrentLocation ? 'bg-green-900/50 border-green-500 z-10' : 'bg-gray-900/50'}`}
                            style={{
                                left: x * CELL_SIZE,
                                top: y * CELL_SIZE,
                                width: CELL_SIZE - 4,
                                height: CELL_SIZE - 4,
                            }}
                        >
                            {isCurrentLocation && (
                                <style key={pulseKey}>
                                    {`
                                    @keyframes pulse-animation {
                                        0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
                                        70% { box-shadow: 0 0 0 10px rgba(16, 185, 129, 0); }
                                        100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
                                    }
                                    .pulse-effect {
                                        animation: pulse-animation 1.5s;
                                    }
                                    `}
                                </style>
                            )}
                            <div className={`w-full h-full relative ${isCurrentLocation ? 'pulse-effect' : ''}`}>
                                <p className="text-xs text-green-600 truncate" title={setting.name}>{setting.name}</p>
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex gap-1 text-lg">
                                    {isCurrentLocation && <span className="text-yellow-300 font-bold" title="You are here">{GLYPHS.PLAYER}</span>}
                                    {charactersInLocation.map(char => (
                                        <span key={char} className="text-cyan-400" title={char}>{GLYPHS.CHARACTER}</span>
                                    ))}
                                    {objectsInLocation.map(obj => (
                                        <span key={obj} className="text-purple-400" title={obj}>{GLYPHS.OBJECT}</span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default MapView;
