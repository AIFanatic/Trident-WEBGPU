import { Color } from "../math/Color";
import { Shader } from "./Shader";
import { Texture } from "./Texture";
export interface MaterialParams {
    isDeferred: boolean;
}
export declare class Material {
    shader: Shader;
    params: MaterialParams;
    createShader(): Promise<Shader>;
    constructor(params?: Partial<MaterialParams>);
}
export interface PBRMaterialParams extends MaterialParams {
    albedoColor: Color;
    emissiveColor: Color;
    roughness: number;
    metalness: number;
    albedoMap?: Texture;
    normalMap?: Texture;
    heightMap?: Texture;
    metalnessMap?: Texture;
    emissiveMap?: Texture;
    aoMap?: Texture;
    doubleSided?: boolean;
    alphaCutoff: number;
    unlit: boolean;
    wireframe: boolean;
}
export declare class PBRMaterial extends Material {
    id: string;
    initialParams?: Partial<PBRMaterialParams>;
    params: PBRMaterialParams;
    constructor(params?: Partial<PBRMaterialParams>);
    createShader(): Promise<Shader>;
}
