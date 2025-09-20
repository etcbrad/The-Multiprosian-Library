import { WorldModel, WorldState, Setting, Character, ApiMutation, WorldObject, ObjectProperty } from '../types';

/**
 * A simple deep-cloning utility to prevent state mutation.
 */
const deepClone = <T>(obj: T): T => JSON.parse(JSON.stringify(obj));
const randomChoice = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

// --- UTILITIES FOR OBJECT & STATE MANIPULATION ---

const getObjectProp = (obj: WorldObject | undefined, key: string): string | undefined => obj?.properties.find(p => p.key === key)?.value;

const setObjectProp = (obj: WorldObject, key: string, value: string) => {
    const prop = obj.properties.find(p => p.key === key);
    if (prop) prop.value = value;
    else obj.properties.push({ key, value });
};

interface ParsedCommand {
    verb: string;
    dobj?: string; // direct object
    prep?: string; // preposition
    iobj?: string; // indirect object
}

const parseCommand = (command: string): ParsedCommand => {
    const commandLower = command.toLowerCase().trim();
    const parts = commandLower.split(/\s+/);
    const verb = parts[0];
    const prepositions = ['on', 'in', 'from', 'with', 'at', 'to', 'inside', 'using'];
    
    let prepIndex = -1;
    for (const prep of prepositions) {
        const index = parts.indexOf(prep);
        if (index > 0) {
            prepIndex = index;
            break;
        }
    }

    if (prepIndex > 0) {
        return {
            verb,
            dobj: parts.slice(1, prepIndex).join(' '),
            prep: parts[prepIndex],
            iobj: parts.slice(prepIndex + 1).join(' ')
        };
    }

    return { verb, dobj: parts.slice(1).join(' ') };
}

// --- CORE ADAPTIVE COMMAND ENGINE ---

/**
 * Processes a player command using a property-driven, adaptive engine.
 */
export const localProcessPlayerCommand = (
    currentWorldModel: WorldModel,
    command: string
): { narrative: string, updatedWorldState: WorldState } => {
    
    const worldModel = deepClone(currentWorldModel);
    const { world_state, settings, objects, characters } = worldModel;
    const parsedCmd = parseCommand(command);
    const { verb, dobj, iobj } = parsedCmd;

    // --- Helper to find an object contextually ---
    const findObjectContextually = (name: string | undefined): { obj: WorldObject | undefined; locType: 'inventory' | 'location' | 'container'; locName: string } | null => {
        if (!name) return null;
        const lowerName = name.toLowerCase().replace(/^(a|an|the)\s+/, '').trim();

        // Check inventory first
        const invItemName = world_state.player_inventory.find(i => i.toLowerCase().replace(/^(a|an|the)\s+/, '').trim() === lowerName);
        if (invItemName) {
            return { obj: objects.find(o => o.name === invItemName), locType: 'inventory', locName: 'player_inventory' };
        }
        
        // Check current location
        const locItem = world_state.object_locations.find(ol => ol.objectName.toLowerCase().replace(/^(a|an|the)\s+/, '').trim() === lowerName && ol.locationName === world_state.current_location);
        if (locItem) {
            return { obj: objects.find(o => o.name === locItem.objectName), locType: 'location', locName: world_state.current_location };
        }

        // Check open containers in the current location
        const openContainersInLocation = world_state.object_locations
            .map(ol => objects.find(o => o.name === ol.objectName && ol.locationName === world_state.current_location))
            .filter(o => o && getObjectProp(o, 'is_container') === 'true' && getObjectProp(o, 'is_open') === 'true');

        for (const container of openContainersInLocation) {
            if (!container) continue;
            const itemInContainer = world_state.object_locations.find(ol => ol.objectName.toLowerCase().replace(/^(a|an|the)\s+/, '').trim() === lowerName && ol.locationName === container.name);
            if (itemInContainer) {
                return { obj: objects.find(o => o.name === itemInContainer.objectName), locType: 'container', locName: container.name };
            }
        }
        
        return null;
    };


    // --- 1. META & WORLD COMMANDS (don't require a direct object) ---
    switch(verb) {
        case 'look':
        case 'l':
        case 'examine': {
             // "look in [container]" or "look at [object]"
            const targetName = (parsedCmd.prep === 'in' || parsedCmd.prep === 'inside') ? iobj : dobj;
            if (targetName) {
                const targetContext = findObjectContextually(targetName);
                if (!targetContext || !targetContext.obj) return { narrative: `You see nothing special about the ${targetName}.`, updatedWorldState: world_state };
                
                const target = targetContext.obj;
                if (getObjectProp(target, 'is_container') === 'true') {
                    if (getObjectProp(target, 'is_open') !== 'true') return { narrative: `The ${target?.name} is closed.`, updatedWorldState: world_state };
                    
                    const contents = world_state.object_locations.filter(ol => ol.locationName === target?.name).map(ol => ol.objectName);
                    if (contents.length > 0) return { narrative: `Inside the ${target?.name}, you see: ${contents.join(', ')}.`, updatedWorldState: world_state };
                    
                    return { narrative: `The ${target?.name} is empty.`, updatedWorldState: world_state };
                }
                // Default "look at object"
                return { narrative: `${target?.name}: ${target?.properties.map(p => p.value).join(', ')}.`, updatedWorldState: world_state };
            }

            // "look" (general)
            const location = settings.find(s => s.name === world_state.current_location);
            const charactersHere = world_state.character_locations.filter(cl => cl.locationName === world_state.current_location).map(cl => cl.characterName);
            const objectsHere = world_state.object_locations.filter(ol => ol.locationName === world_state.current_location).map(ol => {
                const obj = objects.find(o => o.name === ol.objectName);
                if(obj && getObjectProp(obj, 'is_container') === 'true') return `${obj.name} (${getObjectProp(obj, 'is_open') === 'true' ? 'open' : 'closed'})`;
                return ol.objectName;
            });
            let narrative = `You are in ${world_state.current_location}. ${location?.ambience_descriptors.join(' ')}\n`;
            if (charactersHere.length > 0) narrative += `You see: ${charactersHere.join(', ')}.\n`;
            if (objectsHere.length > 0) narrative += `There is a ${objectsHere.join(', ')} here.`;
            return { narrative, updatedWorldState: world_state };
        }
        case 'inventory':
        case 'i': {
            if (world_state.player_inventory.length === 0) return { narrative: "You are not carrying anything.", updatedWorldState: world_state };
            return { narrative: `You have: ${world_state.player_inventory.join(', ')}.`, updatedWorldState: world_state };
        }
        case 'go':
        case 'move':
        case 'travel': {
            if (!dobj) return { narrative: "Where do you want to go?", updatedWorldState: world_state };
            const foundSetting = settings.find(s => s.name.toLowerCase().includes(dobj));
            if (foundSetting) {
                world_state.current_location = foundSetting.name;
                return { narrative: `You travel to ${foundSetting.name}.`, updatedWorldState: world_state };
            }
            return { narrative: `You don't know how to get to a place called "${dobj}".`, updatedWorldState: world_state };
        }
        case 'talk':
        case 'ask': {
             const charName = dobj;
             if (!charName) return { narrative: "Who do you want to talk to?", updatedWorldState: world_state };
             const characterInLocation = characters.find(
                 char => char.name.toLowerCase() === charName && world_state.character_locations.some(loc => loc.characterName === char.name && loc.locationName === world_state.current_location)
             );
             if (!characterInLocation) return { narrative: `You don't see anyone named "${charName}" here.`, updatedWorldState: world_state };
             // Simple dialogue generation
             if (characterInLocation.personality.includes('hurried')) return { narrative: `"${randomChoice(['No time to talk!', 'I shall be late!'])}" ${characterInLocation.name} mutters.`, updatedWorldState: world_state };
             return { narrative: `${characterInLocation.name} nods at you but doesn't say anything.`, updatedWorldState: world_state };
        }
        case 'shave': {
             const hasRazor = findObjectContextually('razor');
             if (hasRazor) {
                 const hasLather = findObjectContextually('lather');
                 if (hasLather) return { narrative: "Using the lather and razor, you have a remarkably close and refreshing shave.", updatedWorldState: world_state };
                 return { narrative: "You have a nice, clean shave. You feel refreshed.", updatedWorldState: world_state };
             }
             return { narrative: "You have nothing to shave with.", updatedWorldState: world_state };
        }
    }

    // --- 2. OBJECT INTERACTION COMMANDS ---
    if (!dobj) return { narrative: `What do you want to ${verb}?`, updatedWorldState: world_state };
    
    const dobjContext = findObjectContextually(dobj);
    const iobjContext = findObjectContextually(iobj);

    switch(verb) {
        case 'take':
        case 'get': {
            if (dobjContext?.locType === 'inventory') return { narrative: "You already have that.", updatedWorldState: world_state };
            if (!dobjContext || !dobjContext.obj) return { narrative: "You don't see that here.", updatedWorldState: world_state };
            
            // Remove from old location
            const oldLocIndex = world_state.object_locations.findIndex(ol => ol.objectName === dobjContext.obj?.name && ol.locationName === dobjContext.locName);
            if (oldLocIndex > -1) world_state.object_locations.splice(oldLocIndex, 1);
            
            // Add to inventory
            world_state.player_inventory.push(dobjContext.obj.name);
            return { narrative: `You take the ${dobjContext.obj.name}.`, updatedWorldState: world_state };
        }
        case 'drop': {
            if (dobjContext?.locType !== 'inventory' || !dobjContext.obj) return { narrative: "You don't have that.", updatedWorldState: world_state };
            
            // Remove from inventory
            const invIndex = world_state.player_inventory.findIndex(i => i === dobjContext.obj?.name);
            if(invIndex > -1) world_state.player_inventory.splice(invIndex, 1);

            // Add to location
            world_state.object_locations.push({ objectName: dobjContext.obj.name, locationName: world_state.current_location });
            return { narrative: `You drop the ${dobjContext.obj.name}.`, updatedWorldState: world_state };
        }
        case 'give': {
            if (!dobj || !iobj) return { narrative: `What do you want to give, and to whom?`, updatedWorldState: world_state };
            
            const itemToGiveContext = findObjectContextually(dobj);

            if (!itemToGiveContext || itemToGiveContext.locType !== 'inventory' || !itemToGiveContext.obj) {
                return { narrative: `You don't have a ${dobj}.`, updatedWorldState: world_state };
            }

            const cleanIobjName = iobj.toLowerCase().replace(/^(a|an|the)\s+/, '').trim();
            const targetCharacter = characters.find(
                char => char.name.toLowerCase() === cleanIobjName
            );

            if (!targetCharacter) {
                 return { narrative: `There is no one called "${iobj}" here.`, updatedWorldState: world_state };
            }
            
            const isCharacterPresent = world_state.character_locations.some(
                loc => loc.characterName === targetCharacter.name && loc.locationName === world_state.current_location
            );

            if (!isCharacterPresent) {
                return { narrative: `You don't see ${targetCharacter.name} here.`, updatedWorldState: world_state };
            }

            // Action is valid. Perform the state change.
            const invIndex = world_state.player_inventory.findIndex(i => i === itemToGiveContext.obj?.name);
            if (invIndex > -1) {
                world_state.player_inventory.splice(invIndex, 1);
            }
            
            // Future: Add item to character's inventory if that gets implemented.
            return { narrative: `You give the ${itemToGiveContext.obj.name} to ${targetCharacter.name}.`, updatedWorldState: world_state };
        }
        case 'read': {
            if (!dobjContext || !dobjContext.obj) return { narrative: `You don't have or see a ${dobj}.`, updatedWorldState: world_state };
            const obj = dobjContext.obj;
            // Dynamic puzzle logic: reading the book reveals the key
            if (getObjectProp(obj, 'on_read_effect') === 'reveals_key' && getObjectProp(obj, 'has_been_read') === 'false') {
                setObjectProp(obj, 'has_been_read', 'true');
                const key = objects.find(o => o.name === 'Silver Key');
                if (key) {
                    world_state.object_locations.push({ objectName: key.name, locationName: world_state.current_location });
                    return { narrative: getObjectProp(obj, 'content_unread') || 'You read the book and a key falls out!', updatedWorldState: world_state };
                }
            }
            if (getObjectProp(obj, 'has_been_read') === 'true') return { narrative: getObjectProp(obj, 'content_read') || `You've already read it.`, updatedWorldState: world_state };
            const content = getObjectProp(obj, 'content');
            if (content) return { narrative: `It reads: "${content}"`, updatedWorldState: world_state };
            return { narrative: `There's nothing to read on the ${obj.name}.`, updatedWorldState: world_state };
        }
        case 'open':
        case 'close': {
             if (dobjContext?.locType === 'inventory') return { narrative: `You can't do that while holding it.`, updatedWorldState: world_state };
             if (!dobjContext || !dobjContext.obj) return { narrative: `You don't see a ${dobj} here.`, updatedWorldState: world_state };
             const obj = dobjContext.obj;
             if (getObjectProp(obj, 'is_container') !== 'true') return { narrative: `You can't ${verb} that.`, updatedWorldState: world_state };

             if (verb === 'open') {
                 if(getObjectProp(obj, 'is_locked') === 'true') return { narrative: "It's locked.", updatedWorldState: world_state };
                 if(getObjectProp(obj, 'is_open') === 'true') return { narrative: "It's already open.", updatedWorldState: world_state };
                 setObjectProp(obj, 'is_open', 'true');
                 return { narrative: `You open the ${obj.name}.`, updatedWorldState: world_state };
             } else { // close
                 if(getObjectProp(obj, 'is_open') !== 'true') return { narrative: "It's already closed.", updatedWorldState: world_state };
                 setObjectProp(obj, 'is_open', 'false');
                 return { narrative: `You close the ${obj.name}.`, updatedWorldState: world_state };
             }
        }
        case 'use':
        case 'unlock': {
            let toolContext, targetContext;

            if (verb === 'unlock' || (verb === 'use' && parsedCmd.prep === 'with')) {
                // Handles "unlock TARGET with TOOL" and "use TARGET with TOOL"
                toolContext = iobjContext;
                targetContext = dobjContext;
            } else {
                // Handles "use TOOL on/in/at TARGET" etc.
                toolContext = dobjContext;
                targetContext = iobjContext;
            }

            if (!toolContext || !targetContext || !toolContext.obj || !targetContext.obj) {
                if (verb === 'unlock') return { narrative: `What do you want to unlock, and with what?`, updatedWorldState: world_state };
                return { narrative: `What do you want to use, and on what?`, updatedWorldState: world_state };
            }
            
            const tool = toolContext.obj;
            const target = targetContext.obj;

            // 1. Specific Unlock Logic
            const toolId = getObjectProp(tool, 'item_id');
            const targetKeyId = getObjectProp(target, 'key_id');

            if (getObjectProp(target, 'is_locked') === 'true' && toolId && toolId === targetKeyId) {
                setObjectProp(target, 'is_locked', 'false');
                let narrative = `You use the ${tool.name} on the ${target.name}. It unlocks with a click.`;

                // Auto-take key if not in inventory and used from the location
                if (toolContext.locType !== 'inventory') {
                    const locIndex = world_state.object_locations.findIndex(ol => ol.objectName === tool.name && ol.locationName === toolContext.locName);
                    if(locIndex > -1) world_state.object_locations.splice(locIndex, 1);
                    world_state.player_inventory.push(tool.name);
                    narrative = `You pick up the ${tool.name} and use it on the ${target.name}. It unlocks with a click.`;
                }
                return { narrative, updatedWorldState: world_state };
            }

            // 2. Generic Property-Based 'use' Logic, using the tool's item_id
            if (toolId) {
                const interactionPropKey = `on_use_${toolId}`;
                const interactionNarrative = getObjectProp(target, interactionPropKey);
                if (interactionNarrative) {
                    // Future enhancement: parse narrative for state changes like "consume:target"
                    return { narrative: interactionNarrative, updatedWorldState: world_state };
                }
            }
            
            // 3. Generic Consequence-Based 'use' Logic for misuse
            const targetSurface = getObjectProp(target, 'surface');
            if (targetSurface) {
                const interactionPropKey = `on_use_on_${targetSurface}`;
                const interactionNarrativeTemplate = getObjectProp(tool, interactionPropKey);
                if (interactionNarrativeTemplate) {
                    const narrative = interactionNarrativeTemplate.replace('{target_name}', target.name);
                    
                    // Check for consequences, like destroying the tool
                    if (getObjectProp(tool, 'on_break_destroy') === 'true') {
                        // The tool must be in the player's inventory to be used this way and destroyed.
                        if (toolContext.locType === 'inventory') {
                            const invIndex = world_state.player_inventory.findIndex(i => i === tool.name);
                            if(invIndex > -1) world_state.player_inventory.splice(invIndex, 1);
                        }
                    }

                    return { narrative, updatedWorldState: world_state };
                }
            }
            
            // 4. Fallback for unhandled interactions
            return { narrative: "That doesn't seem to do anything.", updatedWorldState: world_state };
        }
        case 'eat': {
            if (!dobjContext || !dobjContext.obj) return { narrative: `You don't have or see any ${dobj} to eat.`, updatedWorldState: world_state };
            const obj = dobjContext.obj;
            if (getObjectProp(obj, 'is_edible') !== 'true') return { narrative: `You can't eat the ${obj.name}.`, updatedWorldState: world_state };

            // Consume item
            if (dobjContext.locType === 'inventory') {
                const invIndex = world_state.player_inventory.findIndex(i => i === obj.name);
                if(invIndex > -1) world_state.player_inventory.splice(invIndex, 1);
            } else {
                const locIndex = world_state.object_locations.findIndex(ol => ol.objectName === obj.name && ol.locationName === dobjContext.locName);
                if(locIndex > -1) world_state.object_locations.splice(locIndex, 1);
            }
            const effect = getObjectProp(obj, 'effect');
            return { narrative: effect ? `You eat the ${obj.name}. ${effect}` : `You eat the ${obj.name}.`, updatedWorldState: world_state };
        }
        // --- 3. ADAPTIVE GENERIC VERB HANDLER ---
        default: {
            if (!dobjContext || !dobjContext.obj) return { narrative: `You don't see any ${dobj} to ${verb}.`, updatedWorldState: world_state };
            const customVerbProp = getObjectProp(dobjContext.obj, `on_${verb}`);
            if (customVerbProp) {
                // Future enhancement: parse property for state changes, e.g., "state=open;narrative=It opens."
                return { narrative: customVerbProp, updatedWorldState: world_state };
            }
            return { narrative: `You can't ${verb} the ${dobj}.`, updatedWorldState: world_state };
        }
    }
};


/**
 * Advances the simulation by one "tick" using a simple, deterministic ruleset.
 */
export const localAdvanceSimulation = (
    currentWorldModel: WorldModel
): { narrative: string, updatedWorldState: WorldState } => {
    const worldModel = deepClone(currentWorldModel);
    const { world_state } = worldModel;
    
    // Time Progression
    const timeParts = world_state.time.split(',');
    const dayMatch = timeParts[0].match(/\d+/);
    let day = dayMatch ? parseInt(dayMatch[0], 10) : 1;
    const originalDay = day;
    
    let timeOfDay = timeParts[1] ? timeParts[1].trim() : "Morning";
    
    const timeProgressionOrder: string[] = ["Morning", "Afternoon", "Evening", "Night"];
    let currentTimeIndex = -1;

    // Find the current stage in the day by checking if the current time string includes any of our keywords.
    // This makes it robust against descriptive times like "Dreary Afternoon".
    for (let i = 0; i < timeProgressionOrder.length; i++) {
        if (timeOfDay.includes(timeProgressionOrder[i])) {
            currentTimeIndex = i;
            break;
        }
    }

    if (currentTimeIndex !== -1 && currentTimeIndex < timeProgressionOrder.length - 1) {
        // If we're not at the end of the day, advance to the next period.
        timeOfDay = timeProgressionOrder[currentTimeIndex + 1];
    } else {
        // Otherwise, it's the next day.
        timeOfDay = "Morning";
        day += 1;
    }

    world_state.time = `Day ${day}, ${timeOfDay}`;
    
    if (day > originalDay) {
        return { narrative: `A new day begins.`, updatedWorldState: world_state };
    }
    
    return { narrative: '', updatedWorldState: world_state };
};

// --- OFFLINE ASSET EMULATION ---

const OFFLINE_ASCII_ART: Record<string, string> = {
  default: `
  [ procedural imaging system ]
    +-----------------------+
    |       .......         |
    |     .:::::::::.       |
    |    :::-------:::.     |
    |    ::         ::.     |
    |    :: reality ::.     |
    |    '::.......::'      |
    |     ':::::::::'       |
    |        '''''          |
    +-----------------------+
  `,
  library: `
 _______________________
|| o || o || o || o || o|
||---------------------||
|| o || o || o || o || o|
||_____________________||
Rows of silent knowledge.
  `,
  cave: `
      ______
     /  ()  \\
    /        \\
   /          \\
  | cave mouth |
   \\          /
    \\________/
The drip of water echoes.
  `,
  sea: `
~ ~ ~ ~ ~ ~ ~ ~ ~ ~
  ~ ~ ~ ~ ~ ~ ~ ~
~ ~ ~ ~ ~ ~ ~ ~ ~ ~
    ~ ~ ~ ~ ~ ~ ~
 The endless ocean.
  `,
};

export const localGenerateAsciiArt = (worldModel: WorldModel, dynamicArt?: Record<string, string>): string => {
    const { world_state, settings } = worldModel;
    const currentLocation = settings.find(s => s.name === world_state.current_location);
    if (currentLocation) {
        const ambiance = currentLocation.ambience_descriptors.join(' ').toLowerCase();

        if (dynamicArt) {
            for (const key in dynamicArt) {
                if (ambiance.includes(key)) return dynamicArt[key];
            }
        }
        for (const key in OFFLINE_ASCII_ART) {
            if (key !== 'default' && ambiance.includes(key)) return OFFLINE_ASCII_ART[key];
        }
    }
    return OFFLINE_ASCII_ART['default'];
};


export const localRequestEvolution = (worldModel: WorldModel): ApiMutation | null => {
    if (Math.random() > 0.05) return null;

    if (Math.random() > 0.5) {
        const potentialObjects: WorldObject[] = [
            { name: "A forgotten coin", properties: [{ key: 'material', value: 'tarnished brass' }] },
            { name: "A rusty key", properties: [{ key: 'feature', value: 'ornate handle' }] },
        ];
        const newObject = randomChoice(potentialObjects);
        if (worldModel.objects.some(o => o.name === newObject.name)) return null;
        return { type: 'ADD_OBJECT', payload: newObject, reason: 'The world shifts in subtle ways.' };
    } else {
        const enhancements = [
            'A floorboard creaks ominously in the distance.',
            'The scent of old paper and dust hangs heavy in the air.',
        ];
        // FIX: Corrected typo from ENHANCE_NARRANTIVE to ENHANCE_NARRATIVE to match the ApiMutation type.
        return { type: 'ENHANCE_NARRATIVE', payload: randomChoice(enhancements), reason: 'A detail sharpens into focus.' };
    }
};