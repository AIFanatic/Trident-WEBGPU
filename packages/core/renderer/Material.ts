import { Assets } from "../Assets";
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

export class MaterialParams {
    public isDeferred: boolean = false;
    public shader?: Shader;
    public materialID?: number;
}

export class Material {
    public static type = "@trident/core/renderer/Material";

    public assetPath?: string;
    protected _shader: Shader;
    public get shader(): Shader { return this._shader };
    public set shader(shader: Shader) { this._shader = shader };
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
        this._shader = this.params.shader;
    }

    public Destroy() {
        if (this._shader) this._shader.Destroy();
        MaterialPool.remove(this.materialId);
    };

    public static Create(type: string) {
        if (type === PBRMaterial.type) return new PBRMaterial();
        return new Material();
    }

    public Serialize(metadata: any = {}) {
        return {
            shader: this._shader ? this._shader.Serialize(metadata) : undefined,
            isDeferred: this.params.isDeferred
        }
    }

    public Deserialize(data) {
        this.params.isDeferred = data.isDeferred;
    }

    public static Deserialize(data): Material {
        if (data.assetPath) {
            const instance = Assets.GetInstance(data.assetPath);
            if (instance) return instance;
            // Store instance immediately because async Load
            const material = Material.Create(data.type);
            material.assetPath = data.asset_path;
            Assets.SetInstance(data.asset_path, material);

            Assets.Load(data.assetPath, "json").then(json => { material.Deserialize(json) });
            
            return material;
        }
        const material = Material.Create(data.type);
        material.Deserialize(data);
        
        return material;
    }

    public clone(): Material {
        const material = new Material();
        material.Deserialize(this.Serialize());
        return material;
    }
}
export class PBRMaterial extends Material {
    public static type = "@trident/core/renderer/Material/PBRMaterial";
    public id = UUID();

    // Parameters directly in class
    public albedoColor = new Color(1, 1, 1, 1);
    public emissiveColor = new Color(0, 0, 0, 0);
    public roughness = 0.5;
    public metalness = 0;

    public albedoMap?: Texture;
    public normalMap?: Texture;
    public heightMap?: Texture;
    public armMap?: Texture;
    public emissiveMap?: Texture;

    public repeat = new Vector2(1, 1);
    public offset = new Vector2(0, 0);

    public doubleSided = false;
    public alphaCutoff = 0;
    public unlit = false;
    public wireframe = false;
    public isSkinned = false;
    public isDeferred = true;

    constructor(params?: Partial<PBRMaterialParams>) {
        super({ isDeferred: params?.isDeferred ?? true });
        Object.assign(this, params);
        this.createShader();
    }

    private pendingShaderCreation?: Promise<Shader>;

    private async createShader() {
        if (this.pendingShaderCreation) return this.pendingShaderCreation;

        this.pendingShaderCreation = (async () => {
            const gbufferFormat = Scene.mainScene.renderPipeline.GBufferFormat;

            const defines = {
                USE_ALBEDO_MAP: !!this.albedoMap,
                USE_NORMAL_MAP: !!this.normalMap,
                USE_HEIGHT_MAP: !!this.heightMap,
                USE_ARM_MAP: !!this.armMap,
                USE_EMISSIVE_MAP: !!this.emissiveMap,
                USE_SKINNING: !!this.isSkinned
            };

            const shaderParams: ShaderParams = {
                code: await ShaderLoader.Draw,
                defines,
                colorOutputs: Array(3).fill({ format: gbufferFormat }),
                depthOutput: "depth24plus",
                cullMode: this.doubleSided ? "none" : undefined
            };

            const shader = await Shader.Create(shaderParams);

            if (Object.values(defines).some(v => v)) {
                shader.SetSampler("TextureSampler", TextureSampler.Create());
            }

            shader.SetArray("material", new Float32Array([
                this.albedoColor.r, this.albedoColor.g, this.albedoColor.b, this.albedoColor.a,
                this.emissiveColor.r, this.emissiveColor.g, this.emissiveColor.b, this.emissiveColor.a,
                this.roughness, this.metalness, +this.unlit, this.alphaCutoff,
                this.repeat.x, this.repeat.y,
                this.offset.x, this.offset.y,
                +this.wireframe,
                0, 0, 0
            ]));

            if (this.albedoMap) shader.SetTexture("AlbedoMap", this.albedoMap);
            if (this.normalMap) shader.SetTexture("NormalMap", this.normalMap);
            if (this.heightMap) shader.SetTexture("HeightMap", this.heightMap);
            if (this.armMap) shader.SetTexture("ARMMap", this.armMap);
            if (this.emissiveMap) shader.SetTexture("EmissiveMap", this.emissiveMap);

            this._shader = shader;
            return shader;
        })();

        return this.pendingShaderCreation;
    }

    public Serialize(metadata: any = {}) {
        return {
            type: PBRMaterial.type,
            params: {
                albedoColor: this.albedoColor.Serialize(),
                emissiveColor: this.emissiveColor.Serialize(),
                roughness: this.roughness,
                metalness: this.metalness,
                albedoMap: this.albedoMap?.Serialize(metadata),
                normalMap: this.normalMap?.Serialize(metadata),
                heightMap: this.heightMap?.Serialize(metadata),
                armMap: this.armMap?.Serialize(metadata),
                emissiveMap: this.emissiveMap?.Serialize(metadata),
                repeat: this.repeat.Serialize(),
                offset: this.offset.Serialize(),
                doubleSided: this.doubleSided,
                alphaCutoff: this.alphaCutoff,
                unlit: this.unlit,
                wireframe: this.wireframe,
                isSkinned: this.isSkinned,
                isDeferred: this.isDeferred
            }
        };
    }

    public async Deserialize(data: any) {
        const p = data.params;
        this.albedoColor = new Color().Deserialize(p.albedoColor);
        this.emissiveColor = new Color().Deserialize(p.emissiveColor);
        this.roughness = p.roughness;
        this.metalness = p.metalness;
        this.albedoMap = p.albedoMap && await Texture.Deserialize(p.albedoMap);
        this.normalMap = p.normalMap && await Texture.Deserialize(p.normalMap);
        this.heightMap = p.heightMap && await Texture.Deserialize(p.heightMap);
        this.armMap = p.armMap && await Texture.Deserialize(p.armMap);
        this.emissiveMap = p.emissiveMap && await Texture.Deserialize(p.emissiveMap);
        this.doubleSided = p.doubleSided;
        this.alphaCutoff = p.alphaCutoff;
        this.unlit = p.unlit;
        this.wireframe = p.wireframe;
        this.isSkinned = p.isSkinned;
        this.isDeferred = p.isDeferred;

        this._shader?.Destroy();
        this.pendingShaderCreation = undefined;
        await this.createShader();
    }
}