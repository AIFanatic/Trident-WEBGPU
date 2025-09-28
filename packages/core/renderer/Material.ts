import { Color } from "../math/Color";
import { UUID } from "../utils/";
import { Shader, ShaderParams } from "./Shader";
import { ShaderLoader } from "./ShaderUtils";
import { Texture } from "./Texture";
import { TextureSampler } from "./TextureSampler";

export interface MaterialParams {
    isDeferred: boolean;
    shader?: Shader;
}

export class Material {
    public shader: Shader;
    public params: MaterialParams;

    public async createShader(): Promise<Shader> {
        throw Error("Not implemented");
    }

    constructor(params?: Partial<MaterialParams>) {
        const defaultParams: MaterialParams = {
            isDeferred: false,
            shader: undefined
        }
        this.params = Object.assign({}, defaultParams, params);
        this.shader = this.params.shader;
    }

    public Destroy() {
        this.shader.Destroy();
    };

    public Serialize() {
        return {
            shader: this.shader ? this.shader.Serialize() : undefined,
            isDeferred: this.params.isDeferred
        }
    }

    // TODO: Do cache
    public static Deserialize(data: {type: string, shader: any, isDeferred: boolean, params: any}): Material {
        if (data.type === "@trident/core/renderer/Material/PBRMaterial") {
            return PBRMaterial.Deserialize(data);
        }
    }
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

    isSkinned: boolean;
}

export class PBRMaterial extends Material {
    public type = "@trident/core/renderer/Material/PBRMaterial";

    public id = UUID();
    public initialParams?: Partial<PBRMaterialParams>;
    declare public params: PBRMaterialParams;

    public static DefaultParams: PBRMaterialParams = {
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
        isSkinned: false,

        isDeferred: true
    }
    constructor(params?: Partial<PBRMaterialParams>) {
        super(params);

        this.initialParams = params;
        // this.params = Object.assign({}, defaultParams, params);
        const _params = Object.assign({}, PBRMaterial.DefaultParams, params);
        const instance = this;
        const handler1 = {
            set(obj, prop, value) {
                obj[prop] = value;

                instance.shader.SetArray("material", new Float32Array([
                    instance.params.albedoColor.r, instance.params.albedoColor.g, instance.params.albedoColor.b, instance.params.albedoColor.a,
                    instance.params.emissiveColor.r, instance.params.emissiveColor.g, instance.params.emissiveColor.b, instance.params.emissiveColor.a,
                    instance.params.roughness, instance.params.metalness, +instance.params.unlit, instance.params.alphaCutoff, +instance.params.wireframe,
                    0, 0, 0
                ]));

                return true;
            },
        };
        this.params = new Proxy(_params, handler1) as PBRMaterialParams;
    }

    public async createShader(): Promise<Shader> {
        const DEFINES = {
            USE_ALBEDO_MAP: this.initialParams?.albedoMap ? true : false,
            USE_NORMAL_MAP: this.initialParams?.normalMap ? true : false,
            USE_HEIGHT_MAP: this.initialParams?.heightMap ? true : false,
            USE_METALNESS_MAP: this.initialParams?.metalnessMap ? true : false,
            USE_EMISSIVE_MAP: this.initialParams?.emissiveMap ? true : false,
            USE_AO_MAP: this.initialParams?.aoMap ? true : false,
            USE_SKINNING: this.initialParams?.isSkinned ? true : false,
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
                uv: {location: 2, size: 2, type: "vec2"},
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
        
        let nextAttributeLocation = 3;
        if (DEFINES.USE_NORMAL_MAP) {
            shaderParams.attributes.tangent = {location: nextAttributeLocation++, size: 4, type: "vec4"};
        }
        if (DEFINES.USE_SKINNING) {
            shaderParams.attributes.joints = {location: nextAttributeLocation++, size: 4, type: "vec4u"};
            shaderParams.attributes.weights = {location: nextAttributeLocation++, size: 4, type: "vec4"};
            shaderParams.uniforms.boneMatrices = {group: 1, binding: 0, type: "storage"}
        }
        
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

    public Serialize(): { shader: void; isDeferred: boolean, params: {} } {
        const params = this.params;
        return Object.assign(
            super.Serialize(),
            {
                type: this.type,
                params: {
                    albedoColor: params.albedoColor.Serialize(),
                    emissiveColor: params.emissiveColor.Serialize(),
                    roughness: params.roughness,
                    metalness: params.metalness,
                    albedoMap: params.albedoMap ? params.albedoMap.Serialize() : undefined,
                    normalMap: params.normalMap ? params.normalMap.Serialize() : undefined,
                    heightMap: params.heightMap ?params.heightMap.Serialize() : undefined,
                    metalnessMap: params.metalnessMap ? params.metalnessMap.Serialize() : undefined,
                    emissiveMap: params.emissiveMap ? params.emissiveMap.Serialize() : undefined,
                    aoMap: params.aoMap ? params.aoMap.Serialize() : undefined,
                    doubleSided: params.doubleSided,
                    alphaCutoff: params.alphaCutoff,
                    unlit: params.unlit,
                    wireframe: params.wireframe,
                    isSkinned: params.isSkinned,
                }
            }
        );
    }

    // TODO: Do cache
    public static Deserialize(data: {type: string, shader: any, isDeferred: boolean, params: any}): PBRMaterial {
        const params = data.params;
        const defaults = PBRMaterial.DefaultParams;
        return new PBRMaterial({
            albedoColor: params.albedoColor ? new Color().Deserialize(params.albedoColor) : defaults.albedoColor,
            emissiveColor: params.emissiveColor ? new Color().Deserialize(params.emissiveColor) : defaults.emissiveColor,
            roughness: params.roughness ? params.roughness : defaults.roughness,
            metalness: params.metalness ? params.metalness : defaults.metalness,
            albedoMap: params.albedoMap ? params.albedoMap.Deserialize() : defaults.albedoMap,
            normalMap: params.normalMap ? params.normalMap.Deserialize() : defaults.normalMap,
            heightMap: params.heightMap ?params.heightMap.Deserialize() : defaults.heightMap,
            metalnessMap: params.metalnessMap ? params.metalnessMap.Deserialize() : defaults.metalnessMap,
            emissiveMap: params.emissiveMap ? params.emissiveMap.Deserialize() : defaults.emissiveMap,
            aoMap: params.aoMap ? params.aoMap.Deserialize() : defaults.aoMap,
            doubleSided: params.doubleSided ? params.doubleSided : defaults.doubleSided,
            alphaCutoff: params.alphaCutoff ? params.alphaCutoff: defaults.alphaCutoff,
            unlit: params.unlit ? params.unlit: defaults.unlit,
            wireframe: params.wireframe ? params.wireframe: defaults.wireframe,
            isSkinned: params.isSkinned ? params.isSkinned: defaults.isSkinned,
        })
    }
}