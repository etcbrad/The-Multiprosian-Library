
export enum GameState {
  UPLOADING = 'UPLOADING',
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

// Fix: Export interface to be consumable by other modules.
export interface Character {
  name: string;
  aliases: string[];
  personality: string[];
  traits: string[];
  goals: string[];
  dialogue_style: string;
  relationships: Record<string, string>; // e.g. { "CharacterID": "ally" }
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

// Fix: Export interface to be consumable by other modules. This resolves the main error.
export interface WorldState {
  current_location: string;
  time: string; // e.g., "Day 1, Morning"
  player_inventory: string[];
  character_locations: Record<string, string>; // { "CharacterID": "LocationID" }
  object_locations: Record<string, string>; // { "ObjectID": "LocationID" or "CharacterID" }
  factional_influence: Record<string, number>;
  initial_description: string;
}

export interface WorldModel {
  vocabulary: Record<string, any>;
  adaptive_vocabulary_log: any[];
  characters: Record<string, Character>;
  archetypes: Record<string, string>;
  settings: Record<string, Setting>;
  objects: Record<string, any>;
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
