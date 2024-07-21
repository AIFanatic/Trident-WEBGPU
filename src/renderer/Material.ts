import { Color } from "../math/Color";
import { Texture } from "./Texture";

export class Material {
}

export interface DeferredMeshMaterialParams {
    albedoColor: Color;
    emissiveColor: Color;
    roughness: number;
    metalness: number;

    albedoMap?: Texture;
    normalMap?: Texture;
    heightMap?: Texture;
    roughnessMap?: Texture;
    metalnessMap?: Texture;
    emissiveMap?: Texture;
    aoMap?: Texture;

    unlit: boolean;
}

export class DeferredMeshMaterial extends Material {
    public params: DeferredMeshMaterialParams;

    constructor(params?: Partial<DeferredMeshMaterialParams>) {
        super();

        const albedoColor = params?.albedoColor ? params.albedoColor : new Color(1,1,1,1);
        const emissiveColor = params?.emissiveColor ? params.emissiveColor : new Color(0,0,0,0);
        const roughness = params?.roughness ? params.roughness : 0;
        const metalness = params?.metalness ? params.metalness : 0;
        const unlit = params?.unlit && params.unlit === true ? 1: 0;

        this.params = {
            albedoColor: params?.albedoColor ? params.albedoColor : new Color(1,1,1,1),
            emissiveColor: params?.emissiveColor ? params.emissiveColor : new Color(0,0,0,0),
            roughness: params?.roughness ? params.roughness : 0,
            metalness: params?.metalness ? params.metalness : 0,
        
            albedoMap: params?.albedoMap ? params.albedoMap : undefined,
            normalMap: params?.normalMap ? params.normalMap : undefined,
            heightMap: params?.heightMap ? params.heightMap : undefined,
            roughnessMap: params?.roughnessMap ? params.roughnessMap : undefined,
            metalnessMap: params?.metalnessMap ? params.metalnessMap : undefined,
            emissiveMap: params?.emissiveMap ? params.emissiveMap : undefined,
            aoMap: params?.aoMap ? params.aoMap : undefined,
        
            unlit: params?.unlit ? params.unlit : false,
        }
    }
}