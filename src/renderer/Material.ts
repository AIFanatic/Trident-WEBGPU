import { Color } from "../math/Color";
import { Utils } from "../utils/Utils";
import { Shader, ShaderParams, Topology } from "./Shader";
import { ShaderLoader } from "./ShaderUtils";
import { Texture } from "./Texture";
import { TextureSampler } from "./TextureSampler";

export class Material {
    public shader: Shader;

    public async createShader(): Promise<Shader> {
        throw Error("Not implemented");
    }
}

export interface PBRMaterialParams {
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
}

export class PBRMaterial extends Material {
    public id = Utils.UUID();
    public initialParams?: Partial<PBRMaterialParams>;
    public params: PBRMaterialParams;

    constructor(params?: Partial<PBRMaterialParams>) {
        super();

        this.initialParams = params;
        this.params = {
            albedoColor: params?.albedoColor ? params.albedoColor : new Color(1,1,1,1),
            emissiveColor: params?.emissiveColor ? params.emissiveColor : new Color(0,0,0,0),
            roughness: params?.roughness ? params.roughness : 0,
            metalness: params?.metalness ? params.metalness : 0,
        
            albedoMap: params?.albedoMap ? params.albedoMap : undefined,
            normalMap: params?.normalMap ? params.normalMap : undefined,
            heightMap: params?.heightMap ? params.heightMap : undefined,
            metalnessMap: params?.metalnessMap ? params.metalnessMap : undefined,
            emissiveMap: params?.emissiveMap ? params.emissiveMap : undefined,
            aoMap: params?.aoMap ? params.aoMap : undefined,
        
            doubleSided: params?.doubleSided ? params.doubleSided : false,
            alphaCutoff: params?.alphaCutoff ? params.alphaCutoff : 0,
            unlit: params?.unlit ? params.unlit : false,
        }
    }

    public async createShader(): Promise<Shader> {
        const DEFINES = {
            USE_ALBEDO_MAP: this.initialParams?.albedoMap ? true : false,
            USE_NORMAL_MAP: this.initialParams?.normalMap ? true : false,
            USE_HEIGHT_MAP: this.initialParams?.heightMap ? true : false,
            USE_METALNESS_MAP: this.initialParams?.metalnessMap ? true : false,
            USE_EMISSIVE_MAP: this.initialParams?.emissiveMap ? true : false,
            USE_AO_MAP: this.initialParams?.aoMap ? true : false,
        }

        let shaderParams: ShaderParams = {
            code: await ShaderLoader.Draw,
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
                projectionMatrix: {group: 0, binding: 0, type: "storage"},
                viewMatrix: {group: 0, binding: 1, type: "storage"},
                modelMatrix: {group: 0, binding: 2, type: "storage"},

                material: {group: 0, binding: 3, type: "storage"},

                TextureSampler: {group: 0, binding: 4, type: "sampler"},
                AlbedoMap: {group: 0, binding: 5, type: "texture"},
                NormalMap: {group: 0, binding: 6, type: "texture"},
                HeightMap: {group: 0, binding: 7, type: "texture"},
                MetalnessMap: {group: 0, binding: 8, type: "texture"},
                EmissiveMap: {group: 0, binding: 9, type: "texture"},
                AOMap: {group: 0, binding: 10, type: "texture"},

                cameraPosition: {group: 0, binding: 11, type: "storage"},
            },
            cullMode: this.params.doubleSided ? "none" : undefined
        };
        shaderParams = Object.assign({}, shaderParams, this.params);

        const shader = await Shader.Create(shaderParams);

        if (DEFINES.USE_ALBEDO_MAP || DEFINES.USE_NORMAL_MAP || DEFINES.USE_HEIGHT_MAP || DEFINES.USE_METALNESS_MAP || DEFINES.USE_EMISSIVE_MAP || DEFINES.USE_AO_MAP) {
            const textureSampler = TextureSampler.Create();
            shader.SetSampler("TextureSampler", textureSampler);
        }

        shader.SetArray("material", new Float32Array([
            this.params.albedoColor.r, this.params.albedoColor.g, this.params.albedoColor.b, this.params.albedoColor.a,
            this.params.emissiveColor.r, this.params.emissiveColor.g, this.params.emissiveColor.b, this.params.emissiveColor.a,
            this.params.roughness, this.params.metalness, +this.params.unlit, this.params.alphaCutoff
        ]));

        if (DEFINES.USE_ALBEDO_MAP === true && this.params.albedoMap) shader.SetTexture("AlbedoMap", this.params.albedoMap);
        if (DEFINES.USE_NORMAL_MAP === true && this.params.normalMap) shader.SetTexture("NormalMap", this.params.normalMap);
        if (DEFINES.USE_HEIGHT_MAP === true && this.params.heightMap) shader.SetTexture("HeightMap", this.params.heightMap);
        if (DEFINES.USE_METALNESS_MAP === true && this.params.metalnessMap) shader.SetTexture("MetalnessMap", this.params.metalnessMap);
        if (DEFINES.USE_EMISSIVE_MAP === true && this.params.emissiveMap) shader.SetTexture("EmissiveMap", this.params.emissiveMap);
        if (DEFINES.USE_AO_MAP === true && this.params.aoMap) shader.SetTexture("AOMap", this.params.aoMap);

        this.shader = shader;
        
        return shader;
    }
}