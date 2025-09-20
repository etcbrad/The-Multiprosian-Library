import { AdventureGenre, WorldModel, Character, Setting, WorldObject, WorldState } from '../types';

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
        if (!['Chapter', 'Letter'].includes(name) && name.length > 2) {
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
     if (text.includes("Mrs. Saville")) {
        // The narrator is the character.
         if (!existingNames.has("The Scientist")) {
             characters.push({ name: "The Scientist", aliases: ["Walton"], personality: ["ambitious", "confident"], traits: ["scientific"], goals: ["reach the North Pole"], dialogue_style: "formal", relationships: [], provenance: { file_id: "local", segment_id: "1", character_offsets: [0,0] }});
             existingNames.add("The Scientist");
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
        'Petersburgh': { name: "St. Petersburgh Street", ambiance: ["cold", "northern", "icy", "urban"] },
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
        "a letter to Mrs. Saville": { name: "A Letter to Mrs. Saville", props: [{ key: "content", value: "Details of an enterprise"}] },
        "bowl of lather": { name: "Bowl of Lather", props: [{key: "state", value: "full"}]},
        "a mirror": { name: "A Mirror", props: [{key: "feature", value: "reflects"}]},
        "a razor": { name: "A Razor", props: [{key: "feature", value: "sharp"}]},
    };
    
    for(const pattern in objectPatterns) {
        if (text.toLowerCase().includes(pattern)) {
            const obj = objectPatterns[pattern];
            objects.push({ name: obj.name, properties: obj.props });
        }
    }

    if (genreTitle === "The Alchemist's Study") {
        objects.push({ name: "Iron-bound Chest", properties: [
            { key: 'is_container', value: 'true' },
            { key: 'is_locked', value: 'true' },
            { key: 'is_open', value: 'false' },
            { key: 'key_id', value: 'silver_key_01' }
        ]});
         objects.push({ name: "Leather-bound Book", properties: [
            { key: 'content', value: 'The pages are filled with cryptic diagrams. Tucked inside is a small silver key.'}
        ]});
        objects.push({ name: "Silver Key", properties: [
            { key: 'item_id', value: 'silver_key_01' }
        ]});
        objects.push({ name: "Golden Goblet", properties: [
            { key: 'material', value: 'gold'},
            { key: 'feature', value: 'exquisitely crafted'}
        ]});
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
 * @returns A complete WorldModel for starting the simulation.
 */
export const generateLocalWorldModel = (genre: AdventureGenre): WorldModel => {
    const { narrative, title } = genre;
    
    const characters = findCharacters(narrative);
    const settings = findSettings(narrative);
    const objects = findObjects(narrative, title);
    
    const initialLocation = settings[0]?.name || "The Void";

    let object_locations = objects.map(o => ({ objectName: o.name, locationName: initialLocation }));
    
    // Custom logic for The Alchemist's Study puzzle setup
    if (title === "The Alchemist's Study") {
        // Hide the key in the book by default
        object_locations = object_locations.filter(ol => ol.objectName !== "Silver Key");
        // Put the goblet in the chest
        const gobletLoc = object_locations.find(ol => ol.objectName === "Golden Goblet");
        if (gobletLoc) gobletLoc.locationName = "Iron-bound Chest";
    }


    const world_state: WorldState = {
        current_location: initialLocation,
        time: "Day 1, Morning",
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