import { WorldModel, WorldState, Setting, Character, ApiMutation, WorldObject, ObjectProperty } from '../types';

/**
 * A simple deep-cloning utility to prevent state mutation.
 */
const deepClone = <T>(obj: T): T => JSON.parse(JSON.stringify(obj));
const randomChoice = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

// --- NEW: Procedural Text Generation (Tracery-like) ---

/**
 * A simple procedural grammar expansion utility.
 * Replaces #key# with a random value from the grammar's key.
 */
const proceduralGenerate = (grammar: Record<string, string[]>, startSymbol: string = '#origin#'): string => {
    let text = randomChoice(grammar[startSymbol.slice(1, -1)] || ['']);
    const regex = /#(\w+)#/g;
    for (let i = 0; i < 10; i++) { // Limit recursion to prevent infinite loops
        let match = regex.exec(text);
        if (!match) break;
        text = text.replace(match[0], randomChoice(grammar[match[1]] || ['']));
        regex.lastIndex = 0; // Reset regex index
    }
    return text;
};

// --- Utilities for object properties ---
const getObjectProp = (obj: WorldObject | undefined, key: string): string | undefined => obj?.properties.find(p => p.key === key)?.value;
const setObjectProp = (obj: WorldObject, key: string, value: string) => {
    const prop = obj.properties.find(p => p.key === key);
    if (prop) prop.value = value;
    else obj.properties.push({ key, value });
};

// --- Command Parser ---
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
    const prepositions = ['on', 'in', 'from', 'with', 'at', 'to', 'inside'];
    
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


// --- Command Handlers ---

const handleLook = (worldModel: WorldModel, parsedCmd: ParsedCommand): string => {
    const { world_state, settings, objects, characters } = worldModel;
    const { dobj, prep, iobj } = parsedCmd;
    const target = prep === 'in' || prep === 'inside' ? iobj : dobj;

    // "look in [container]"
    if (target) {
        const container = objects.find(o => o.name.toLowerCase() === target && world_state.object_locations.some(ol => ol.objectName === o.name && ol.locationName === world_state.current_location));
        if (container) {
            if (getObjectProp(container, 'is_container') !== 'true') {
                return `You can't look inside the ${container.name}.`;
            }
            if (getObjectProp(container, 'is_open') !== 'true') {
                return `The ${container.name} is closed.`;
            }
            const contents = world_state.object_locations
                .filter(ol => ol.locationName === container.name)
                .map(ol => ol.objectName);
            
            if (contents.length > 0) {
                return `Inside the ${container.name}, you see: ${contents.join(', ')}.`;
            }
            return `The ${container.name} is empty.`;
        }

        const entity = [...objects, ...characters].find(e => e.name.toLowerCase() === target);
        if (entity) {
            if ('properties' in entity) {
                 return `${entity.name}: ${entity.properties.map(p => p.value).join(', ')}.`;
            }
            if ('personality' in entity) {
                return `${entity.name} seems ${entity.personality.join(' and ')}. Their goal is to ${entity.goals.join(', ')}.`;
            }
        }
        return `You see nothing special about the ${target}.`;
    }

    // "look"
    const location = settings.find(s => s.name === world_state.current_location);
    const charactersHere = world_state.character_locations
        .filter(cl => cl.locationName === world_state.current_location)
        .map(cl => cl.characterName);
    const objectsHere = world_state.object_locations
        .filter(ol => ol.locationName === world_state.current_location)
        .map(ol => {
            const obj = objects.find(o => o.name === ol.objectName);
            if(obj && getObjectProp(obj, 'is_container') === 'true') {
                return `${obj.name} (${getObjectProp(obj, 'is_open') === 'true' ? 'open' : 'closed'})`;
            }
            return ol.objectName;
        });
        
    let narrative = `You are in ${world_state.current_location}. ${location?.ambience_descriptors.join(' ')}\n`;
    if (charactersHere.length > 0) {
        narrative += `You see: ${charactersHere.join(', ')}.\n`;
    }
    if (objectsHere.length > 0) {
        narrative += `There is a ${objectsHere.join(', ')} here.`;
    }
    return narrative;
};

const handleInventory = (worldModel: WorldModel, parsedCmd: ParsedCommand): string => {
    // Fix: Destructure world_state for consistency and cleaner access.
    const { world_state } = worldModel;
    if (world_state.player_inventory.length === 0) {
        return "You are not carrying anything.";
    }
    return `You have: ${world_state.player_inventory.join(', ')}.`;
};

const handleTake = (worldModel: WorldModel, parsedCmd: ParsedCommand): string => {
    // Fix: Destructure world_state to resolve reference error and improve consistency.
    const { world_state } = worldModel;
    const { dobj, iobj } = parsedCmd; // dobj = item, iobj = container
    const itemName = dobj;
    if (!itemName) return "What do you want to take?";

    // Taking from a container?
    if (iobj) {
         const container = worldModel.objects.find(o => o.name.toLowerCase() === iobj && world_state.object_locations.some(ol => ol.objectName === o.name && ol.locationName === world_state.current_location));
         if (!container) return `You don't see a ${iobj} here.`;
         if (getObjectProp(container, 'is_open') !== 'true') return `The ${iobj} is closed.`;

        const itemIndex = world_state.object_locations.findIndex(
            ol => ol.locationName === container.name && ol.objectName.toLowerCase() === itemName
        );
        if (itemIndex > -1) {
            const [item] = world_state.object_locations.splice(itemIndex, 1);
            world_state.player_inventory.push(item.objectName);
            return `You take the ${item.objectName} from the ${container.name}.`;
        }
        return `There is no ${itemName} in the ${container.name}.`;
    }

    // Taking from the room
    const itemIndex = world_state.object_locations.findIndex(
        ol => ol.locationName === world_state.current_location && ol.objectName.toLowerCase() === itemName
    );
    if (itemIndex > -1) {
        const [item] = world_state.object_locations.splice(itemIndex, 1);
        world_state.player_inventory.push(item.objectName);
        return `You take the ${item.objectName}.`;
    }
    return "You don't see that here.";
};

const handleDrop = (worldModel: WorldModel, parsedCmd: ParsedCommand): string => {
    // Fix: Destructure world_state for consistency.
    const { world_state } = worldModel;
    const itemName = parsedCmd.dobj;
    if (!itemName) return "What do you want to drop?";

    const itemIndex = world_state.player_inventory.findIndex(
        invItem => invItem.toLowerCase() === itemName
    );
    if (itemIndex > -1) {
        const [item] = world_state.player_inventory.splice(itemIndex, 1);
        world_state.object_locations.push({ objectName: item, locationName: world_state.current_location });
        return `You drop the ${item}.`;
    }
    return "You don't have that.";
};

const handleGo = (worldModel: WorldModel, parsedCmd: ParsedCommand): string => {
    // Fix: Destructure world_state for consistency.
    const { world_state } = worldModel;
    const locationName = parsedCmd.dobj;
    if (!locationName) return "Where do you want to go?";
    
    const foundSetting = worldModel.settings.find(s => s.name.toLowerCase().includes(locationName));
    if (foundSetting) {
        world_state.current_location = foundSetting.name;
        return `You travel to ${foundSetting.name}.`;
    }
    return `You don't know how to get to a place called "${locationName}".`;
};

const handleTalkTo = (worldModel: WorldModel, parsedCmd: ParsedCommand): string => {
    const characterName = parsedCmd.dobj;
    if (!characterName) return "Who do you want to talk to?";
    const { world_state, characters } = worldModel;

    const characterInLocation = characters.find(
        char => char.name.toLowerCase() === characterName &&
                world_state.character_locations.some(loc => loc.characterName === char.name && loc.locationName === world_state.current_location)
    );

    if (!characterInLocation) {
        return `You don't see anyone named "${characterName}" here.`;
    }

    const { name, personality } = characterInLocation;
    if (personality.includes('hurried') || personality.includes('anxious')) {
        return `"${randomChoice(['No time to talk!', 'I shall be late!', 'Oh dear, oh dear!'])}" ${name} mutters, barely looking at you.`;
    }
    if (personality.includes('melancholic') || personality.includes('philosophical')) {
        return `${name} regards you with a distant gaze. "${randomChoice(['The world is a grand stage, is it not?', 'What is it you truly seek?', 'Some questions have no answers.'])}"`;
    }
    if (personality.includes('ambitious') || personality.includes('confident')) {
        return `${name} sizes you up. "${randomChoice(['State your purpose.', 'Do not waste my time.', 'Success favors the bold.'])}"`;
    }
    return `${name} nods at you but doesn't say anything.`;
};

const handleRead = (worldModel: WorldModel, parsedCmd: ParsedCommand): string => {
    const itemName = parsedCmd.dobj;
    if (!itemName) return "What do you want to read?";

    const { world_state, objects } = worldModel;
    const itemInInventory = world_state.player_inventory.find(invItem => invItem.toLowerCase() === itemName);
    const itemInLocation = world_state.object_locations.find(
        locItem => locItem.locationName === world_state.current_location && locItem.objectName.toLowerCase() === itemName
    );

    if (!itemInInventory && !itemInLocation) {
        return `You don't see a "${itemName}" here.`;
    }

    const objectName = itemInInventory || itemInLocation?.objectName;
    const object = objects.find(obj => obj.name === objectName);

    const contentProp = object?.properties.find(p => p.key === 'content');
    if (contentProp) {
        return `The ${object?.name} reads: "${contentProp.value}"`;
    }

    return `There is nothing to read on the ${itemName}.`;
};

const handleOpen = (worldModel: WorldModel, parsedCmd: ParsedCommand): string => {
    // Fix: Destructure world_state for consistency.
    const { world_state } = worldModel;
    const targetName = parsedCmd.dobj;
    if (!targetName) return "What do you want to open?";

    const target = worldModel.objects.find(o => o.name.toLowerCase() === targetName && world_state.object_locations.some(ol => ol.objectName === o.name && ol.locationName === world_state.current_location));
    if (!target) return `You don't see a ${targetName} here.`;
    if (getObjectProp(target, 'is_container') !== 'true') return `You can't open that.`;
    if (getObjectProp(target, 'is_locked') === 'true') return "It's locked.";
    if (getObjectProp(target, 'is_open') === 'true') return "It's already open.";
    
    setObjectProp(target, 'is_open', 'true');
    return `You open the ${target.name}.`;
}

const handleClose = (worldModel: WorldModel, parsedCmd: ParsedCommand): string => {
    // Fix: Destructure world_state for consistency.
    const { world_state } = worldModel;
    const targetName = parsedCmd.dobj;
    if (!targetName) return "What do you want to close?";

    const target = worldModel.objects.find(o => o.name.toLowerCase() === targetName && world_state.object_locations.some(ol => ol.objectName === o.name && ol.locationName === world_state.current_location));
    if (!target) return `You don't see a ${targetName} here.`;
    if (getObjectProp(target, 'is_container') !== 'true') return `You can't close that.`;
    if (getObjectProp(target, 'is_open') !== 'true') return "It's already closed.";
    
    setObjectProp(target, 'is_open', 'false');
    return `You close the ${target.name}.`;
}

const handleUse = (worldModel: WorldModel, parsedCmd: ParsedCommand): string => {
    const { world_state } = worldModel;
    const {dobj, iobj} = parsedCmd;
    if (!dobj || !iobj) return "What do you want to use on what?";

    // Check for tool in inventory OR location
    const toolInInventory = worldModel.objects.find(o => o.name.toLowerCase() === dobj && world_state.player_inventory.includes(o.name));
    const toolInLocation = worldModel.objects.find(o => o.name.toLowerCase() === dobj && world_state.object_locations.some(ol => ol.objectName === o.name && ol.locationName === world_state.current_location));
    const tool = toolInInventory || toolInLocation;

    if (!tool) return `You don't have or see a ${dobj}.`;

    const target = worldModel.objects.find(o => o.name.toLowerCase() === iobj && world_state.object_locations.some(ol => ol.objectName === o.name && ol.locationName === world_state.current_location));
    if (!target) return `You don't see a ${iobj} here.`;

    const toolId = getObjectProp(tool, 'item_id');
    const targetKeyId = getObjectProp(target, 'key_id');

    if (getObjectProp(target, 'is_locked') === 'true' && toolId && toolId === targetKeyId) {
        setObjectProp(target, 'is_locked', 'false');
        
        // If the tool was used from the location, automatically pick it up.
        if (toolInLocation && !toolInInventory) {
            world_state.player_inventory.push(tool.name);
            const locIndex = world_state.object_locations.findIndex(ol => ol.objectName === tool.name && ol.locationName === world_state.current_location);
            if(locIndex > -1) world_state.object_locations.splice(locIndex, 1);
            return `You pick up the ${tool.name} and use it on the ${target.name}. It unlocks with a click.`;
        }
        return `You use the ${tool.name} on the ${target.name}. It unlocks with a click.`;
    }

    return "That doesn't seem to do anything.";
};

const handleShave = (worldModel: WorldModel, parsedCmd: ParsedCommand): string => {
    const { world_state } = worldModel;
    const hasRazorInInventory = world_state.player_inventory.some(item => item.toLowerCase().includes('razor'));
    const hasRazorInLocation = world_state.object_locations.some(
        loc => loc.locationName === world_state.current_location && loc.objectName.toLowerCase().includes('razor')
    );

    if (hasRazorInInventory || hasRazorInLocation) {
        const hasLather = world_state.object_locations.some(
            loc => loc.locationName === world_state.current_location && loc.objectName.toLowerCase().includes('lather')
        );
        if (hasLather) {
            return "Using the lather and razor, you have a remarkably close and refreshing shave.";
        }
        return "You have a nice, clean shave. You feel refreshed.";
    }

    return "You have nothing to shave with.";
};

const handleEat = (worldModel: WorldModel, parsedCmd: ParsedCommand): string => {
    const { world_state, objects } = worldModel;
    const itemName = parsedCmd.dobj;
    if (!itemName) return "What do you want to eat?";

    const lowerItemName = itemName.toLowerCase();

    // Check inventory or location for the item
    const itemInInventory = world_state.player_inventory.find(invItem => invItem.toLowerCase().includes(lowerItemName));
    const itemInLocationObj = world_state.object_locations.find(
        locItem => locItem.locationName === world_state.current_location && locItem.objectName.toLowerCase().includes(lowerItemName)
    );
    const itemInLocation = itemInLocationObj ? itemInLocationObj.objectName : undefined;
    const targetItemName = itemInInventory || itemInLocation;

    if (!targetItemName) {
        return `You don't have or see any ${itemName} to eat.`;
    }

    const itemObject = objects.find(o => o.name === targetItemName);
    if (getObjectProp(itemObject, 'is_edible') !== 'true') {
        return `You can't eat the ${targetItemName}.`;
    }
    
    // Consume the item
    if (itemInInventory) {
        const invIndex = world_state.player_inventory.findIndex(i => i === targetItemName);
        if (invIndex > -1) world_state.player_inventory.splice(invIndex, 1);
    } else if (itemInLocation) {
        const locIndex = world_state.object_locations.findIndex(ol => ol.objectName === targetItemName && ol.locationName === world_state.current_location);
        if (locIndex > -1) world_state.object_locations.splice(locIndex, 1);
    }

    const effect = getObjectProp(itemObject, 'effect');
    return effect ? `You eat the ${targetItemName}. ${effect}` : `You eat the ${targetItemName}. It's quite tasty.`;
};


const commandHandlers: Record<string, (model: WorldModel, parsedCmd: ParsedCommand) => string> = {
    'look': handleLook, 'l': handleLook, 'examine': handleLook,
    'inventory': handleInventory, 'i': handleInventory,
    'take': handleTake, 'get': handleTake,
    'drop': handleDrop,
    'go': handleGo, 'move': handleGo, 'travel': handleGo,
    'talk': handleTalkTo, 'ask': handleTalkTo,
    'read': handleRead,
    'open': handleOpen,
    'close': handleClose,
    'use': handleUse,
    'shave': handleShave,
    'eat': handleEat,
};

/**
 * Processes a player command using a simple, deterministic ruleset.
 */
export const localProcessPlayerCommand = (
    currentWorldModel: WorldModel,
    command: string
): { narrative: string, updatedWorldState: WorldState } => {
    
    const worldModel = deepClone(currentWorldModel);
    let narrative = "I don't understand that command.";

    const parsedCmd = parseCommand(command);
    const handler = commandHandlers[parsedCmd.verb];
    
    if (handler) {
        narrative = handler(worldModel, parsedCmd);
    } else if (parsedCmd.verb === 'unlock') { // alias for 'use key on target'
        const newParsedCmd = { verb: 'use', dobj: parsedCmd.iobj, iobj: parsedCmd.dobj, prep: 'on' };
        narrative = handleUse(worldModel, newParsedCmd);
    }


    return { narrative, updatedWorldState: worldModel.world_state };
};


/**
 * Generates a dynamic, descriptive narrative for a simulation tick based on world state.
 */
const generateTickNarrative = (worldModel: WorldModel): string | null => {
    const { world_state, settings, characters } = worldModel;
    
    const currentLocation = settings.find(s => s.name === world_state.current_location);
    const character = randomChoice(characters.filter(
        char => world_state.character_locations.some(
            loc => loc.characterName === char.name && loc.locationName === world_state.current_location
        )
    ));

    const grammar: Record<string, string[]> = {
        origin: ['#sensory#', '#character#', '#environment#'],
        sensory: [
            'The scent of #smell# hangs in the air.',
            'A floorboard creaks somewhere in the building.',
            'The distant sound of #sound# tolls once, then falls silent.',
            'A faint, unidentifiable scent drifts by on the air.',
        ],
        smell: ['old paper', 'dust', 'damp stone', 'ozone'],
        sound: ['a bell', 'a closing door', 'a faint shout'],
        character: character ? [
            `${character.name} ${randomChoice(character.personality.includes('anxious') ? ['glances nervously towards the exit', 'taps their foot impatiently'] : ['shifts their weight, lost in thought', 'stares blankly into the middle distance'])}.`,
            `A flicker of ${randomChoice(character.personality.includes('ambitious') ? ['determination', 'calculation'] : ['boredom', 'weariness'])} crosses ${character.name}'s face.`
        ] : ['You feel a profound sense of solitude.'],
        environment: currentLocation ? [
            `${randomChoice(currentLocation.ambience_descriptors.includes('dark') ? ['Shadows cling to the corners of the room, deep and motionless.'] : ['A comfortable silence settles over the area.'])}`,
            `The ${randomChoice(currentLocation.ambience_descriptors.includes('cold') ? ['cold seems to seep in from the very stones.'] : ['air feels heavy and still.'])}`
        ] : ['The world holds its breath.'],
    };

    return proceduralGenerate(grammar, '#origin#');
};


/**
 * Advances the simulation by one "tick" using a simple, deterministic ruleset.
 */
export const localAdvanceSimulation = (
    currentWorldModel: WorldModel
): { narrative: string, updatedWorldState: WorldState } => {
    const worldModel = deepClone(currentWorldModel);
    const { world_state, settings, characters } = worldModel;
    const tickNarratives = [];
    
    // 1. Time Progression
    const timeParts = world_state.time.split(',');
    const dayMatch = timeParts[0].match(/\d+/);
    let day = dayMatch ? parseInt(dayMatch[0]) : 1;
    const originalDay = day;
    let timeOfDay = timeParts[1] ? timeParts[1].trim() : "Morning";
    
    const timeProgression = { "Morning": "Afternoon", "Afternoon": "Evening", "Evening": "Night" };
    
    if (timeOfDay in timeProgression) {
        timeOfDay = timeProgression[timeOfDay as keyof typeof timeProgression];
    } else {
        timeOfDay = "Morning";
        day += 1;
    }
    world_state.time = `Day ${day}, ${timeOfDay}`;
    
    if (day > originalDay) {
        tickNarratives.push(`A new day begins.`);
    }
    
    // 2. NPC Autonomous Actions (Roguelike AI)
    if (characters.length > 0 && settings.length > 1 && Math.random() > 0.5) {
        const charToMove = randomChoice(characters);
        const charLoc = world_state.character_locations.find(cl => cl.characterName === charToMove.name);
        
        if (charLoc) {
            const possibleDestinations = settings.filter(s => s.name !== charLoc.locationName);
            if (possibleDestinations.length > 0) {
                const newLocation = randomChoice(possibleDestinations).name;
                
                // If player is in the same location as the departing character
                if (charLoc.locationName === world_state.current_location) {
                    tickNarratives.push(`${charToMove.name} wanders off towards ${newLocation}.`);
                }
                
                charLoc.locationName = newLocation;

                // If player is in the destination location
                if (newLocation === world_state.current_location) {
                    tickNarratives.push(`${charToMove.name} has arrived.`);
                }
            }
        }
    }
    
    // 3. Generate descriptive narrative
    const descriptiveNarrative = generateTickNarrative(worldModel);
    if(descriptiveNarrative) {
        tickNarratives.push(descriptiveNarrative);
    }
    
    const narrative = tickNarratives.join(' ');

    return { narrative, updatedWorldState: world_state };
};

// --- OFFLINE ASCII ART EMULATION ---

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
  eerie: `
      .o@@@@@@o.
     .@@'    '@@.
    .@@'      '@@.
   .@@'        '@@.
  .@@'          '@@.
 .@@'            '@@.
.@@'              '@@.
'@@.              .@@'
 '@@.            .@@'
  '@@.          .@@'
   '@@.        .@@'
    '@@.      .@@'
     '@@.    .@@'
      'o@@@@@@o'
A sense of being watched...
  `,
  quiet: `
- - - - - - - - - - -
   .               .
       .      .
.            .      .
    .             .
.        .           .
- - -- - - - - - - - -
The silence is profound.
  `,
  ship: `
        __/___
  _____/______|
  \\ o o o o o /
   \\_________/
The gentle rock of the hull.
  `,
  library: `
 _______________________
|| o || o || o || o || o|
||---------------------||
|| o || o || o || o || o|
||---------------------||
|| o || o || o || o || o|
||_____________________||
Rows of silent knowledge.
  `,
  forest: `
      /\\      /\\
     /  \\    /  \\
    /____\\  /____\\
   /      \\/      \\
  /        \\       \\
 |          |       |
The rustle of leaves.
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
  castle: `
    |~|
 []_|_| []
 |[]_|_|[]|
 | |[]_|_|[]| |
 | | |[]_|_|[]| | |
A stone fortress looms.
  `,
  magic: `
      .
     -|-
. . .| | |. . .
     -|-
      '
   *       *
 *   *   *   *
*  *   *   *  *
 A crackle of energy.
  `,
  dark: `
____________________
|                  |
|  You see nothing.|
|                  |
|__________________|
 It is pitch black.
  `,
  cold: `
 *      *      *
   *      *      *
*      *      *
  *      *      *
A biting wind howls.
  `,
  ruins: `
    ,-'   \`.-.
  ,'         \`.
 /             \\
|               |
 \\ //   .-. \\ /
  | |  |   | | |
  | |  |   | | |
Ancient stones crumble.
  `,
  sea: `
~ ~ ~ ~ ~ ~ ~ ~ ~ ~
  ~ ~ ~ ~ ~ ~ ~ ~
~ ~ ~ ~ ~ ~ ~ ~ ~ ~
    ~ ~ ~ ~ ~ ~ ~
 The endless ocean.
  `,
};

/**
 * Selects a piece of thematic ASCII art based on the current world state.
 */
export const localGenerateAsciiArt = (worldModel: WorldModel, dynamicArt?: Record<string, string>): string => {
    const { world_state, settings } = worldModel;
    const currentLocation = settings.find(s => s.name === world_state.current_location);
    if (currentLocation) {
        const ambiance = currentLocation.ambience_descriptors.join(' ').toLowerCase();

        if (dynamicArt) {
            for (const key in dynamicArt) {
                if (ambiance.includes(key)) {
                    return dynamicArt[key];
                }
            }
        }
        
        for (const key in OFFLINE_ASCII_ART) {
            if (key !== 'default' && ambiance.includes(key)) {
                return OFFLINE_ASCII_ART[key];
            }
        }
        if (ambiance.includes('ocean') || ambiance.includes('water')) return OFFLINE_ASCII_ART['sea'];
    }
    return OFFLINE_ASCII_ART['default'];
};

/**
 * Creates a small, deterministic "mutation" to add flavor to the offline simulation.
 */
export const localRequestEvolution = (worldModel: WorldModel): ApiMutation | null => {
    if (Math.random() > 0.05) {
        return null;
    }

    const mutationType = randomChoice(['ADD_OBJECT', 'ENHANCE_NARRATIVE']);

    if (mutationType === 'ADD_OBJECT') {
        const potentialObjects: WorldObject[] = [
            { name: "A forgotten coin", properties: [{ key: 'material', value: 'tarnished brass' }] },
            { name: "A rusty key", properties: [{ key: 'feature', value: 'ornate handle' }] },
            { name: "A crumpled note", properties: [{ key: 'state', value: 'barely legible' }] },
            { name: "A single, white feather", properties: [{ key: 'origin', value: 'unknown bird'}] },
        ];
        const newObject = randomChoice(potentialObjects);
        
        if (worldModel.objects.some(o => o.name === newObject.name)) {
            return null;
        }

        return {
            type: 'ADD_OBJECT',
            payload: newObject,
            reason: 'The world shifts in subtle ways.'
        };
    } else {
        const potentialEnhancements = [
            'A floorboard creaks ominously in the distance.',
            'The scent of old paper and dust hangs heavy in the air.',
            'For a moment, the light seems to dim, and a chill runs down your spine.',
            'A faint, musical chime echoes from a place you cannot identify.',
        ];
        return {
            type: 'ENHANCE_NARRATIVE',
            payload: randomChoice(potentialEnhancements),
            reason: 'A detail sharpens into focus.'
        };
    }
};