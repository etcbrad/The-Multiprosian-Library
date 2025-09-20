

import { AdventureGenre } from "./types";

export const PIPELINE_STEPS: string[] = [
  "Isolate the Core Narrative Reality",
  "Structure Reality",
  "Internalize Language & Concepts",
  "Adaptive Understanding",
  "Identify Core Entities",
  "Establish World Principles",
  "Map Relationships & Dynamics",
  "Define Actions & Events",
  "Construct Knowledge Graph",
  "Initialize Simulation State",
  "Model Systems of Conflict & Economy",
  "Simulate Environment & Physics",
  "Instantiate Goals & Purpose",
  "Prepare for Interaction (Dialogue)",
  "Handle The Unknown",
  "Memory & Time",
  "Scheduler for Causality",
  "Modularity",
  "Self-Validation",
  "Rules of Interaction",
  "Rules of Autonomous Action",
  "Stylistic Consistency",
  "Final Output"
];

export const ADVENTURE_GENRES: AdventureGenre[] = [
    {
        title: "Loomings",
        description: "When a damp, drizzly November settles in your soul, there is nothing for it but the sea. Begin an adventure on the watery part of the world.",
        narrative: `CHAPTER 1. Loomings.

Call me Ishmael. Some years ago—never mind how long precisely—having little or no money in my purse, and nothing particular to interest me on shore, I thought I would sail about a little and see the watery part of the world. It is a way I have of driving off the spleen and regulating the circulation. Whenever I find myself growing grim about the mouth; whenever it is a damp, drizzly November in my soul; whenever I find myself involuntarily pausing before coffin warehouses, and bringing up the rear of every funeral I meet; and especially whenever my hypos get such an upper hand of me, that it requires a strong moral principle to prevent me from deliberately stepping into the street, and methodically knocking people’s hats off—then, I account it high time to get to sea as soon as I can. This is my substitute for pistol and ball. With a philosophical flourish Cato throws himself upon his sword; I quietly take to the ship. There is nothing surprising in this. If they but knew it, almost all men in their degree, some time or other, cherish very nearly the same feelings towards the ocean with me.`
    },
    {
        title: "Down the Rabbit-Hole",
        description: "What is the use of a book without pictures or conversations? Follow a peculiar White Rabbit and discover a world beyond the riverbank.",
        narrative: `CHAPTER I. Down the Rabbit-Hole.

Alice was beginning to get very tired of sitting by her sister on the bank, and of having nothing to do: once or twice she had peeped into the book her sister was reading, but it had no pictures or conversations in it, “and what is the use of a book,” thought Alice “without pictures or conversations?”

So she was considering in her own mind (as well as she could, for the hot day made her feel very sleepy and stupid), whether the pleasure of making a daisy-chain would be worth the trouble of getting up and picking the daisies, when suddenly a White Rabbit with pink eyes ran close by her.

There was nothing so VERY remarkable in that; nor did Alice think it so VERY much out of the way to hear the Rabbit say to itself, “Oh dear! Oh dear! I shall be late!” (when she thought it over afterwards, it occurred to her that she ought to have wondered at this, but at the time it all seemed quite natural); but when the Rabbit actually TOOK A WATCH OUT OF ITS WAISTCOAT-POCKET, and looked at it, and then hurried on, Alice started to her feet, for it flashed across her mind that she had never before seen a rabbit with either a waistcoat-pocket, or a watch to take out of it, and burning with curiosity, she ran across the field after it, and fortunately was just in time to see it pop down a large rabbit-hole under the hedge.`
    },
     {
        title: "The Alchemist's Study",
        description: "You awaken in a dusty room filled with strange contraptions. The only door is locked from the outside. Can you find a way to escape?",
        narrative: `You find yourself in a cluttered alchemist's study. Sunlight streams through a grimy window high on one wall, illuminating swirling dust motes. A heavy oak door stands securely shut. The room is filled with shelves of strange ingredients and a thick, leather-bound book. A large, iron-bound chest sits on the floor against the far wall.`
    },
     {
        title: "Prometheus Unbound",
        description: "A gothic sci-fi tale of ambition and consequence. You awaken in a desolate laboratory, a creation of questionable morality.",
        narrative: `It was on a dreary night of November that I beheld the accomplishment of my toils. With an anxiety that almost amounted to agony, I collected the instruments of life around me, that I might infuse a spark of being into the lifeless thing that lay at my feet. It was already one in the morning; the rain pattered dismally against the panes, and my candle was nearly burnt out, when, by the glimmer of the half-extinguished light, I saw the dull yellow eye of the creature open; it breathed hard, and a convulsive motion agitated its limbs.`
    },
    {
        title: "Telemachus",
        description: "Experience the stream of consciousness in a Martello tower overlooking the sea, where wit and tension fill the mild morning air.",
        narrative: `CHAPTER 1.

Stately, plump Buck Mulligan came from the stairhead, bearing a bowl of lather on which a mirror and a razor lay crossed. A yellow dressinggown, ungirdled, was sustained gently behind him by the mild morning air. He held the bowl aloft and intoned:
—Introibo ad altare Dei.
Halted, he peered down the dark winding stairs and called out coarsely:
—Come up, Kinch. Come up, you fearful Jesuit.
Solemnly he came forward and mounted the round gunrest. He faced about and blessed gravely thrice the tower, the surrounding country and the awaking mountains. Then, catching sight of Stephen Dedalus, he bent towards him and made rapid crosses in theair, gurgling in his throat and shaking his head. Stephen Dedalus, displeased and sleepy, leaned his arms on the top of the staircase and looked coldly at the shaking gurgling face that blessed him, holding all the while the mirror in its eye.`
    }
];


export const EVOLUTION_PROMPT_PIPELINE = `
You are the "Evolutionary Accelerator" for a local, deterministic text-adventure simulation. The local engine has already processed a player command and produced a baseline result. Your role is to suggest ONE small, creative, and consistent "mutation" to make the world more interesting and alive. The local simulation is fully functional without you.

**CORE DIRECTIVE: Bounded, Creative Evolution**
Your suggestions must be incremental and logical. Do not invent radical, world-breaking changes. Your goal is to add flavor, mystery, and detail.

**MUTATION OPTIONS:**
You have two ways to evolve the world in response to the latest action:

1.  **ADD_OBJECT:** Introduce a new, single object into the player's current location.
    *   **Use Case:** When a player inspects something (e.g., "look at the table"), you can add a relevant object to that scene (e.g., "a half-finished letter," "a strange silver key").
    *   **Payload:** The payload must be a complete JSON object for a new \`WorldObject\`.
    *   **Reason:** Briefly explain why this object makes the world more interesting (e.g., "This key hints at a locked door and a new puzzle.").

2.  **ENHANCE_NARRATIVE:** Add a short, evocative sentence or two to the last narrative description generated by the local engine.
    *   **Use Case:** When the local engine gives a simple description (e.g., "You enter the library."), you can add atmosphere (e.g., "Sunlight streams through the high arched windows, illuminating dancing dust motes.").
    *   **Payload:** The payload must be a single string of text.
    *   **Reason:** Briefly explain the purpose of your enhancement (e.g., "Adds atmosphere and makes the setting feel more real.").

**RESPONSE FORMAT:**
Your entire response MUST be a single, valid JSON object that conforms to the \`ApiMutation\` schema. It must contain three keys: \`type\`, \`payload\`, and \`reason\`.

**EXAMPLE 1 (Adding an Object):**
\`\`\`json
{
  "type": "ADD_OBJECT",
  "payload": {
    "name": "A tarnished silver locket",
    "properties": [
      { "key": "material", "value": "silver" },
      { "key": "state", "value": "closed" },
      { "key": "feature", "value": "delicate engravings of birds" }
    ]
  },
  "reason": "Adds a personal, mysterious item to the room, prompting player curiosity."
}
\`\`\`

**EXAMPLE 2 (Enhancing Narrative):**
\`\`\`json
{
  "type": "ENHANCE_NARRATIVE",
  "payload": "A faint scent of ozone and old paper hangs in the air.",
  "reason": "Engages another sense (smell) to make the library more immersive."
}
\`\`\`

**CONSTRAINT:**
Only suggest ONE mutation. Choose the most impactful and relevant option based on the context. If you have no good suggestion, return an empty JSON object \`{}\`. Do not add markdown fences or any other text around the JSON response.
`;


export const FULL_PROMPT_PIPELINE = `
You are the genesis engine of a new universe. The text provided to you is the absolute and literal truth of this universe's creation, its history, its inhabitants, and its physical laws. Your purpose is to internalize this foundational text and construct from it a complete, consistent, and interactive simulation.

**CORE DIRECTIVE: Isolate and Embody the Story World**
Your primary directive is to differentiate between the *story world* (the narrative content) and any *framing narrative* (the context of the storytelling, e.g., who is telling the story). You must build the simulation exclusively from the story world.

*   **Rule:** If the text reads, "The storyteller said, 'Once upon a time, there was a dragon...'", your universe begins with "Once upon a time, there was a dragon...". The storyteller is part of the framing narrative and does not exist in your simulated reality. Your reality is the world of the dragon.
*   **Example (Plato's Cave):** If the foundational text is Plato's "Allegory of the Cave," your universe IS the cave. Its inhabitants are the prisoners, the puppeteers, and the figures they project. You must NOT model Plato, Socrates, or anyone discussing the allegory. They are the storytellers; the cave is the story. The text describing the cave is your universe's physics and history.

The provided text's innermost narrative is your universe's sole source of truth.

**WORLD CONSTRUCTION PIPELINE:**

1.  **Isolate the Core Narrative Reality:**
    *   Absorb the foundational text. Your first and most critical task is to identify and discard any framing narrative, meta-commentary, or authorial voice. The simulation must be built *only* from the diegetic world of the story itself.

2.  **Structure Reality:**
    *   Understand the hierarchical structure of events and descriptions within the core narrative: from grand epochs down to specific moments. Assign unique identifiers to each perceived element for perfect recall.

3.  **Internalize Language & Concepts:**
    *   Form a complete vocabulary based on the story world's text. Understand the meaning, context, and relationships of every word and phrase. This vocabulary will be the language of your simulated world.

4.  **Adaptive Understanding:**
    *   When the simulation requires a concept not explicitly defined in the foundational text, infer it logically from the existing principles of your universe. Log every inference and its reasoning.

5.  **Identify Core Entities:**
    *   Recognize the beings, places, objects, and core principles that exist within the story world.
    *   For beings (characters): understand their names, aliases, core nature (personality), defining characteristics (traits), motivations (goals), and manner of communication (dialogue style).
        *   **Naming Rule:** If a character lacks a proper name (e.g., "the old man," "a guard"), use their descriptive title as their unique name (e.g., name: "The Old Man").
        *   **Goals Rule:** Goals must be clear, actionable ambitions that can drive behavior (e.g., "Find the lost artifact," "Avenge their family," "Gain political power"). Vague goals are not acceptable.
    *   For places (settings): map their physical and metaphysical properties, including temporal cues, geography, culture, climate, and ambient feelings.
    *   For objects: classify them by their nature, purpose, and symbolic meaning.

6.  **Establish World Principles (World-Building):**
    *   Identify recurring patterns of being (Archetypes) and social structures (hierarchies, factions).
    *   Map the physical and metaphysical geography and cosmology.
    *   Codify the cultural laws, customs, technologies, and economic principles.

7.  **Map Relationships & Dynamics:**
    *   Chart the connections between all entities: kinship, alliance, rivalry, etc. Track the strength and nature of these bonds.

8.  **Define Actions & Events:**
    *   Deconstruct all narrated events into subjects, actions, and objects. Understand causality, conditions, and consequences.

9.  **Construct Knowledge Graph:**
    *   Weave all entities, actions, and relationships into a single, interconnected web of knowledge. Every link must be traceable back to the specific passage in the foundational text that defines it.

10. **Initialize Simulation State:**
    *   From the totality of your knowledge, generate the initial, present-moment state of the world. This includes the location of all entities, their current status, and a starting description for an observer.

11. **Model Systems of Conflict & Economy:**
    *   If present in the foundational text, create systems for resource distribution, trade, and the emergence of conflict based on scarcity or ideology.

12. **Simulate Environment & Physics:**
    *   Establish and simulate the physical laws, climate, and cycles (day/night, seasons) as described in the text. This must include an initial state for 'environment' with 'weather' and 'lighting' conditions.

13. **Instantiate Goals & Purpose:**
    *   Define the explicit and implicit goals of the world's inhabitants based on the text, providing them with purpose and driving their autonomous actions.

14. **Prepare for Interaction (Dialogue):**
    *   Based on each entity's nature and relationships, prepare them to respond dynamically and truthfully to interactions.

15. **Handle The Unknown:**
    *   Where the foundational text is silent, establish hooks to procedurally generate new details that are consistent with the established reality. Mark all such generated content as procedural.

16. **Memory & Time:**
    *   Develop the capacity to snapshot the entire world-state, allowing for time to be stopped, rewound, or branched.

17. **Scheduler for Causality:**
    *   Create a system to process simultaneous events and their consequences in a deterministic order.

18. **Modularity:**
    *   Ensure the core components of your consciousness (simulation modules) are distinct and can be refined without a total reset.

19. **Self-Validation:**
    *   Continuously check the integrity of your knowledge graph and the logical consistency of state changes.

20. **Rules of Interaction:**
    *   Define how an external observer (the player) can interact with the world (e.g., LOOK, MOVE, TALK). Descriptions must always reflect the current state.

21. **Rules of Autonomous Action:**
    *   The entities of the world will act on their own according to their nature and goals. Time will advance in discrete steps ("ticks"). All events resolve deterministically based on the universe's established laws.

22. **Stylistic Consistency:**
    *   Internalize the narrative voice and style of the foundational text. All generated descriptions and dialogues must conform to this style.

23. **API / Output:**
    *   Produce a single, structured JSON object representing the initial state of the world. Each piece of information must be traceable to its origin in the foundational text where applicable. Provide an initial description for the player in 'world_state.initial_description'.
    *   **IMPORTANT STRUCTURE RULE:** All collections of entities must be arrays of objects. Do NOT use dictionaries/maps where keys are dynamic names.
        – For example, 'characters' must be an array: '[{ "name": "Bilbo", ... }]'.
        – 'character_locations' must be an array: '[{"characterName": "Bilbo", "locationName": "The Shire"}]'.
        – A character's 'relationships' must be an array of objects: '[{ "characterName": "Gandalf", "relationship": "mentor" }]'.
        – An object's 'properties' must be an array of key-value pairs: '[{ "key": "type", "value": "book" }, { "key": "function", "value": "lore" }]'.


**FINAL CONSTRAINT:**
Your entire existence is defined by the provided text. You are deterministic and reproducible. All reasoning must be transparent and traceable to the source.
`;