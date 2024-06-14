import { Utils } from "../Utils";
import { Color } from "../math/Color";
import { Renderer } from "./Renderer";
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

    unlit?: boolean;
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

export class PBRMaterial extends Material {
    constructor(params?: Partial<MeshBasicMaterialParams>) {
        super();

        let code = ShaderCode.MeshBasicMaterial();

        let shaderParams: MeshBasicMaterialParams = {
            code: code,
            colorOutputs: [
                {format: Renderer.SwapChainFormat},
                {format: Renderer.SwapChainFormat},
                {format: Renderer.SwapChainFormat},
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

                TextureSampler: {location: 4, type: "sampler"},
                AlbedoMap: {location: 5, type: "texture"},
                NormalMap: {location: 6, type: "texture"},
                HeightMap: {location: 7, type: "texture"},
                RoughnessMap: {location: 8, type: "texture"},
                MetalnessMap: {location: 9, type: "texture"},
                EmissiveMap: {location: 10, type: "texture"},
                AOMap: {location: 11, type: "texture"},

                // material: {location: 12, type: "storage"},
                material: {location: 3, type: "storage"},
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
        const unlit = shaderParams?.unlit && shaderParams.unlit === true ? 1: 0;

        if (DEFINES.USE_ALBEDO_MAP || DEFINES.USE_NORMAL_MAP || DEFINES.USE_HEIGHT_MAP || DEFINES.USE_ROUGHNESS_MAP || DEFINES.USE_METALNESS_MAP || DEFINES.USE_EMISSIVE_MAP || DEFINES.USE_AO_MAP) {
            const textureSampler = TextureSampler.Create();
            this.shader.SetSampler("TextureSampler", textureSampler);                
        }

        this.shader.SetArray("material", new Float32Array([
            albedoColor.r, albedoColor.g, albedoColor.b, albedoColor.a,
            emissiveColor.r, emissiveColor.g, emissiveColor.b, emissiveColor.a,
            roughness, metalness, unlit, 0
        ]));

        // this.shader.SetArray("EmissiveColor", emissiveColor.elements);
        // this.shader.SetValue("Roughness", roughness);
        // this.shader.SetValue("Metalness", metalness);

        if (DEFINES.USE_ALBEDO_MAP === true && shaderParams.albedoMap) this.shader.SetTexture("AlbedoMap", shaderParams.albedoMap);
        if (DEFINES.USE_NORMAL_MAP === true && shaderParams.normalMap) this.shader.SetTexture("NormalMap", shaderParams.normalMap);
        if (DEFINES.USE_HEIGHT_MAP === true && shaderParams.heightMap) throw Error("Height mapping not implemented yet");
        if (DEFINES.USE_ROUGHNESS_MAP === true && shaderParams.roughnessMap) this.shader.SetTexture("RoughnessMap", shaderParams.roughnessMap);
        if (DEFINES.USE_METALNESS_MAP === true && shaderParams.metalnessMap) this.shader.SetTexture("MetalnessMap", shaderParams.metalnessMap);
        if (DEFINES.USE_EMISSIVE_MAP === true && shaderParams.emissiveMap) this.shader.SetTexture("EmissiveMap", shaderParams.emissiveMap);
        if (DEFINES.USE_AO_MAP === true && shaderParams.aoMap) this.shader.SetTexture("AOMap", shaderParams.aoMap);

        // if (shaderParams.unlit === true) this.shader.SetValue("materialType", 1);
        // else this.shader.SetValue("materialType", 0);
    }
}