import { GoogleGenAI, Type } from "@google/genai";
import { WorldModel, WorldState, AdventureLogEntry, Character } from '../types';
import { FULL_PROMPT_PIPELINE } from '../constants';

// Fix: Adhere to API key guidelines by removing placeholder and ensuring API_KEY is set.
if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set.");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const worldModelSchema = {
    type: Type.OBJECT,
    properties: {
        world_state: {
            type: Type.OBJECT,
            properties: {
                current_location: { type: Type.STRING },
                time: { type: Type.STRING },
                player_inventory: { type: Type.ARRAY, items: { type: Type.STRING } },
                character_locations: { type: Type.OBJECT },
                object_locations: { type: Type.OBJECT },
                factional_influence: { type: Type.OBJECT },
                initial_description: { type: Type.STRING, description: "A compelling, paragraph-long description of the starting scene for the player." }
            },
            required: ['current_location', 'time', 'player_inventory', 'initial_description']
        },
        characters: { type: Type.OBJECT },
        settings: { type: Type.OBJECT },
        objects: { type: Type.OBJECT },
        // Add other top-level keys as needed, keeping it minimal for performance
    },
    required: ['world_state', 'characters', 'settings']
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
             properties: worldModelSchema.properties.world_state.properties,
             required: worldModelSchema.properties.world_state.required,
        }
    },
    required: ['narrative', 'updatedWorldState']
};

export const processPlayerCommand = async (
    currentWorldState: WorldState,
    characters: Record<string, Character>,
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

    Based on the world state and the command, generate the next narrative description for the player.
    When generating dialogue or actions for characters, you MUST consider their specified personality, traits, and goals.
    Your response must be a JSON object with two keys: "narrative" (a string for the player) and "updatedWorldState" (the modified world state object after the command). The updatedWorldState must retain the same schema as the original. Be descriptive and engaging in your narrative.
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
    characters: Record<string, Character>,
    adventureLog: AdventureLogEntry[]
): Promise<{ narrative: string, updatedWorldState: WorldState }> => {

    const context = `
    You are the simulation engine for a multi-actor narrative simulation. Your role is to advance the world state by one discrete time-step ('tick').

    **Core Directives:**
    1.  **Character-Driven Action (Priority):** Your primary goal is to generate proactive, autonomous actions for the characters. Instead of just describing the environment, make a character *do* something based on their internal state.
        -   **Analyze Personality & Goals:** For each character, examine their \`personality\`, \`traits\`, and \`goals\`. A 'brave' character might confront a danger. A character with the goal "avenge my family" should take steps towards that, even if small.
        -   **Consider Relationships:** A character's action might be influenced by their relationship to others. An 'ally' might offer help, while a 'rival' might create an obstacle.
        -   **Create Narrative Progress:** The chosen action should move that character's personal story forward. The world should feel alive with independent agents pursuing their own agendas. For example, instead of "The wind howls," a better tick would be "Driven by a desire for ancient lore, Elara ventures into the library's forbidden section."

    2.  **Environmental Dynamics (Secondary):** If no character has a strong motivation to act in this tick, you may generate a small environmental event. This should be a logical change to the setting (e.g., the weather changes, a patrol passes by, an object falls).

    3.  **Causality & Consistency:** The event you generate must be a logical consequence of the current \`world_state\` and the story so far.

    4.  **Output Requirements:**
        -   **Narrative:** The narrative output must be a single, descriptive paragraph focusing on the most significant event of this tick.
        -   **State Update:** You MUST update the \`world_state\` JSON to reflect the outcome of the event. This includes time, locations, relationships, or inventories. The updatedWorldState must retain the same schema as the original.

    The current world state is: ${JSON.stringify(currentWorldState, null, 2)}
    The characters are: ${JSON.stringify(characters, null, 2)}
    The story so far:
    ${adventureLog.map(entry => `${entry.type === 'command' ? '> ' : ''}${entry.content}`).join('\n')}

    Now, advance the simulation by one tick. Your response must be a JSON object with two keys: "narrative" (a string to be shown to the player) and "updatedWorldState" (the modified world state object after the event).
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

    if (worldModel) {
        const { world_state, settings, archetypes } = worldModel;
        const currentLocationName = world_state.current_location;
        
        // 1. Get setting info for theme and atmosphere
        const setting = Object.values(settings).find(s => s.name === currentLocationName);
        if (setting) {
            // Use a Set to avoid duplicate keywords from culture, geography, and ambience
            const keywords = new Set<string>();
            
            setting.ambience_descriptors.forEach(desc => keywords.add(desc.toLowerCase()));
            keywords.add(setting.geography.toLowerCase());
            keywords.add(setting.culture.toLowerCase());
            
            if (keywords.size > 0) {
                themeKeywords = Array.from(keywords);
            }
            if (setting.ambience_descriptors.length > 0) {
                atmosphere = setting.ambience_descriptors.join(', ');
            }
        }
        
        // 2. Get archetypes of characters present for stylistic influence
        const charactersInLocation = Object.keys(world_state.character_locations).filter(
            charName => world_state.character_locations[charName] === currentLocationName
        );
        
        charactersInLocation.forEach(charName => {
            if (archetypes && archetypes[charName]) {
                archetypalInfluences.push(archetypes[charName]);
            }
        });
    }

    const prompt = `
You are the AdaptiveASCIIEngine from the Multiprose Engine framework. Your task is to generate dynamic ASCII art that visually represents the narrative and world state parameters.

**Core Directives:**
1.  **Synthesize Influences:** Create ASCII art by synthesizing the theme, atmosphere, and archetypal influences provided below. Do not just pick one; blend the concepts. For example, if the theme is 'cave' and an archetype is 'Mentor', the art could be a wise, glowing rune on a cave wall.
2.  **Match the Scene:** The art must visually represent the provided narrative scene.
3.  **Output Constraints:** The final output must be ONLY the raw ASCII art. Do not include any surrounding text, explanations, or markdown code fences like \`\`\`. The art must be suitable for a monospaced terminal display.

**Configuration for this frame:**
-   **Theme Keywords:** "${themeKeywords.join(', ')}" (Use these words to guide the core subject and style of the art.)
-   **Atmosphere:** "${atmosphere || 'neutral'}" (This should guide the mood of the art - e.g., 'eerie', 'serene', 'bustling'.)
-   **Archetypal Influences Present:** "${archetypalInfluences.length > 0 ? archetypalInfluences.join(', ') : 'None'}" (If present, let these roles subtly influence the art's character. A 'Hero' might suggest something bold or central. A 'Trickster' might suggest something chaotic or hidden.)
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
