

export type EngineMode = 'offline' | 'online';
export type GameMode = 'Narrative' | 'Open World';

export enum GameState {
  UPLOADING = 'UPLOADING',
  GENRE_SELECTION = 'GENRE_SELECTION',
  MODE_SELECTION = 'MODE_SELECTION',
  LOADING = 'LOADING',
  PROCESSING = 'PROCESSING',
  PLAYING = 'PLAYING',
  ERROR = 'ERROR',
}

export interface AdventureLogEntry {
  type: 'narrative' | 'command' | 'error' | 'simulation' | 'ascii';
  content: string;
}

// Based on the user's requested JSON output structure
// Fix: Export interface to be consumable by other modules.
export interface Provenance {
  file_id: string;
  segment_id: string;
  character_offsets: [number, number];
}

export interface Relationship {
    characterName: string;
    relationship: string;
}

// Fix: Export interface to be consumable by other modules.
export interface Character {
  name: string;
  aliases: string[];
  personality: string[];
  traits: string[];
  goals: string[];
  dialogue_style: string;
  relationships: Relationship[];
  provenance: Provenance;
}

// Fix: Export interface to be consumable by other modules.
export interface Setting {
  name: string;
  time_cues: string[];
  geography: string;
  culture: string;
  climate: string;
  ambience_descriptors: string[];
  provenance: Provenance;
}

export interface ObjectProperty {
    key: string;
    value: string;
}

/**
 * Represents a physical or conceptual object in the world.
 * To support puzzle mechanics, the 'properties' array can use standardized keys:
 * - 'is_container': "true" | "false"
 * - 'is_open': "true" | "false"
 * - 'is_locked': "true" | "false"
 * - 'key_id': A string that matches another object's 'item_id'
 * - 'item_id': A unique identifier for a specific item (like a key)
 */
export interface WorldObject {
    name: string;
    properties: ObjectProperty[];
}

export interface CharacterLocation {
    characterName: string;
    locationName: string;
}

/**
 * Defines the location of an object.
 * The 'locationName' can be a setting name OR the name of another WorldObject,
 * allowing for objects to be placed inside other objects (containers).
 */
export interface ObjectLocation {
    objectName: string;
    locationName: string;
}

export interface FactionInfluence {
    factionName: string;
    influence: number;
}

export interface EnvironmentState {
    weather: string; // e.g., "Clear", "Rainy", "Foggy"
    lighting: string; // e.g., "Dim Twilight", "Pitch Black"
}

export interface Objective {
    description: string;
    is_completed: boolean;
}

// Fix: Export interface to be consumable by other modules. This resolves the main error.
export interface WorldState {
  current_location: string;
  time: string; // e.g., "Day 1, Morning"
  mode: GameMode;
  objectives: Objective[];
  environment: EnvironmentState;
  player_inventory: string[];
  character_locations: CharacterLocation[];
  object_locations: ObjectLocation[];
  factional_influence: FactionInfluence[];
  initial_description: string;
}

export interface WorldModel {
  vocabulary: Record<string, any>;
  adaptive_vocabulary_log: any[];
  characters: Character[];
  archetypes: Record<string, string>;
  settings: Setting[];
  objects: WorldObject[];
  events: any[];
  relationships: Record<string, any>;
  knowledge_graph: { nodes: any[], edges: any[] };
  world_state: WorldState;
  culture: Record<string, any>;
  economy: Record<string, any>;
  conflicts: any[];
  scheduler_state: Record<string, any>;
  style_profile: Record<string, any>;
  citations: any[];
}

export interface SaveGame {
  worldModel: WorldModel;
  adventureLog: AdventureLogEntry[];
}

export interface ApiMutation {
  type: 'ADD_OBJECT' | 'ENHANCE_NARRATIVE';
  payload: WorldObject | string;
  reason: string;
}

export interface MutationLogEntry {
  id: string;
  timestamp: string;
  mutation: ApiMutation;
  status: 'applied' | 'reverted' | 'pending';
}

export interface AdventureGenre {
    title: string;
    description: string;
    narrative: string;
}

export interface OfflineResources {
  asciiArt: Record<string, string>;
}