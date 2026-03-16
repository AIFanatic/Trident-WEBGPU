/**
 * AssetRegistry — editor-only instance cache for serialized assets.
 * Replaces Assets.GetInstance / SetInstance / RemoveInstance from core.
 */

export class AssetRegistry {
    private static instanceCache: Map<string, any> = new Map();

    public static GetInstance(path: string): any {
        return AssetRegistry.instanceCache.get(path);
    }

    public static SetInstance(path: string, instance: any) {
        return AssetRegistry.instanceCache.set(path, instance);
    }

    public static RemoveInstance(path: string): boolean {
        return AssetRegistry.instanceCache.delete(path);
    }

    public static Clear() {
        AssetRegistry.instanceCache.clear();
    }
}
