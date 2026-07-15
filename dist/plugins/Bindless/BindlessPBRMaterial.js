import { GPU } from '@trident/core';
import { VBuffer } from './Heap.js';
import { BindlessVT } from './BindlessVT.js';

class BindlessPBRMaterial {
  constructor(params = {}) {
    this.params = params;
    this.Reload();
  }
  record = new VBuffer(24);
  get ptr() {
    return this.record.ptr;
  }
  // Mutate params freely, then call Reload — the bindless ReloadMaterial.
  Reload() {
    const p = this.params;
    this.record.SetArray(new Float32Array([
      ...p.albedo ?? [1, 1, 1, 1],
      ...p.emissive ?? [0, 0, 0, 0],
      p.roughness ?? 1,
      p.metalness ?? 0,
      p.unlit ? 1 : 0,
      p.alphaCutoff ?? 0,
      ...p.albedoRegion ?? [0, 0, 0, 0],
      // vtOffset.xy, vtScale.xy — scale 0 = untextured
      ...p.normalRegion ?? [0, 0, 0, 0],
      ...p.armRegion ?? [0, 0, 0, 0]
    ]));
  }
  static materialCache = /* @__PURE__ */ new Map();
  static ConvertPBRMaterial(src) {
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
      const attach = (tex, skip, key) => {
        if (!tex || tex === skip) return;
        BindlessVT.AllocateFromTexture(tex).then((region) => {
          material.params[key] = region;
          material.Reload();
        }).catch((e) => console.error(`[PropGenerator] VT ${key} failed:`, e));
      };
      attach(p.albedoMap, GPU.Texture.WhiteTexture, "albedoRegion");
      attach(p.normalMap, GPU.Texture.NormalTexture, "normalRegion");
      attach(p.armMap, GPU.Texture.WhiteTexture, "armRegion");
    }
    return converted;
  }
}

export { BindlessPBRMaterial };
