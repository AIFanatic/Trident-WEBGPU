import { Color } from "../math/Color";
import { UUID } from "../utils/";
import { Shader, ShaderParams } from "./Shader";
import { ShaderLoader } from "./ShaderUtils";
import { Texture } from "./Texture";
import { TextureSampler } from "./TextureSampler";

export interface MaterialParams {
    isDeferred: boolean;
}

export class Material {
    public shader: Shader;
    public params: MaterialParams;

    public async createShader(): Promise<Shader> {
        throw Error("Not implemented");
    }

    constructor(params?: Partial<MaterialParams>) {
        const defaultParams: MaterialParams = {
            isDeferred: false
        }
        this.params = Object.assign({}, defaultParams, params);
    }

    public Destroy() {
        this.shader.Destroy();
    };
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

export class PBRMaterial extends Material {
    public id = UUID();
    public initialParams?: Partial<PBRMaterialParams>;
    declare public params: PBRMaterialParams;

    constructor(params?: Partial<PBRMaterialParams>) {
        super(params);

        this.initialParams = params;
        const defaultParams: PBRMaterialParams = {
            albedoColor: new Color(1,1,1,1),
            emissiveColor: new Color(0,0,0,0),
            roughness: 0,
            metalness: 0,
        
            albedoMap: undefined,
            normalMap: undefined,
            heightMap: undefined,
            metalnessMap: undefined,
            emissiveMap: undefined,
            aoMap: undefined,
        
            doubleSided: false,
            alphaCutoff: 0,
            unlit: false,

            wireframe: false,
            isDeferred: true
        }
        this.params = Object.assign({}, defaultParams, params);
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
            this.params.roughness, this.params.metalness, +this.params.unlit, this.params.alphaCutoff, +this.params.wireframe,
            0, 0, 0
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