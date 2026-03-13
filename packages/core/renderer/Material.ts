import { Assets } from "../Assets";
import { Vector2 } from "../math";
import { Color } from "../math/Color";
import { Scene } from "../Scene";
import { SerializeField, UUID } from "../utils/";
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
    public name = "Material";

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

    public SerializeAsset() {
        return {
            type: Material.type,
            assetPath: this.assetPath,
            shader: this._shader ? this._shader.Serialize() : undefined,
            params: {
                isDeferred: this.params.isDeferred
            }
        }
    }

    public Serialize(metadata: any = {}) {
        if (this.assetPath) {
            return {
                type: Material.type,
                id: this.id,
                assetPath: this.assetPath,
            }
        }
        return this.SerializeAsset();
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

            Assets.Load(data.assetPath, "json").then(json => {
                material.Deserialize(json)
            });

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

class PBRMaterialParams extends MaterialParams {
    @SerializeField public albedoColor = new Color(1, 1, 1, 1);
    @SerializeField public emissiveColor = new Color(0, 0, 0, 0);
    @SerializeField public roughness = 1.0;
    @SerializeField public metalness = 0.0;

    @SerializeField(Texture) public albedoMap = undefined;
    @SerializeField(Texture) public normalMap = undefined;
    @SerializeField(Texture) public heightMap = undefined;
    @SerializeField(Texture) public armMap = undefined;
    @SerializeField(Texture) public emissiveMap = undefined;

    @SerializeField public repeat = new Vector2(1, 1);
    @SerializeField public offset = new Vector2(0, 0);

    @SerializeField public doubleSided = false;
    @SerializeField public alphaCutoff = 0.5;
    @SerializeField public unlit = false;
    @SerializeField public wireframe = false;
    @SerializeField public isSkinned = false;
    @SerializeField public isDeferred = true;

    private static dummyAlbedo: Texture;    // 1x1 white
    private static dummyNormal: Texture;    // 1x1 flat (128, 128, 255)
    private static dummyBlack: Texture;     // 1x1 black (for height, emissive)
    private static dummyARM: Texture;       // 1x1 (255, roughness_default, 0) or just white

    constructor() {
        super();

        if (!PBRMaterialParams.dummyAlbedo) PBRMaterialParams.InitDummies();

        this.albedoMap = PBRMaterialParams.dummyAlbedo;
        this.normalMap = PBRMaterialParams.dummyNormal;
        this.heightMap = PBRMaterialParams.dummyBlack;
        this.armMap = PBRMaterialParams.dummyARM;
        this.emissiveMap = PBRMaterialParams.dummyBlack;
    }
    
    public static InitDummies() {
        PBRMaterialParams.dummyAlbedo = Texture.Create(1, 1, 1, "bgra8unorm");
        PBRMaterialParams.dummyAlbedo.SetData(new Uint8Array([255, 255, 255, 255]), 4);

        PBRMaterialParams.dummyNormal = Texture.Create(1, 1, 1, "bgra8unorm");
        PBRMaterialParams.dummyNormal.SetData(new Uint8Array([255, 128, 128, 255]), 4); // BGRA flat normal

        PBRMaterialParams.dummyBlack = Texture.Create(1, 1, 1, "bgra8unorm");
        PBRMaterialParams.dummyBlack.SetData(new Uint8Array([0, 0, 0, 255]), 4);

        PBRMaterialParams.dummyARM = Texture.Create(1, 1, 1, "bgra8unorm");
        PBRMaterialParams.dummyARM.SetData(new Uint8Array([255, 255, 255, 255]), 4);
    }

    public Serialize() {
        const isValidTexture = (texture: Texture, dummyTexture: Texture) => {
            return texture && texture.assetPath && texture !== dummyTexture;
        }

        return {
            albedoColor: this.albedoColor.Serialize(),
            emissiveColor: this.emissiveColor.Serialize(),
            roughness: this.roughness,
            metalness: this.metalness,
            albedoMap: isValidTexture(this.albedoMap, PBRMaterialParams.dummyAlbedo) ? this.albedoMap.Serialize() : undefined,
            normalMap: isValidTexture(this.normalMap, PBRMaterialParams.dummyNormal) ? this.normalMap.Serialize() : undefined,
            heightMap: isValidTexture(this.heightMap, PBRMaterialParams.dummyBlack) ? this.heightMap.Serialize() : undefined,
            armMap: isValidTexture(this.armMap, PBRMaterialParams.dummyARM) ? this.armMap.Serialize() : undefined,
            emissiveMap: isValidTexture(this.emissiveMap, PBRMaterialParams.dummyBlack) ? this.emissiveMap.Serialize() : undefined,
            repeat: this.repeat.Serialize(),
            offset: this.offset.Serialize(),
            doubleSided: this.doubleSided,
            alphaCutoff: this.alphaCutoff,
            unlit: this.unlit,
            wireframe: this.wireframe,
            isSkinned: this.isSkinned,
            isDeferred: this.isDeferred
        }
    }

    public async Deserialize(data: any = {}) {
        this.albedoColor = new Color().Deserialize(data.albedoColor);
        this.emissiveColor = new Color().Deserialize(data.emissiveColor);
        this.roughness = data.roughness;
        this.metalness = data.metalness;
        if (data.albedoMap) this.albedoMap = await Texture.Deserialize(data.albedoMap);
        if (data.normalMap) this.normalMap = await Texture.Deserialize(data.normalMap);
        if (data.heightMap) this.heightMap = await Texture.Deserialize(data.heightMap);
        if (data.armMap) this.armMap = await Texture.Deserialize(data.armMap);
        if (data.emissiveMap) this.emissiveMap = await Texture.Deserialize(data.emissiveMap);
        this.doubleSided = data.doubleSided;
        this.alphaCutoff = data.alphaCutoff;
        this.unlit = data.unlit;
        this.wireframe = data.wireframe;
        this.isSkinned = data.isSkinned;
        this.isDeferred = data.isDeferred;
    }
}

export class PBRMaterial extends Material {
    public static type = "@trident/core/renderer/Material/PBRMaterial";
    public name = "PBRMaterial";

    private static sampler: TextureSampler;

    public params: PBRMaterialParams = new PBRMaterialParams();
    
    constructor(params?: Partial<PBRMaterialParams>) {
        super({ isDeferred: params?.isDeferred ?? true });

        Object.assign(this.params, params);

        if (!PBRMaterial.sampler) PBRMaterial.sampler = TextureSampler.Create();

        this.createShader();
    }

    private pendingShaderCreation?: Promise<Shader>;

    private async createShader() {
        if (this.pendingShaderCreation) return this.pendingShaderCreation;

        this.pendingShaderCreation = (async () => {
            const gbufferFormat = Scene.mainScene.renderPipeline.GBufferFormat;

            const defines = {
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

            shader.SetSampler("TextureSampler", PBRMaterial.sampler);

            this._shader = shader;

            const self = this;

            const handler = {
                set(obj, prop, value) {
                    obj[prop] = value;

                    if (prop === "doubleSided") {
                        self.shader.Destroy();
                        self.createShader();
                    }
                    else {
                        self.assignParameters();
                    }
                    return true;
                },

            }
            this.params = new Proxy(this.params, handler);

            this.assignParameters();
            return shader;
        })();

        return this.pendingShaderCreation;
    }

    private assignParameters() {
        this.shader.SetArray("material", new Float32Array([
            this.params.albedoColor.r, this.params.albedoColor.g, this.params.albedoColor.b, this.params.albedoColor.a,
            this.params.emissiveColor.r, this.params.emissiveColor.g, this.params.emissiveColor.b, this.params.emissiveColor.a,
            this.params.roughness, this.params.metalness, +this.params.unlit, this.params.alphaCutoff,
            this.params.repeat.x, this.params.repeat.y,
            this.params.offset.x, this.params.offset.y,
            +this.params.wireframe,
            0, 0, 0
        ]));

        this.shader.SetTexture("AlbedoMap", this.params.albedoMap);
        this.shader.SetTexture("NormalMap", this.params.normalMap);
        this.shader.SetTexture("HeightMap", this.params.heightMap);
        this.shader.SetTexture("ARMMap", this.params.armMap);
        this.shader.SetTexture("EmissiveMap", this.params.emissiveMap);
    }

    public SerializeAsset() {
        return {
            assetPath: this.assetPath,
            type: PBRMaterial.type,
            shader: undefined,
            params: this.params.Serialize()
        };
    }

    public Serialize(metadata: any = {}) {
        if (this.assetPath) {
            return {
                type: PBRMaterial.type,
                id: this.id,
                assetPath: this.assetPath,
            }
        }

        return this.SerializeAsset();
    }

    public async Deserialize(data: any) {
        this.params = new PBRMaterialParams();
        await this.params.Deserialize(data.params);

        this._shader?.Destroy();
        this.pendingShaderCreation = undefined;
        await this.createShader();
    }
}