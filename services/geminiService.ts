

import { GoogleGenAI, Type } from "@google/genai";
import { WorldModel, WorldState, AdventureLogEntry, Character } from '../types';
import { FULL_PROMPT_PIPELINE } from '../constants';

// Fix: Adhere to API key guidelines by removing placeholder and ensuring API_KEY is set.
if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set.");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Schemas for nested objects to satisfy API validation
const relationshipSchema = {
    type: Type.OBJECT,
    properties: {
        characterName: { type: Type.STRING },
        relationship: { type: Type.STRING },
    },
    required: ['characterName', 'relationship']
};

const characterSchema = {
    type: Type.OBJECT,
    properties: {
        name: { type: Type.STRING },
        aliases: { type: Type.ARRAY, items: { type: Type.STRING } },
        personality: { type: Type.ARRAY, items: { type: Type.STRING } },
        traits: { type: Type.ARRAY, items: { type: Type.STRING } },
        goals: { type: Type.ARRAY, items: { type: Type.STRING } },
        dialogue_style: { type: Type.STRING },
        relationships: { type: Type.ARRAY, items: relationshipSchema },
    },
    required: ['name', 'personality', 'goals', 'relationships']
};

const settingSchema = {
    type: Type.OBJECT,
    properties: {
        name: { type: Type.STRING },
        time_cues: { type: Type.ARRAY, items: { type: Type.STRING } },
        geography: { type: Type.STRING },
        culture: { type: Type.STRING },
        climate: { type: Type.STRING },
        ambience_descriptors: { type: Type.ARRAY, items: { type: Type.STRING } },
    },
    required: ['name', 'ambience_descriptors']
};

const objectPropertySchema = {
    type: Type.OBJECT,
    properties: {
        key: { type: Type.STRING },
        value: { type: Type.STRING },
    },
    required: ['key', 'value']
};

const objectSchema = {
    type: Type.OBJECT,
    properties: {
        name: { type: Type.STRING },
        properties: { type: Type.ARRAY, items: objectPropertySchema },
    },
    required: ['name', 'properties']
};

const worldStateProperties = {
    current_location: { type: Type.STRING },
    time: { type: Type.STRING },
    environment: {
        type: Type.OBJECT,
        properties: {
            weather: { type: Type.STRING },
            lighting: { type: Type.STRING },
        },
        required: ['weather', 'lighting']
    },
    player_inventory: { type: Type.ARRAY, items: { type: Type.STRING } },
    character_locations: {
        type: Type.ARRAY,
        items: {
            type: Type.OBJECT,
            properties: {
                characterName: { type: Type.STRING },
                locationName: { type: Type.STRING },
            },
            required: ["characterName", "locationName"],
        }
    },
    object_locations: {
        type: Type.ARRAY,
        items: {
            type: Type.OBJECT,
            properties: {
                objectName: { type: Type.STRING },
                locationName: { type: Type.STRING },
            },
            required: ["objectName", "locationName"],
        }
    },
    factional_influence: {
        type: Type.ARRAY,
        items: {
            type: Type.OBJECT,
            properties: {
                factionName: { type: Type.STRING },
                influence: { type: Type.NUMBER },
            },
            required: ["factionName", "influence"],
        }
    },
    initial_description: { type: Type.STRING, description: "A compelling, paragraph-long description of the starting scene for the player." }
};

const worldStateRequired = ['current_location', 'time', 'environment', 'player_inventory', 'character_locations', 'object_locations', 'factional_influence', 'initial_description'];


const worldModelSchema = {
    type: Type.OBJECT,
    properties: {
        world_state: {
            type: Type.OBJECT,
            properties: worldStateProperties,
            required: worldStateRequired
        },
        characters: { type: Type.ARRAY, items: characterSchema },
        settings: { type: Type.ARRAY, items: settingSchema },
        objects: { type: Type.ARRAY, items: objectSchema },
        // Add other top-level keys as needed, keeping it minimal for performance
    },
    required: ['world_state', 'characters', 'settings', 'objects']
};


export const generateWorldModel = async (narrativeText: string): Promise<WorldModel> => {
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: `Here is the input text:\n\n---\n\n${narrativeText}\n\n---\n\nPlease process this text and generate the world model.`,
        config: {
            systemInstruction: FULL_PROMPT_PIPELINE,
            responseMimeType: "application/json",
            responseSchema: worldModelSchema,
        },
    });

    try {
        const jsonText = response.text.trim();
        const parsedJson = JSON.parse(jsonText);
        return parsedJson as WorldModel;
    } catch (e) {
        console.error("Failed to parse JSON response from Gemini:", response.text);
        throw new Error("Received invalid JSON from the simulation engine.");
    }
};

const commandResponseSchema = {
    type: Type.OBJECT,
    properties: {
        narrative: { type: Type.STRING },
        updatedWorldState: {
            type: Type.OBJECT,
             properties: worldStateProperties,
             required: worldStateRequired,
        }
    },
    required: ['narrative', 'updatedWorldState']
};

export const processPlayerCommand = async (
    currentWorldState: WorldState,
    characters: Character[],
    adventureLog: AdventureLogEntry[],
    command: string
): Promise<{ narrative: string, updatedWorldState: WorldState }> => {

    const context = `
    You are a deterministic text-adventure simulation engine.
    The current world state is: ${JSON.stringify(currentWorldState)}
    The characters in this world are: ${JSON.stringify(characters)}
    The story so far:
    ${adventureLog.map(entry => `${entry.type === 'command' ? '> ' : ''}${entry.content}`).join('\n')}
    
    The player now enters the command: "${command}"

    Based on the world state and command, generate a single, impactful sentence describing the outcome for the player.
    When generating dialogue or actions for characters, you MUST consider their specified personality, traits, and goals.
    Your response must be a JSON object with two keys: "narrative" (a single sentence for the player) and "updatedWorldState" (the modified world state object after the command). The updatedWorldState must retain the same schema as the original.
    `;

    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: context,
        config: {
            responseMimeType: "application/json",
            responseSchema: commandResponseSchema,
        },
    });

    try {
        const jsonText = response.text.trim();
        return JSON.parse(jsonText);
    } catch (e) {
        console.error("Failed to parse JSON command response:", response.text);
        throw new Error("Received invalid JSON from the simulation engine during command processing.");
    }
};

export const advanceSimulation = async (
    currentWorldState: WorldState,
    characters: Character[],
    adventureLog: AdventureLogEntry[]
): Promise<{ narrative: string, updatedWorldState: WorldState }> => {

    const context = `
    You are the simulation engine for a multi-actor narrative simulation. Your role is to advance the world state by one discrete time-step ('tick').

    **Core Directives:**
    1.  **Character-Driven Action (Priority):** Your primary goal is to generate proactive, autonomous actions for the characters. Instead of just describing the environment, make a character *do* something based on their internal state.
        -   **Analyze Personality & Goals:** For each character, examine their \`personality\`, \`traits\`, and especially their \`goals\`. A character with the goal "avenge my family" MUST take steps towards that, even if small. A 'curious' character might investigate something. Their action should be a direct consequence of their stated ambitions.
        -   **Create Narrative Progress:** The chosen action should move that character's personal story forward. The world should feel alive with independent agents pursuing their own agendas. For example, instead of "The wind howls," a better tick would be "Driven by his goal to find the Sunstone, Arion consults the ancient map he carries."

    2.  **Environmental Dynamics (Secondary):** If no character has a strong motivation to act in this tick, you may generate a small environmental event. This should be a logical change to the setting's 'environment' object (e.g., weather changes from 'Sunny' to 'Cloudy', lighting changes from 'Daylight' to 'Twilight').

    3.  **Causality & Consistency:** The event you generate must be a logical consequence of the current \`world_state\` and the story so far.

    4.  **Output Requirements:**
        -   **Narrative:** The narrative output must be a single, impactful sentence describing the most significant event of this tick.
        -   **State Update:** You MUST update the \`world_state\` JSON to reflect the outcome of the event. This includes time, locations, relationships, inventories, or the environment. The updatedWorldState must retain the same schema as the original.

    The current world state is: ${JSON.stringify(currentWorldState, null, 2)}
    The characters are: ${JSON.stringify(characters, null, 2)}
    The story so far:
    ${adventureLog.map(entry => `${entry.type === 'command' ? '> ' : ''}${entry.content}`).join('\n')}

    Now, advance the simulation by one tick. Your response must be a JSON object with two keys: "narrative" (a single sentence to be shown to the player) and "updatedWorldState" (the modified world state object after the event).
    `;

    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: context,
        config: {
            responseMimeType: "application/json",
            responseSchema: commandResponseSchema,
        },
    });

    try {
        const jsonText = response.text.trim();
        return JSON.parse(jsonText);
    } catch (e) {
        console.error("Failed to parse JSON simulation response:", response.text);
        throw new Error("Received invalid JSON from the simulation engine during simulation processing.");
    }
};

export const generateAsciiArt = async (description: string, worldModel: WorldModel | null): Promise<string> => {
    // Default values
    let themeKeywords = ['abstract', 'mysterious'];
    let atmosphere = 'mysterious';
    let archetypalInfluences: string[] = [];
    let objectsPresentDetails: string[] = [];
    let charactersPresentDetails: string[] = [];

    if (worldModel) {
        const { world_state, settings, archetypes, characters, objects } = worldModel;
        const currentLocationName = world_state.current_location;
        
        // 1. Get setting info for theme and atmosphere
        const setting = settings.find(s => s.name === currentLocationName);
        if (setting) {
            const keywords = new Set<string>();
            
            setting.ambience_descriptors.forEach(desc => keywords.add(desc.toLowerCase()));
            keywords.add(setting.geography.toLowerCase());
            if (setting.culture) keywords.add(setting.culture.toLowerCase());
            
            if (keywords.size > 0) {
                themeKeywords = Array.from(keywords);
            }
            if (setting.ambience_descriptors.length > 0) {
                atmosphere = setting.ambience_descriptors.join(', ');
            }
        }
        
        // 2. Get full character objects for characters in the current location
        const charactersInLocation = characters.filter(
            char => world_state.character_locations.some(
                loc => loc.characterName === char.name && loc.locationName === currentLocationName
            )
        );

        // 3. Extract character details (archetypes, personality)
        charactersInLocation.forEach(char => {
            if (archetypes && archetypes[char.name]) {
                archetypalInfluences.push(archetypes[char.name]);
            }
            const personalitySnippet = char.personality.slice(0, 2).join(', ');
            charactersPresentDetails.push(`${char.name} (${personalitySnippet})`);
        });

        // 4. Get full object details for objects in the current location
        const objectNamesInLocation = world_state.object_locations
            .filter(loc => loc.locationName === currentLocationName)
            .map(loc => loc.objectName);
        
        const objectsInLocation = objects.filter(obj => objectNamesInLocation.includes(obj.name));

        objectsInLocation.forEach(obj => {
            const propertiesSnippet = obj.properties
                .slice(0, 2)
                .map(p => p.value)
                .join(', ');
            objectsPresentDetails.push(`${obj.name}${propertiesSnippet ? ` (${propertiesSnippet})` : ''}`);
        });
    }

    const prompt = `
You are the AdaptiveASCIIEngine from the Multiprose Engine framework. Your task is to generate dynamic ASCII art that visually represents the narrative and world state parameters.

**Core Directives:**
1.  **Synthesize Influences:** Create ASCII art by synthesizing all the provided context. Blend the concepts. For example, if the theme is 'library', a character is 'curious', and an object is a 'glowing book', the art should depict a character leaning over a radiant tome amidst towering bookshelves.
2.  **Incorporate Specifics:** The art must visually represent the provided narrative scene. You must incorporate the specific characters and objects listed below into the scene. Their unique traits and properties should influence the art's style and content. A 'stoic' character might be drawn with straight, rigid lines, while a 'chaotic' one might have more abstract, swirling patterns.
3.  **Dynamic Glyphs:** To give the scene a sense of life and subtle motion, strategically place simple Unicode glyphs (like '░', '▒', '▓', '※', '⁂', '✧') or flickering characters to represent energy, magic, wind, rain, or other dynamic effects. This should create the illusion of a 'static animation' where the scene feels alive even in a single frame.
4.  **Output Constraints:** The final output must be ONLY the raw ASCII art. Do not include any surrounding text, explanations, or markdown code fences like \`\`\`. The art must be suitable for a monospaced terminal display.

**Configuration for this frame:**
-   **Theme Keywords:** "${themeKeywords.join(', ')}" (Use these words to guide the core subject and style of the art.)
-   **Atmosphere:** "${atmosphere || 'neutral'}" (This should guide the mood of the art - e.g., 'eerie', 'serene', 'bustling'.)
-   **Archetypal Influences:** "${archetypalInfluences.length > 0 ? archetypalInfluences.join(', ') : 'None'}" (Let these roles subtly influence the art's character. A 'Hero' might suggest something bold or central.)
-   **Characters Present:** "${charactersPresentDetails.length > 0 ? charactersPresentDetails.join(', ') : 'None'}" (Reflect the personality and state of these characters in the scene's composition and mood.)
-   **Objects Present:** "${objectsPresentDetails.length > 0 ? objectsPresentDetails.join(', ') : 'None'}" (Visually include these objects in the generated art.)
-   **Narrative Context / Scene:** "${description}"

Generate the ASCII art now.
`;
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
        });
        
        // Clean up the response to remove potential markdown fences if the model adds them despite instructions.
        const art = response.text.trim();
        return art.replace(/```/g, '');

    } catch (e) {
        console.error("Failed to generate ASCII art:", e);
        // Return a placeholder on error
        return "[ASCII art generation failed]";
    }
};