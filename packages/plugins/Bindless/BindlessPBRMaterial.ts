import { GPU, PBRMaterial } from "@trident/core";
import { Ptr, VBuffer } from "./Heap";
import { BindlessVT } from "./BindlessVT";

interface BindlessMaterialParams {
    cullMode?: "none" | "front" | "back";
    albedo?: [number, number, number, number];
    emissive?: [number, number, number, number];
    roughness?: number; metalness?: number;
    unlit?: boolean; alphaCutoff?: number;
    albedoRegion?: [number, number, number, number];
    normalRegion?: [number, number, number, number];
    armRegion?: [number, number, number, number];
}

export class BindlessPBRMaterial {
    private readonly record = new VBuffer(24);
    public get ptr(): Ptr { return this.record.ptr; }

    constructor(public params: BindlessMaterialParams = {}) { this.Reload(); }

    // Mutate params freely, then call Reload — the bindless ReloadMaterial.
    public Reload() {
        const p = this.params;
        this.record.SetArray(new Float32Array([
            ...(p.albedo ?? [1, 1, 1, 1]),
            ...(p.emissive ?? [0, 0, 0, 0]),
            p.roughness ?? 1, p.metalness ?? 0,
            p.unlit ? 1 : 0, p.alphaCutoff ?? 0,
            ...(p.albedoRegion ?? [0, 0, 0, 0]),    // vtOffset.xy, vtScale.xy — scale 0 = untextured
            ...(p.normalRegion ?? [0, 0, 0, 0]),
            ...(p.armRegion ?? [0, 0, 0, 0]),
        ]));
    }

    private static materialCache = new Map<unknown, BindlessPBRMaterial>();
    public static ConvertPBRMaterial(src: PBRMaterial): BindlessPBRMaterial {
        console.log("[convert]", src?.constructor?.name, "albedoMap:", src?.params?.albedoMap?.name ?? src?.params?.albedoMap?.id ?? "NONE");
        let converted = BindlessPBRMaterial.materialCache.get(src);
        if (!converted) {
            const p = src?.params ?? {};
            converted = new BindlessPBRMaterial({
                albedo: p.albedoColor ? [p.albedoColor.r, p.albedoColor.g, p.albedoColor.b, p.albedoColor.a] : [1, 1, 1, 1],
                emissive: p.emissiveColor ? [p.emissiveColor.r, p.emissiveColor.g, p.emissiveColor.b, p.emissiveColor.a] : [0, 0, 0, 0],
                roughness: p.roughness ?? 1,
                metalness: p.metalness ?? 0,
                unlit: !!p.unlit,
                alphaCutoff: p.alphaCutoff ?? 0,
                cullMode: p.cullMode
            });
            this.materialCache.set(src, converted);

            const material = converted;
            const attach = (tex: any, skip: any, key: "albedoRegion" | "normalRegion" | "armRegion") => {
                if (!tex || tex === skip) return;
                BindlessVT.AllocateFromTexture(tex)
                    .then(region => { (material.params as any)[key] = region; material.Reload(); })
                    .catch(e => console.error(`[PropGenerator] VT ${key} failed:`, e));
            };
            attach(p.albedoMap, GPU.Texture.WhiteTexture, "albedoRegion");
            attach(p.normalMap, GPU.Texture.NormalTexture, "normalRegion");
            attach(p.armMap, GPU.Texture.WhiteTexture, "armRegion");
        }
        return converted;
    }
}