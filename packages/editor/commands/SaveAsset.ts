import { Serializer } from "@trident/core";
import { SaveToFile } from "./SaveToFile";

export async function SaveAsset(asset: {assetPath: string}): Promise<void> {
    console.log("SaveAsset callled!");
    if (!asset.assetPath) {
        throw Error("SaveAsset: Asset doesn't have an assetPath.");
    }
    const ctor = asset.constructor as any;
    await SaveToFile(asset.assetPath, new Blob([JSON.stringify({ type: ctor.type, ...Serializer.serializeFields(asset) })]));
}
