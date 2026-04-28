import { Vector2 } from "../math";
import { Color } from "../math/Color";
import { Assets } from "../Assets";
import { SerializeField, UUID } from "../utils/";
import { Pool } from "../utils/Pool";
import { Shader, ShaderParams } from "./Shader";
import { ShaderLoader } from "./ShaderUtils";
import { Texture } from "./Texture";
import { TextureSampler } from "./TextureSampler";
import { RenderingPipeline } from "./RenderingPipeline";

export const MaterialPool = new Pool<Material>();

export class MaterialParams {
    @SerializeField public isDeferred?: boolean = false;
    public shader?: Shader;
    public materialID?: number;
}

export class Material {
    public name = "Material";

    public id = UUID();
    public static type = "@trident/core/renderer/Material";

    @SerializeField public assetPath?: string;
    protected _shader: Shader;
    public get shader(): Shader { return this._shader };
    public set shader(shader: Shader) { this._shader = shader };
    @SerializeField public params: MaterialParams;
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
        if (this.assetPath && Assets.GetInstance(this.assetPath) === this) return;

        if (this._shader) this._shader.Destroy();
        MaterialPool.remove(this.materialId);
    };

    public static Create(type: string, params?: any) {
        if (type === PBRMaterial.type) return new PBRMaterial(params);
        return new Material(params);
    }
}

class PBRMaterialParams extends MaterialParams {
    @SerializeField public albedoColor = new Color(1, 1, 1, 1);
    @SerializeField public emissiveColor = new Color(0, 0, 0, 0);
    @SerializeField public roughness = 1.0;
    @SerializeField public metalness = 0.0;

    @SerializeField(Texture) public albedoMap: Texture;
    @SerializeField(Texture) public normalMap: Texture;
    @SerializeField(Texture) public heightMap: Texture;
    @SerializeField(Texture) public armMap: Texture;
    @SerializeField(Texture) public emissiveMap: Texture;

    @SerializeField public repeat = new Vector2(1, 1);
    @SerializeField public offset = new Vector2(0, 0);

    @SerializeField public doubleSided = false;
    @SerializeField public alphaCutoff = 0.5;
    @SerializeField public unlit = false;
    @SerializeField public isSkinned = false;
    @SerializeField public isDeferred = true;

    private static dummyAlbedo: Texture;    // 1x1 white
    private static dummyNormal: Texture;    // 1x1 flat (128, 128, 255)
    private static dummyBlack: Texture;     // 1x1 black (for height, emissive)
    private static dummyWhite: Texture;     // 1x1 black (for height, emissive)
    private static dummyARM: Texture;       // 1x1 (255, roughness_default, 0) or just white

    constructor() {
        super();

        if (!PBRMaterialParams.dummyAlbedo) PBRMaterialParams.InitDummies();

        this.albedoMap = PBRMaterialParams.dummyAlbedo;
        this.normalMap = PBRMaterialParams.dummyNormal;
        this.heightMap = PBRMaterialParams.dummyBlack;
        this.armMap = PBRMaterialParams.dummyARM;
        this.emissiveMap = PBRMaterialParams.dummyWhite;
    }
    
    public static InitDummies() {
        PBRMaterialParams.dummyAlbedo = Texture.Create(1, 1, 1, "bgra8unorm");
        PBRMaterialParams.dummyAlbedo.SetData(new Uint8Array([255, 255, 255, 255]), 4);

        PBRMaterialParams.dummyNormal = Texture.Create(1, 1, 1, "bgra8unorm");
        PBRMaterialParams.dummyNormal.SetData(new Uint8Array([255, 128, 128, 255]), 4); // BGRA flat normal

        PBRMaterialParams.dummyBlack = Texture.Create(1, 1, 1, "bgra8unorm");
        PBRMaterialParams.dummyBlack.SetData(new Uint8Array([0, 0, 0, 255]), 4);

        PBRMaterialParams.dummyWhite = Texture.Create(1, 1, 1, "bgra8unorm");
        PBRMaterialParams.dummyWhite.SetData(new Uint8Array([255, 255, 255, 255]), 4);

        PBRMaterialParams.dummyARM = Texture.Create(1, 1, 1, "bgra8unorm");
        PBRMaterialParams.dummyARM.SetData(new Uint8Array([255, 255, 255, 255]), 4);
    }

}

export class PBRMaterial extends Material {
    public static type = "@trident/core/renderer/Material/PBRMaterial";
    public name = "PBRMaterial";

    private static sampler: TextureSampler;

    public params: PBRMaterialParams = new PBRMaterialParams();
    
    constructor(params?: Partial<PBRMaterialParams>) {
        super({ isDeferred: params?.isDeferred ?? true });
        this.assetPath = "@builtin/material/pbr";

        if (!Assets.GetInstance("@builtin/material/pbr")) {
            Assets.SetInstance("@builtin/material/pbr", this);
        }

        Object.assign(this.params, params);

        if (!PBRMaterial.sampler) PBRMaterial.sampler = new TextureSampler();

        this.createShader();
    }

    private pendingShaderCreation?: Promise<Shader>;

    private async createShader() {
        if (this.pendingShaderCreation) return this.pendingShaderCreation;

        this.pendingShaderCreation = (async () => {
            const gbufferFormat = RenderingPipeline.GBufferFormat;

            const defines = {
                USE_SKINNING: !!this.params.isSkinned
            };

            const shader = await Shader.Create({
                name: "PBRMaterial",
                code: await ShaderLoader.Draw,
                defines,
                colorOutputs: Array(3).fill({ format: gbufferFormat }),
                depthOutput: "depth24plus",
                cullMode: this.params.doubleSided === true ? "none" : "back",
            });

            shader.SetSampler("TextureSampler", PBRMaterial.sampler);

            this._shader = shader;

            const self = this;

            const handler = {
                set(obj, prop, value) {
                    obj[prop] = value;

                    if (prop === "doubleSided" || prop === "isSkinned") {
                        self.shader.Destroy();
                        self.shader = undefined;
                        self.pendingShaderCreation = undefined;
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
        ]));

        this.shader.SetTexture("AlbedoMap", this.params.albedoMap);
        this.shader.SetTexture("NormalMap", this.params.normalMap);
        this.shader.SetTexture("HeightMap", this.params.heightMap);
        this.shader.SetTexture("ARMMap", this.params.armMap);
        this.shader.SetTexture("EmissiveMap", this.params.emissiveMap);
    }
}
