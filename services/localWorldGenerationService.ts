import { AdventureGenre, WorldModel, Character, Setting, WorldObject, WorldState, GameMode, Objective } from '../types';

// Heuristics for parsing adventure narratives locally.

const findCharacters = (text: string): Character[] => {
    const characters: Character[] = [];
    const existingNames = new Set<string>();
    
    // Regex for capitalized names (one or two words)
    const nameRegex = /\b([A-Z][a-z]+(?: [A-Z][a-z]+)?)\b/g;
    let match;
    while ((match = nameRegex.exec(text)) !== null) {
        const name = match[1];
        // Filter out common capitalized words at the start of sentences and titles
        if (!['Chapter', 'Letter', 'November'].includes(name) && name.length > 2) {
             if (!existingNames.has(name)) {
                const personality: string[] = [];
                // Look for personality traits nearby
                const contextRegex = new RegExp(`(?:${name}, )([a-z]+ and [a-z]+)`);
                const personalityMatch = text.match(contextRegex);
                if(personalityMatch) {
                    personality.push(...personalityMatch[1].split(' and '));
                }

                characters.push({
                    name, aliases: [], personality, traits: [], goals: [], dialogue_style: "", relationships: [],
                    provenance: { file_id: "local", segment_id: "1", character_offsets: [0,0] }
                });
                existingNames.add(name);
             }
        }
    }

    // Manual/specific additions for nuanced cases
    if (text.includes("Call me Ishmael")) {
        if (!existingNames.has("Ishmael")) {
            characters.push({ name: "Ishmael", aliases: [], personality: ["melancholic", "philosophical"], traits: [], goals: ["go to sea"], dialogue_style: "eloquent", relationships: [], provenance: { file_id: "local", segment_id: "1", character_offsets: [0,0] }});
            existingNames.add("Ishmael");
        }
    }
     if (text.includes("White Rabbit")) {
         if (!existingNames.has("The White Rabbit")) {
             characters.push({ name: "The White Rabbit", aliases: ["White Rabbit"], personality: ["hurried", "anxious"], traits: ["has pink eyes"], goals: ["not be late"], dialogue_style: "rushed", relationships: [], provenance: { file_id: "local", segment_id: "1", character_offsets: [0,0] } });
             existingNames.add("The White Rabbit");
         }
    }
     if (text.includes("the creature open")) {
        // The narrator is the character.
         if (!existingNames.has("The Scientist")) {
             characters.push({ name: "The Scientist", aliases: ["creator"], personality: ["ambitious", "anxious", "toiling"], traits: ["scientific"], goals: ["infuse a spark of being"], dialogue_style: "formal", relationships: [], provenance: { file_id: "local", segment_id: "1", character_offsets: [0,0] }});
             existingNames.add("The Scientist");
         }
         if (!existingNames.has("The Creature")) {
             characters.push({ name: "The Creature", aliases: [], personality: ["nascent"], traits: ["dull yellow eye"], goals: ["to be"], dialogue_style: "non-verbal", relationships: [], provenance: { file_id: "local", segment_id: "1", character_offsets: [0,0] }});
             existingNames.add("The Creature");
         }
    }


    return characters;
};

const findSettings = (text: string): Setting[] => {
    const settings: Setting[] = [];
    const addedSettings = new Set<string>();

    const settingKeywords: { [key: string]: { name: string, ambiance: string[] } } = {
        'shore': { name: "The Shore", ambiance: ["damp", "drizzly", "sea", "melancholy"] },
        'sea': { name: "The Sea", ambiance: ["vast", "watery", "salty"] },
        'ocean': { name: "The Ocean", ambiance: ["vast", "deep", "mysterious"] },
        'dreary night of november': { name: "The Laboratory", ambiance: ["dreary", "dark", "rainy", "gothic"] },
        'bank': { name: "The Riverbank", ambiance: ["hot", "sleepy", "pastoral", "quiet"] },
        'rabbit-hole': { name: "The Rabbit-Hole", ambiance: ["dark", "mysterious", "deep", "cave"] },
        'tower': { name: "The Tower", ambiance: ["stately", "stone", "morning"] },
        'stairhead': { name: "The Stairhead", ambiance: ["dark", "winding", "stone"] },
        'gunrest': { name: "The Gunrest", ambiance: ["round", "open-air", "windy"] },
        'alchemist\'s study': { name: "The Alchemist's Study", ambiance: ["cluttered", "dusty", "mysterious"] },
    };

    for(const keyword in settingKeywords) {
        if (text.toLowerCase().includes(keyword)) {
            const setting = settingKeywords[keyword];
            if (!addedSettings.has(setting.name)) {
                settings.push({
                    name: setting.name, time_cues: [], geography: "Vague", culture: "Unknown", climate: "Temperate", ambience_descriptors: setting.ambiance,
                    provenance: { file_id: "local", segment_id: "1", character_offsets: [0,0] }
                });
                addedSettings.add(setting.name);
            }
        }
    }
    
    // Fallback setting
    if (settings.length === 0) {
        settings.push({ name: "An Unknown Place", time_cues: [], geography: "Vague", culture: "None", climate: "Temperate", ambience_descriptors: ["mysterious"], provenance: { file_id: "local", segment_id: "1", character_offsets: [0,0] } });
    }
    return settings;
};

const findObjects = (text: string, genreTitle: string): WorldObject[] => {
    const objects: WorldObject[] = [];
    const objectPatterns: { [key: string]: { name: string, props: {key: string, value: string}[]} } = {
        "a watch out of its waistcoat-pocket": { name: "Waistcoat-Pocket Watch", props: [{ key: "function", value: "tells time"}] },
        "instruments of life": { name: "Instruments of Life", props: [{ key: "feature", value: "scientific contraptions"}] },
        "bowl of lather": { name: "Bowl of Lather", props: [
            {key: "state", value: "full"},
            {key: "on_use_razor", value: "You work the lather into a rich foam and get a remarkably close shave. You feel refreshed."}
        ]},
        "a mirror": { name: "A Mirror", props: [{key: "feature", value: "reflects"}]},
        "a razor": { name: "A Razor", props: [
            {key: "feature", value: "sharp"},
            {key: "item_id", value: "razor"},
            {key: "on_use_on_hard", value: "You scrape the razor against the hard surface of the {target_name}. The delicate blade chips and breaks, rendering it useless. You lament your poor decision."},
            {key: "on_break_destroy", value: "true"}
        ]},
    };
    
    for(const pattern in objectPatterns) {
        if (text.toLowerCase().includes(pattern)) {
            const obj = objectPatterns[pattern];
            objects.push({ name: obj.name, properties: obj.props });
        }
    }

    if (text.toLowerCase().includes("gunrest")) { // Heuristic for Telemachus
        objects.push({
            name: "A smooth grey stone",
            properties: [
                { key: "feature", value: "worn by the sea" },
                { key: "surface", value: "hard" }
            ]
        });
    }

    if (genreTitle === "The Alchemist's Study") {
        objects.push({ name: "Iron-bound Chest", properties: [
            { key: 'is_container', value: 'true' },
            { key: 'is_locked', value: 'true' },
            { key: 'is_open', value: 'false' },
            { key: 'key_id', value: 'silver_key_01' },
            { key: 'surface', value: 'hard' }
        ]});
         objects.push({ name: "Leather-bound Book", properties: [
            { key: 'has_been_read', value: 'false' },
            { key: 'on_read_effect', value: 'reveals_key' },
            { key: 'content_unread', value: 'You read the cryptic diagrams. Tucked between the pages, you find a small silver key that falls to the floor.'},
            { key: 'content_read', value: 'The pages are filled with cryptic diagrams you have already studied.'},
        ]});
        objects.push({ name: "Silver Key", properties: [
            { key: 'item_id', value: 'silver_key_01' }
        ]});
        objects.push({ name: "Golden Goblet", properties: [
            { key: 'material', value: 'gold'},
            { key: 'feature', value: 'exquisitely crafted'}
        ]});
    }

    if (genreTitle === "Down the Rabbit-Hole") {
        objects.push({
            name: "Small Cake",
            properties: [
                { key: "is_edible", value: "true" },
                { key: "feature", value: "Decorated with the words 'EAT ME' in currants." },
                { key: "effect", value: "You suddenly feel yourself growing much larger!" }
            ]
        });
    }

    return objects;
}

const getInitialDescription = (text: string): string => {
    const paragraphs = text.split(/\n\s*\n/);
    // Find the first meaningful paragraph (often after a title)
    return paragraphs.find(p => p.length > 100 && !p.startsWith("CHAPTER") && !p.startsWith("Letter")) || paragraphs.find(p => p.trim().length > 0) || "Your adventure begins.";
}


/**
 * Constructs a WorldModel from a given adventure narrative using local, rule-based logic.
 * @param genre The adventure genre containing the narrative text.
 * @param mode The selected game mode which determines if objectives are created.
 * @returns A complete WorldModel for starting the simulation.
 */
export const generateLocalWorldModel = (genre: AdventureGenre, mode: GameMode): WorldModel => {
    const { narrative, title } = genre;
    
    const characters = findCharacters(narrative);
    const settings = findSettings(narrative);
    const objects = findObjects(narrative, title);
    
    const initialLocation = settings[0]?.name || "The Void";

    let object_locations = objects.map(o => ({ objectName: o.name, locationName: initialLocation }));
    
    // Custom logic for The Alchemist's Study puzzle setup
    if (title === "The Alchemist's Study") {
        // Hide the key by default; it's revealed by reading the book.
        object_locations = object_locations.filter(ol => ol.objectName !== "Silver Key");
        // Put the goblet in the chest
        const gobletLoc = object_locations.find(ol => ol.objectName === "Golden Goblet");
        if (gobletLoc) gobletLoc.locationName = "Iron-bound Chest";
    }

    // Custom logic for placing adventure-specific objects
    if (title === "Down the Rabbit-Hole") {
        const cakeLocation = object_locations.find(ol => ol.objectName === "Small Cake");
        if (cakeLocation) {
            cakeLocation.locationName = "The Rabbit-Hole";
        }
    }

    const objectives: Objective[] = [];
    if (mode === 'Narrative') {
        switch(title) {
            case "The Alchemist's Study":
                objectives.push({ description: "Find a way to escape the study.", is_completed: false });
                break;
            case "Down the Rabbit-Hole":
                objectives.push({ description: "Follow the White Rabbit.", is_completed: false });
                break;
            case "Loomings":
                objectives.push({ description: "Find a ship and get to sea.", is_completed: false });
                break;
            case "Prometheus Unbound":
                 objectives.push({ description: "Confront the consequences of your creation.", is_completed: false });
                 break;
        }
    }


    const world_state: WorldState = {
        current_location: initialLocation,
        time: "Day 1, Morning",
        mode,
        objectives,
        environment: { weather: "Clear", lighting: "Bright" },
        player_inventory: [],
        character_locations: characters.map(c => ({ characterName: c.name, locationName: initialLocation })),
        object_locations: object_locations,
        factional_influence: [],
        initial_description: getInitialDescription(narrative),
    };
    
    if (settings[0]) {
        const ambiance = settings[0].ambience_descriptors.join(' ').toLowerCase();
        if (ambiance.includes('drizzly') || ambiance.includes('rain')) world_state.environment.weather = 'Drizzly';
        if (ambiance.includes('cold') || ambiance.includes('icy')) world_state.environment.weather = 'Cold';
        if (ambiance.includes('hot')) world_state.environment.weather = 'Hot';
        if (ambiance.includes('dark') || ambiance.includes('evening') || ambiance.includes('twilight')) world_state.environment.lighting = 'Dim Twilight';
        if (ambiance.includes('morning')) world_state.time = 'Day 1, Morning';
        if (ambiance.includes('november')) world_state.time = 'Day 1, Dreary Afternoon';
    }

    const model: WorldModel = {
        vocabulary: {},
        adaptive_vocabulary_log: [],
        characters,
        archetypes: {},
        settings,
        objects,
        events: [],
        relationships: {},
        knowledge_graph: { nodes: [], edges: [] },
        world_state,
        culture: {},
        economy: {},
        conflicts: [],
        scheduler_state: {},
        style_profile: {},
        citations: [],
    };

    return model;
};