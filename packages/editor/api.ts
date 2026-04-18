export interface IEditorBridge {
    saveAsset(asset: { assetPath: string }): Promise<void>;
}

let bridge: IEditorBridge | null = null;

export function registerEditorBridge(impl: IEditorBridge): void {
    bridge = impl;
}

function requireBridge(): IEditorBridge {
    if (!bridge) {
        throw new Error("EditorAPI is only available when running inside the Trident editor.");
    }
    return bridge;
}

export const EditorAPI = {
    SaveAsset(asset: { assetPath: string }): Promise<void> {
        return requireBridge().saveAsset(asset);
    },
};