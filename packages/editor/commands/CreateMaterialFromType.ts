import { GPU } from "@trident/core";
import { IMaterial } from "../engine-api/trident/IMaterial";

export function CreateMaterialFromType(newTypeId: string): IMaterial {
    if (!GPU.Material.Registry.has(newTypeId)) throw Error(`Material not found in registry ${newTypeId}`);

    const newMaterial = GPU.Material.Create(newTypeId) as IMaterial;
    return newMaterial;
}