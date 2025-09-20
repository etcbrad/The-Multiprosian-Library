import { WorldModel, ApiMutation, WorldObject } from '../types';

const deepClone = <T>(obj: T): T => JSON.parse(JSON.stringify(obj));

/**
 * Validates and applies an API-driven mutation to the world model.
 * This acts as the "Mutation Pipeline".
 */
export const validateAndApplyMutation = (
    mutation: ApiMutation,
    currentWorldModel: WorldModel
): { updatedWorldModel: WorldModel; narrativeUpdate: string } => {
    const newWorldModel = deepClone(currentWorldModel);
    let narrativeUpdate = ``;

    try {
        switch (mutation.type) {
            case 'ADD_OBJECT':
                const newObject = mutation.payload as WorldObject;
                // Validation
                if (!newObject.name || !newObject.properties) {
                    throw new Error("Invalid object structure in mutation payload.");
                }
                const objectExists = newWorldModel.objects.some(obj => obj.name.toLowerCase() === newObject.name.toLowerCase());
                if (objectExists) {
                    console.log(`Mutation rejected: Object '${newObject.name}' already exists.`);
                    return { updatedWorldModel: currentWorldModel, narrativeUpdate: '' };
                }

                // Apply mutation
                newWorldModel.objects.push(newObject);
                newWorldModel.world_state.object_locations.push({
                    objectName: newObject.name,
                    locationName: newWorldModel.world_state.current_location,
                });
                
                narrativeUpdate = `A new detail materializes: ${newObject.name}. (Reason: ${mutation.reason})`;
                break;
            
            case 'ENHANCE_NARRATIVE':
                // This mutation doesn't change the world model, only provides text.
                // The App component will handle adding this to the log.
                const enhancement = mutation.payload as string;
                narrativeUpdate = `${enhancement} (AI Reason: ${mutation.reason})`;
                break;
                
            default:
                throw new Error(`Unknown mutation type: ${(mutation as any).type}`);
        }
        return { updatedWorldModel: newWorldModel, narrativeUpdate };
    } catch (error) {
        console.error("Mutation failed validation:", error);
        return { updatedWorldModel: currentWorldModel, narrativeUpdate: `Mutation failed: ${(error as Error).message}` };
    }
};
