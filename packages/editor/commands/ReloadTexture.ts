import { Assets, GPU } from "@trident/core";

export async function ReloadTexture(assetPath: string): Promise<GPU.Texture> {
    Assets.RemoveInstance(assetPath);
    const fresh = await GPU.Texture.Deserialize(assetPath);

    const stale = new Set<GPU.Texture>();
    GPU.MaterialPool.forEach(mat => {
        if (!mat) return;
        const p: any = (mat as any).params;
        if (!p) return;
        for (const key in p) {
            const v = p[key];
            if (v && v.assetPath === assetPath && v !== fresh) {
                stale.add(v);
                p[key] = fresh; // Proxy fires → ReloadMaterial
            }
        }
    })

    for (const t of stale) t.Destroy();
    return fresh;
}