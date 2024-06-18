import { Light } from "../components/Light";
import { Color } from "../math/Color";
import { Renderer } from "./Renderer";
import { Shader, ShaderCode, ShaderParams } from "./Shader";
import { Texture } from "./Texture";
import { TextureSampler } from "./TextureSampler";

export class Material {
    public shader: Shader;
}

export interface DeferredMeshMaterialParams extends ShaderParams {
    albedoColor?: Color;
    emissiveColor?: Color;
    roughness?: number;
    metalness?: number;

    albedoMap?: Texture;
    normalMap?: Texture;
    heightMap?: Texture;
    roughnessMap?: Texture;
    metalnessMap?: Texture;
    emissiveMap?: Texture;
    aoMap?: Texture;

    unlit?: boolean;
}

export class DeferredMeshMaterial extends Material {
    constructor(params?: Partial<DeferredMeshMaterialParams>) {
        super();

        const DEFINES = {
            USE_ALBEDO_MAP: params?.albedoMap ? true : false,
            USE_NORMAL_MAP: params?.normalMap ? true : false,
            USE_HEIGHT_MAP: params?.heightMap ? true : false,
            USE_ROUGHNESS_MAP: params?.roughnessMap ? true : false,
            USE_METALNESS_MAP: params?.metalnessMap ? true : false,
            USE_EMISSIVE_MAP: params?.emissiveMap ? true : false,
            USE_AO_MAP: params?.aoMap ? true : false,
        }

        let code = ShaderCode.DeferredMeshShader;

        let shaderParams: DeferredMeshMaterialParams = {
            code: code,
            defines: DEFINES,
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

                material: {location: 3, type: "storage"},

                TextureSampler: {location: 4, type: "sampler"},
                AlbedoMap: {location: 5, type: "texture"},
                NormalMap: {location: 6, type: "texture"},
                HeightMap: {location: 7, type: "texture"},
                RoughnessMap: {location: 8, type: "texture"},
                MetalnessMap: {location: 9, type: "texture"},
                EmissiveMap: {location: 10, type: "texture"},
                AOMap: {location: 11, type: "texture"},


                cameraPosition: {location: 12, type: "storage"},

            }
        };
        shaderParams = Object.assign({}, shaderParams, params);

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

        if (DEFINES.USE_ALBEDO_MAP === true && shaderParams.albedoMap) this.shader.SetTexture("AlbedoMap", shaderParams.albedoMap);
        if (DEFINES.USE_NORMAL_MAP === true && shaderParams.normalMap) this.shader.SetTexture("NormalMap", shaderParams.normalMap);
        if (DEFINES.USE_HEIGHT_MAP === true && shaderParams.heightMap) this.shader.SetTexture("HeightMap", shaderParams.heightMap);
        if (DEFINES.USE_ROUGHNESS_MAP === true && shaderParams.roughnessMap) this.shader.SetTexture("RoughnessMap", shaderParams.roughnessMap);
        if (DEFINES.USE_METALNESS_MAP === true && shaderParams.metalnessMap) this.shader.SetTexture("MetalnessMap", shaderParams.metalnessMap);
        if (DEFINES.USE_EMISSIVE_MAP === true && shaderParams.emissiveMap) this.shader.SetTexture("EmissiveMap", shaderParams.emissiveMap);
        if (DEFINES.USE_AO_MAP === true && shaderParams.aoMap) this.shader.SetTexture("AOMap", shaderParams.aoMap);
    }
}






export class ShadowMaterial extends Material {
    public readonly light: Light;

    constructor(light: Light) {
        super();

        this.light = light;

        let shaderParams: ShaderParams = {
            code: ShaderCode.ShadowShader,
            attributes: {
                position: { location: 0, size: 3, type: "vec3" },
                normal: { location: 1, size: 3, type: "vec3" },
                uv: { location: 2, size: 2, type: "vec2" }
            },
            uniforms: {
                projectionMatrix: {location: 0, type: "storage"},
                viewMatrix: {location: 1, type: "storage"},
                modelMatrix: {location: 2, type: "storage"},
            },
            depthOutput: "depth24plus",
            colorOutputs: []
        };
        
        this.shader = Shader.Create(shaderParams);
    }
}