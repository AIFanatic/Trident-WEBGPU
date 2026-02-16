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
    public isDeferred?: boolean = false;
    public shader?: Shader;
    public materialID?: number;
}

export class Material {
    public id = UUID();
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
        if (this.assetPath) {
            return {
                id: this.id,
                assetPath: this.assetPath,
            }
        }

        return {
            shader: this._shader ? this._shader.Serialize(metadata) : undefined,
            params: {
                isDeferred: this.params.isDeferred
            }
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
            material.assetPath = data.assetPath;
            Assets.SetInstance(data.assetPath, material);

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

interface PBRMaterialParams extends MaterialParams {
    albedoColor?: Color;
    emissiveColor?: Color;
    roughness?: number;
    metalness?: number;

    albedoMap?: Texture;
    normalMap?: Texture;
    heightMap?: Texture;
    armMap?: Texture;
    emissiveMap?: Texture;

    repeat?: Vector2;
    offset?: Vector2;

    doubleSided?: boolean;
    alphaCutoff?: number;
    unlit?: boolean;
    wireframe?: boolean;
    isSkinned?: boolean;
};

export class PBRMaterial extends Material {
    public static type = "@trident/core/renderer/Material/PBRMaterial";

    public params = {
        albedoColor: new Color(1, 1, 1, 1),
        emissiveColor: new Color(0, 0, 0, 0),
        roughness: 1.0,
        metalness: 0.0,
    
        albedoMap: undefined,
        normalMap: undefined,
        heightMap: undefined,
        armMap: undefined,
        emissiveMap: undefined,
    
        repeat: new Vector2(1, 1),
        offset: new Vector2(0, 0),
    
        doubleSided: false,
        alphaCutoff: 0.5,
        unlit: false,
        wireframe: false,
        isSkinned: false,
        isDeferred: true,
    }

    constructor(params?: Partial<PBRMaterialParams>) {
        super({ isDeferred: params?.isDeferred ?? true });
        Object.assign(this.params, params);
        this.createShader();
    }

    private pendingShaderCreation?: Promise<Shader>;

    private async createShader() {
        if (this.pendingShaderCreation) return this.pendingShaderCreation;

        this.pendingShaderCreation = (async () => {
            const gbufferFormat = Scene.mainScene.renderPipeline.GBufferFormat;

            const defines = {
                USE_ALBEDO_MAP: !!this.params.albedoMap,
                USE_NORMAL_MAP: !!this.params.normalMap,
                USE_HEIGHT_MAP: !!this.params.heightMap,
                USE_ARM_MAP: !!this.params.armMap,
                USE_EMISSIVE_MAP: !!this.params.emissiveMap,
                USE_SKINNING: !!this.params.isSkinned
            };

            const shaderParams: ShaderParams = {
                code: await ShaderLoader.Draw,
                defines,
                colorOutputs: Array(3).fill({ format: gbufferFormat }),
                depthOutput: "depth24plus",
                cullMode: this.params.doubleSided === true ? "none" : "back",
            };

            const shader = await Shader.Create(shaderParams);

            if (Object.values(defines).some(v => v)) {
                shader.SetSampler("TextureSampler", TextureSampler.Create());
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

            if (this.params.albedoMap) shader.SetTexture("AlbedoMap", this.params.albedoMap);
            if (this.params.normalMap) shader.SetTexture("NormalMap", this.params.normalMap);
            if (this.params.heightMap) shader.SetTexture("HeightMap", this.params.heightMap);
            if (this.params.armMap) shader.SetTexture("ARMMap", this.params.armMap);
            if (this.params.emissiveMap) shader.SetTexture("EmissiveMap", this.params.emissiveMap);

            this._shader = shader;
            return shader;
        })();

        return this.pendingShaderCreation;
    }

    public Serialize(metadata: any = {}) {
        if (this.assetPath) {
            return {
                id: this.id,
                assetPath: this.assetPath,
            }
        }

        return {
            type: PBRMaterial.type,
            shader: undefined,
            params: {
                albedoColor: this.params.albedoColor.Serialize(),
                emissiveColor: this.params.emissiveColor.Serialize(),
                roughness: this.params.roughness,
                metalness: this.params.metalness,
                albedoMap: this.params.albedoMap?.Serialize(metadata),
                normalMap: this.params.normalMap?.Serialize(metadata),
                heightMap: this.params.heightMap?.Serialize(metadata),
                armMap: this.params.armMap?.Serialize(metadata),
                emissiveMap: this.params.emissiveMap?.Serialize(metadata),
                repeat: this.params.repeat.Serialize(),
                offset: this.params.offset.Serialize(),
                doubleSided: this.params.doubleSided,
                alphaCutoff: this.params.alphaCutoff,
                unlit: this.params.unlit,
                wireframe: this.params.wireframe,
                isSkinned: this.params.isSkinned,
                isDeferred: this.params.isDeferred
            }
        };
    }

    public async Deserialize(data: any) {
        const p = data.params;
        this.params.albedoColor = new Color().Deserialize(p.albedoColor);
        this.params.emissiveColor = new Color().Deserialize(p.emissiveColor);
        this.params.roughness = p.roughness;
        this.params.metalness = p.metalness;
        this.params.albedoMap = p.albedoMap && await Texture.Deserialize(p.albedoMap);
        this.params.normalMap = p.normalMap && await Texture.Deserialize(p.normalMap);
        this.params.heightMap = p.heightMap && await Texture.Deserialize(p.heightMap);
        this.params.armMap = p.armMap && await Texture.Deserialize(p.armMap);
        this.params.emissiveMap = p.emissiveMap && await Texture.Deserialize(p.emissiveMap);
        this.params.doubleSided = p.doubleSided;
        this.params.alphaCutoff = p.alphaCutoff;
        this.params.unlit = p.unlit;
        this.params.wireframe = p.wireframe;
        this.params.isSkinned = p.isSkinned;
        this.params.isDeferred = p.isDeferred;

        this._shader?.Destroy();
        this.pendingShaderCreation = undefined;
        await this.createShader();
    }
}