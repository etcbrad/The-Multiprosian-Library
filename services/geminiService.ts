
import { GoogleGenAI, Type } from "@google/genai";
import { WorldModel, AdventureLogEntry, ApiMutation } from '../types';
import { FULL_PROMPT_PIPELINE, EVOLUTION_PROMPT_PIPELINE } from '../constants';

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

const apiMutationSchema = {
    type: Type.OBJECT,
    properties: {
        type: { type: Type.STRING, enum: ['ADD_OBJECT', 'ENHANCE_NARRATIVE'] },
        payload: {
            oneOf: [
                { type: Type.STRING },
                objectSchema
            ]
        },
        reason: { type: Type.STRING }
    },
    required: ['type', 'payload', 'reason']
};


export const requestEvolution = async (
    worldModel: WorldModel,
    adventureLog: AdventureLogEntry[],
    lastAction: string
): Promise<ApiMutation | null> => {
    
    const context = `
    This is the current state of the world:
    ${JSON.stringify(worldModel.world_state, null, 2)}

    These are the objects that currently exist in the world:
    ${JSON.stringify(worldModel.objects.map(o => o.name), null, 2)}

    Here is the recent adventure log:
    ${adventureLog.slice(-10).map(entry => `${entry.type === 'command' ? '> ' : ''}${entry.content}`).join('\n')}

    The last action taken was: "${lastAction}"

    Please suggest a single evolution based on this context.
    `;

    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: context,
        config: {
            systemInstruction: EVOLUTION_PROMPT_PIPELINE,
            responseMimeType: "application/json",
            responseSchema: apiMutationSchema,
        },
    });

    try {
        const jsonText = response.text.trim();
        if (jsonText === '{}' || jsonText === '') {
            return null;
        }
        const parsed = JSON.parse(jsonText);
        // Basic validation
        if (parsed.type && parsed.payload && parsed.reason) {
            return parsed as ApiMutation;
        }
        return null;
    } catch (e) {
        console.error("Failed to parse JSON evolution response:", response.text);
        return null;
    }
};


export const generateAsciiArt = async (description: string, worldModel: WorldModel | null): Promise<string> => {
    let themeKeywords = ['abstract', 'mysterious'];
    let atmosphere = 'mysterious';
    let archetypalInfluences: string[] = [];
    let objectsPresentDetails: string[] = [];
    let charactersPresentDetails: string[] = [];

    if (worldModel) {
        const { world_state, settings, archetypes, characters, objects } = worldModel;
        const currentLocationName = world_state.current_location;
        
        const setting = settings.find(s => s.name === currentLocationName);
        if (setting) {
            const keywords = new Set<string>();
            setting.ambience_descriptors.forEach(desc => keywords.add(desc.toLowerCase()));
            keywords.add(setting.geography.toLowerCase());
            if (setting.culture) keywords.add(setting.culture.toLowerCase());
            if (keywords.size > 0) themeKeywords = Array.from(keywords);
            if (setting.ambience_descriptors.length > 0) atmosphere = setting.ambience_descriptors.join(', ');
        }
        
        const charactersInLocation = characters.filter(
            char => world_state.character_locations.some(
                loc => loc.characterName === char.name && loc.locationName === currentLocationName
            )
        );

        charactersInLocation.forEach(char => {
            if (archetypes && archetypes[char.name]) {
                archetypalInfluences.push(archetypes[char.name]);
            }
            const personalitySnippet = char.personality.slice(0, 2).join(', ');
            charactersPresentDetails.push(`${char.name} (${personalitySnippet})`);
        });

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
You are the AdaptiveASCIIEngine. Your task is to generate dynamic ASCII art that visually represents a narrative scene.

**Core Directives:**
1.  **Synthesize Influences:** Create ASCII art by synthesizing all the provided context. Blend the concepts. For example, if the theme is 'library', a character is 'curious', and an object is a 'glowing book', the art should depict a character leaning over a radiant tome amidst towering bookshelves.
2.  **Incorporate Specifics:** The art must visually represent the provided narrative scene. You must incorporate the specific characters and objects listed into the scene.
3.  **Dynamic Glyphs:** Strategically place simple Unicode glyphs (like '░', '▒', '▓', '※', '⁂', '✧') to represent energy, magic, or other dynamic effects, creating the illusion of a 'static animation'.
4.  **Output Constraints:** The final output must be ONLY the raw ASCII art inside a single block. Do not include any surrounding text, explanations, or markdown code fences like \`\`\`.

**Configuration for this frame:**
-   **Theme Keywords:** "${themeKeywords.join(', ')}"
-   **Atmosphere:** "${atmosphere || 'neutral'}"
-   **Archetypal Influences:** "${archetypalInfluences.length > 0 ? archetypalInfluences.join(', ') : 'None'}"
-   **Characters Present:** "${charactersPresentDetails.length > 0 ? charactersPresentDetails.join(', ') : 'None'}"
-   **Objects Present:** "${objectsPresentDetails.length > 0 ? objectsPresentDetails.join(', ') : 'None'}"
-   **Narrative Context / Scene:** "${description}"

Generate the ASCII art now.
`;
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
        });
        
        const art = response.text.trim();
        return art.replace(/```/g, '');

    } catch (e) {
        console.error("Failed to generate ASCII art:", e);
        return "[ASCII art generation failed]";
    }
};

export const requestOfflineResource = async (worldModel: WorldModel): Promise<{ keyword: string, ascii: string } | null> => {
    const { world_state, settings } = worldModel;
    const currentLocation = settings.find(s => s.name === world_state.current_location);

    if (!currentLocation) return null;
    
    const systemInstruction = `
You are the "Aesthete Engine," a subroutine that generates creative assets for an offline simulation engine. Your task is to create a new piece of thematic ASCII art that can be stored and used when the main AI is not available.

**Directives:**
1.  **Analyze Context:** Analyze the provided world state, specifically the current location's theme and ambiance.
2.  **Identify Keyword:** From the theme, select a single, potent, lowercase keyword that captures the essence of the location (e.g., 'cave', 'forest', 'library', 'eerie').
3.  **Generate Art:** Create a multi-line ASCII art representation for this keyword. The art should be evocative and fit within a classic terminal aesthetic.
4.  **JSON Output:** Your entire response MUST be a single, valid JSON object with two keys: "keyword" and "ascii". Do not add markdown fences.
`;

    const context = `
**Context:**
-   **Current Location:** ${currentLocation.name}
-   **Ambiance:** ${currentLocation.ambience_descriptors.join(', ')}
`;

    const resourceSchema = {
        type: Type.OBJECT,
        properties: {
            keyword: { type: Type.STRING, description: "A single lowercase keyword for the theme." },
            ascii: { type: Type.STRING, description: "The multi-line ASCII art." }
        },
        required: ['keyword', 'ascii']
    };

     try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: context,
            config: {
                systemInstruction: systemInstruction,
                responseMimeType: "application/json",
                responseSchema: resourceSchema,
            },
        });
        const jsonText = response.text.trim();
        return JSON.parse(jsonText);
    } catch (e) {
        console.error("Failed to parse JSON for offline resource:", e);
        return null;
    }
}
