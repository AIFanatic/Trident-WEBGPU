import { Utils } from "../Utils";
import { Color } from "../math/Color";
import { Shader, ShaderCode, ShaderParams } from "./Shader";
import { Texture } from "./Texture";
import { TextureSampler } from "./TextureSampler";

export class Material {
    public shader: Shader;
}

export interface MeshBasicMaterialParams extends ShaderParams {
    albedoColor?: Color;
    albedoMap?: Texture;

    normalMap?: Texture;
    
    heightMap?: Texture;

    roughness?: number;
    roughnessMap?: Texture;

    metalness?: number;
    metalnessMap?: Texture;

    emissiveColor?: Color;
    emissiveMap?: Texture;

    aoMap?: Texture;
}

export function WGSLPreprocess(code: string, defines: {[key: string]: boolean}): string {
    const coditions = Utils.StringFindAllBetween(code, "#if", "#endif", false);

    for (const condition of coditions) {
        const variable = Utils.StringFindAllBetween(condition, "#if ", "\n")[0];
        const value = condition.replaceAll(`#if ${variable}`, "").replaceAll("#endif", "");

        if (defines[variable] === true) code = code.replaceAll(condition, value);
        else code = code.replaceAll(condition, "");
    }
    return code;
}

export class MeshBasicMaterial extends Material {
    constructor(params?: Partial<MeshBasicMaterialParams>) {
        super();

        let code = ShaderCode.MeshBasicMaterial();

        let shaderParams: MeshBasicMaterialParams = {
            code: code,
            colorOutputs: [
                {format: "rgba16float"},
                {format: "rgba16float"},
                {format: "rgba16float"},
            ],
            depthOutput: "depth24plus",
            attributes: {
                position: {location: 0, size: 3, type: "vec3"},
                normal: {location: 1, size: 3, type: "vec3"},
                uv: {location: 2, size: 2, type: "vec2"}
            },
            uniforms: {
                projectionMatrix: {location: 0, type: "storage"},
                viewMatrix: {location: 1, type: "storage"},
                modelMatrix: {location: 2, type: "storage"},

                AlbedoColor: {location: 3, type: "storage"},
                EmissiveColor: {location: 4, type: "storage"},
                Roughness: {location: 5, type: "storage"},
                Metalness: {location: 6, type: "storage"},

                TextureSampler: {location: 7, type: "sampler"},
                AlbedoMap: {location: 8, type: "texture"},
                NormalMap: {location: 9, type: "texture"},
                HeightMap: {location: 10, type: "texture"},
                RoughnessMap: {location: 11, type: "texture"},
                MetalnessMap: {location: 12, type: "texture"},
                EmissiveMap: {location: 13, type: "texture"},
                AOMap: {location: 14, type: "texture"},
            }
        };
        shaderParams = Object.assign({}, shaderParams, params);

        const DEFINES = {
            USE_ALBEDO_MAP: shaderParams?.albedoMap ? true : false,
            USE_NORMAL_MAP: shaderParams?.normalMap ? true : false,
            USE_HEIGHT_MAP: shaderParams?.heightMap ? true : false,
            USE_ROUGHNESS_MAP: shaderParams?.roughnessMap ? true : false,
            USE_METALNESS_MAP: shaderParams?.metalnessMap ? true : false,
            USE_EMISSIVE_MAP: shaderParams?.emissiveMap ? true : false,
            USE_AO_MAP: shaderParams?.aoMap ? true : false,
        }

        shaderParams.code = WGSLPreprocess(shaderParams.code, DEFINES);

        this.shader = Shader.Create(shaderParams);

        const albedoColor = shaderParams?.albedoColor ? shaderParams.albedoColor : new Color(1,1,1,1);
        const emissiveColor = shaderParams?.emissiveColor ? shaderParams.emissiveColor : new Color(0,0,0,0);
        const roughness = shaderParams?.roughness ? shaderParams.roughness : 0;
        const metalness = shaderParams?.metalness ? shaderParams.metalness : 0;

        if (DEFINES.USE_ALBEDO_MAP || DEFINES.USE_NORMAL_MAP || DEFINES.USE_HEIGHT_MAP || DEFINES.USE_ROUGHNESS_MAP || DEFINES.USE_METALNESS_MAP || DEFINES.USE_EMISSIVE_MAP || DEFINES.USE_AO_MAP) {
            const textureSampler = TextureSampler.Create();
            this.shader.SetSampler("TextureSampler", textureSampler);                
        }

        this.shader.SetArray("AlbedoColor", albedoColor.elements);
        this.shader.SetArray("EmissiveColor", emissiveColor.elements);
        this.shader.SetValue("Roughness", roughness);
        this.shader.SetValue("Metalness", metalness);

        if (DEFINES.USE_ALBEDO_MAP === true && shaderParams.albedoMap) this.shader.SetTexture("AlbedoMap", shaderParams.albedoMap);
        if (DEFINES.USE_NORMAL_MAP === true && shaderParams.normalMap) this.shader.SetTexture("NormalMap", shaderParams.normalMap);
        if (DEFINES.USE_HEIGHT_MAP === true && shaderParams.heightMap) this.shader.SetTexture("HeightMap", shaderParams.heightMap);
        if (DEFINES.USE_ROUGHNESS_MAP === true && shaderParams.roughnessMap) this.shader.SetTexture("RoughnessMap", shaderParams.roughnessMap);
        if (DEFINES.USE_METALNESS_MAP === true && shaderParams.metalnessMap) this.shader.SetTexture("MetalnessMap", shaderParams.metalnessMap);
        if (DEFINES.USE_EMISSIVE_MAP === true && shaderParams.emissiveMap) this.shader.SetTexture("EmissiveMap", shaderParams.emissiveMap);
        if (DEFINES.USE_AO_MAP === true && shaderParams.aoMap) this.shader.SetTexture("AOMap", shaderParams.aoMap);
    }
}