import { Vector2 } from "../math";
import { Color } from "../math/Color";
import { Scene } from "../Scene";
import { UUID } from "../utils/";
import { Pool } from "../utils/Pool";
import { Shader, ShaderParams } from "./Shader";
import { ShaderLoader } from "./ShaderUtils";
import { Texture } from "./Texture";
import { TextureSampler } from "./TextureSampler";


export const MaterialPool = new Pool<Material>();

export interface MaterialParams {
    isDeferred: boolean;
    shader?: Shader;
    materialID?: number;
}

export class Material {
    public shader: Shader;
    public params: MaterialParams;
    public materialId: number;

    constructor(params?: Partial<MaterialParams>) {
        this.materialId = MaterialPool.add(this);

        const defaultParams: MaterialParams = {
            isDeferred: false,
            shader: undefined,
            materialID: this.materialId
        }
        this.params = Object.assign({}, defaultParams, params);
        this.shader = this.params.shader;
    }

    public Destroy() {
        if (this.shader) this.shader.Destroy();
        MaterialPool.remove(this.materialId);
    };

    public Serialize(metadata: any = {}) {
        return {
            shader: this.shader ? this.shader.Serialize(metadata) : undefined,
            isDeferred: this.params.isDeferred
        }
    }

    // TODO: Do cache
    public static Deserialize(data: { type: string, shader: any, isDeferred: boolean, params: any }): Material {
        if (data.type === "@trident/core/renderer/Material/PBRMaterial") {
            return PBRMaterial.Deserialize(data);
        }
    }

    public clone(): Material {
        return Material.Deserialize(this.Serialize());
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

    repeat?: Vector2;
    offset?: Vector2;

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
        albedoColor: new Color(1, 1, 1, 1),
        emissiveColor: new Color(0, 0, 0, 0),
        roughness: 0.5,
        metalness: 0,

        albedoMap: undefined,
        normalMap: undefined,
        heightMap: undefined,
        metalnessMap: undefined,
        emissiveMap: undefined,
        aoMap: undefined,

        repeat: new Vector2(1, 1),
        offset: new Vector2(0, 0),

        doubleSided: false,
        alphaCutoff: 0,
        unlit: false,

        wireframe: false,
        isSkinned: false,

        isDeferred: true,
    }
    constructor(params?: Partial<PBRMaterialParams>) {
        super(params);

        this.initialParams = params;
        // this.params = Object.assign({}, defaultParams, params);
        const _params = Object.assign({}, PBRMaterial.DefaultParams, params);
        const instance = this;
        const handler = {
            async set(obj, prop, value) {
                obj[prop] = value;

                if (!instance.shader) await instance.createShader();

                instance.shader.SetArray("material", new Float32Array([
                    this.params.albedoColor.r, this.params.albedoColor.g, this.params.albedoColor.b, this.params.albedoColor.a,
                    this.params.emissiveColor.r, this.params.emissiveColor.g, this.params.emissiveColor.b, this.params.emissiveColor.a,
                    this.params.roughness, this.params.metalness, +this.params.unlit, this.params.alphaCutoff,
                    this.params.repeat.x, this.params.repeat.y,
                    this.params.offset.x, this.params.offset.y,
                    +this.params.wireframe,
                    0, 0, 0
                ]));

                return true;
            },
        };
        this.params = new Proxy(_params, handler) as PBRMaterialParams;

        this.createShader();
    }

    private async createShader(): Promise<Shader> {
        const gbufferFormat = Scene.mainScene.renderPipeline.GBufferFormat;

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
            colorOutputs: [{ format: gbufferFormat }, { format: gbufferFormat }, { format: gbufferFormat }],
            depthOutput: "depth24plus",
            cullMode: this.params.doubleSided ? "none" : undefined,
        };

        const shader = await Shader.Create(shaderParams);

        if (DEFINES.USE_ALBEDO_MAP || DEFINES.USE_NORMAL_MAP || DEFINES.USE_HEIGHT_MAP || DEFINES.USE_METALNESS_MAP || DEFINES.USE_EMISSIVE_MAP || DEFINES.USE_AO_MAP) {
            const textureSampler = TextureSampler.Create();
            shader.SetSampler("TextureSampler", textureSampler);
        }

        shader.SetArray("material", new Float32Array([
            this.params.albedoColor.r, this.params.albedoColor.g, this.params.albedoColor.b, this.params.albedoColor.a,
            this.params.emissiveColor.r, this.params.emissiveColor.g, this.params.emissiveColor.b, this.params.emissiveColor.a,
            this.params.roughness, this.params.metalness, +this.params.unlit, this.params.alphaCutoff,
            this.params.repeat.x, this.params.repeat.y,
            this.params.offset.x, this.params.offset.y,
            +this.params.wireframe,
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

    public Serialize(metadata: any = {}): { shader: void; isDeferred: boolean, params: {} } {
        const params = this.params;
        return Object.assign(
            super.Serialize(metadata),
            {
                type: this.type,
                params: {
                    albedoColor: params.albedoColor.Serialize(),
                    emissiveColor: params.emissiveColor.Serialize(),
                    roughness: params.roughness,
                    metalness: params.metalness,
                    albedoMap: params.albedoMap ? params.albedoMap.Serialize(metadata) : undefined,
                    normalMap: params.normalMap ? params.normalMap.Serialize(metadata) : undefined,
                    heightMap: params.heightMap ? params.heightMap.Serialize(metadata) : undefined,
                    metalnessMap: params.metalnessMap ? params.metalnessMap.Serialize(metadata) : undefined,
                    emissiveMap: params.emissiveMap ? params.emissiveMap.Serialize(metadata) : undefined,
                    aoMap: params.aoMap ? params.aoMap.Serialize(metadata) : undefined,
                    doubleSided: params.doubleSided,
                    alphaCutoff: params.alphaCutoff,
                    unlit: params.unlit,
                    wireframe: params.wireframe,
                    isSkinned: params.isSkinned,
                }
            }
        );
    }

    // TODO: Do cache, process textures
    public static Deserialize(data: { type: string, shader: any, isDeferred: boolean, params: any }): PBRMaterial {
        const params = data.params;
        const defaults = PBRMaterial.DefaultParams;
        return new PBRMaterial({
            albedoColor: params.albedoColor ? new Color().Deserialize(params.albedoColor) : defaults.albedoColor,
            emissiveColor: params.emissiveColor ? new Color().Deserialize(params.emissiveColor) : defaults.emissiveColor,
            roughness: params.roughness ? params.roughness : defaults.roughness,
            metalness: params.metalness ? params.metalness : defaults.metalness,
            albedoMap: params.albedoMap ? Texture.Deserialize(params.albedoMap) : defaults.albedoMap,
            normalMap: params.normalMap ? Texture.Deserialize(params.normalMap) : defaults.normalMap,
            heightMap: params.heightMap ? Texture.Deserialize(params.heightMap) : defaults.heightMap,
            metalnessMap: params.metalnessMap ? Texture.Deserialize(params.metalnessMap) : defaults.metalnessMap,
            emissiveMap: params.emissiveMap ? Texture.Deserialize(params.emissiveMap) : defaults.emissiveMap,
            aoMap: params.aoMap ? Texture.Deserialize(params.aoMap) : defaults.aoMap,
            doubleSided: params.doubleSided ? params.doubleSided : defaults.doubleSided,
            alphaCutoff: params.alphaCutoff ? params.alphaCutoff : defaults.alphaCutoff,
            unlit: params.unlit ? params.unlit : defaults.unlit,
            wireframe: params.wireframe ? params.wireframe : defaults.wireframe,
            isSkinned: params.isSkinned ? params.isSkinned : defaults.isSkinned,
        })
    }
}