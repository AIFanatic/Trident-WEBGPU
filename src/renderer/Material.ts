import { Color } from "../math/Color";
import { Utils } from "../utils/Utils";
import { Texture } from "./Texture";

export class Material {
}

export interface PBRMaterialParams {
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

export class PBRMaterial extends Material {
    public id = Utils.UUID();
    public params: PBRMaterialParams;

    constructor(params?: Partial<PBRMaterialParams>) {
        super();

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