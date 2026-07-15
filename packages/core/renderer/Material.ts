import { Vector2 } from "../math";
import { Color } from "../math/Color";
import { Assets } from "../Assets";
import { HideInInspector, Pool, SerializeField, UUID } from "../utils/";
import { Shader } from "./Shader";
import { ShaderLoader } from "./ShaderUtils";
import { Texture } from "./Texture";
import { TextureSampler } from "./TextureSampler";
import { RenderingPipeline } from "./RenderingPipeline";
import { Renderer } from "./Renderer";

export const MaterialPool = new Pool<Material>();

export enum CullMode {
    Back = "back",
    Front = "front",
    None = "none",
}

export class MaterialParams {
    @SerializeField public isDeferred?: boolean = false;
    @SerializeField(CullMode) public cullMode: CullMode = CullMode.Back;
    @SerializeField public defines: Record<string, boolean> = {};
    public shader?: Shader;
    public materialID?: number;
}

export abstract class Material<TParams extends MaterialParams = MaterialParams> {
    public static Registry = new Map<string, typeof Material>();

    public get name(): string {
        if (this.assetPath && !this.assetPath.startsWith("@builtin")) {
            const slash = this.assetPath.lastIndexOf("/");
            const dot = this.assetPath.lastIndexOf(".");
            return this.assetPath.slice(slash + 1, dot > slash ? dot : undefined);
        }
        return "Material";
    }

    public id = UUID();
    public static type = "@trident/core/renderer/Material";

    @SerializeField @HideInInspector public assetPath?: string;
    protected _shader: Shader;

    public get shader(): Shader {
        if (!this._shader && !this.pendingShaderCreation) this.createShader();
        return this._shader;
    }
    public set shader(shader: Shader) { this._shader = shader };

    // Public: mutate freely. The render loop syncs it — no Set/Apply.
    @SerializeField(MaterialParams) public params: TParams;
    public materialId: number;

    private pendingShaderCreation?: Promise<Shader>;
    private builtVariant?: string;
    private lastSync = -1;

    constructor(defaults: TParams, params?: Partial<TParams>) {
        this.materialId = MaterialPool.add(this);
        this.params = Object.assign(defaults, params);
        this.params.materialID = this.materialId;
    }

    // A material provides these two: how to build its shader, and how to push its params into it.
    protected abstract BuildShader(): Promise<Shader>;
    public abstract ReloadMaterial(): void;

    // The cull/defines signature the shader is compiled for.
    private variantKey(): string {
        return this.params.cullMode + "|" + JSON.stringify(this.params.defines);
    }

    // Runs once per frame via the shader's pre-render hook: recompile on variant change, then upload.
    private Sync(): void {
        if (this.lastSync === Renderer.info.frame) return;
        this.lastSync = Renderer.info.frame;

        if (this.variantKey() !== this.builtVariant && !this.pendingShaderCreation) this.createShader();
        this.ReloadMaterial();
    }

    private async createShader(): Promise<Shader> {
        if (this.pendingShaderCreation) return this.pendingShaderCreation;

        this.pendingShaderCreation = (async () => {
            const shader = await this.BuildShader();
            if (!shader) throw new Error(`${this.constructor.name}.BuildShader() returned no shader — material not fully configured`);
            shader.OnPreRender = () => { this.Sync(); return true; };

            const old = this._shader;   // build new, then swap — no gap
            this._shader = shader;
            this.builtVariant = this.variantKey();
            old?.Destroy();
            return shader;
        })();

        this.pendingShaderCreation.finally(() => (this.pendingShaderCreation = undefined));
        return this.pendingShaderCreation;
    }

    public Destroy() {
        if (this.assetPath && Assets.GetInstance(this.assetPath) === this) {
            Assets.RemoveInstance(this.assetPath);
        }
        if (this._shader) this._shader.Destroy();
        MaterialPool.remove(this.materialId);
    }

    public static Create(type: string, params?: any): Material {
        const Ctor = Material.Registry.get(type);
        if (!Ctor) throw new Error(`No material registered for type "${type}"`);
        return new (Ctor as any)(params);
    }
}

export class PBRMaterialParams extends MaterialParams {
    @SerializeField public isDeferred = true;
    @SerializeField public defines = { USE_SKINNING: false };

    @SerializeField public albedoColor = new Color(1, 1, 1, 1);
    @SerializeField public emissiveColor = new Color(0, 0, 0, 0);
    @SerializeField public roughness = 1.0;
    @SerializeField public metalness = 1.0;
    @SerializeField public unlit = false;
    @SerializeField public alphaCutoff = 0.5;
    @SerializeField public repeat = new Vector2(1, 1);
    @SerializeField public offset = new Vector2(0, 0);

    @SerializeField(Texture) public albedoMap: Texture = Texture.WhiteTexture;
    @SerializeField(Texture) public normalMap: Texture = Texture.NormalTexture;
    @SerializeField(Texture) public heightMap: Texture = Texture.BlackTexture;
    @SerializeField(Texture) public armMap: Texture = Texture.WhiteTexture;
    @SerializeField(Texture) public emissiveMap: Texture = Texture.WhiteTexture;
}

export class PBRMaterial extends Material<PBRMaterialParams> {
    public static type = "@trident/core/renderer/Material/PBRMaterial";
    private static sampler: TextureSampler;

    constructor(params?: Partial<PBRMaterialParams>) {
        super(new PBRMaterialParams(), { isDeferred: true, ...params });
        this.assetPath = "@builtin/material/pbr";
        if (!Assets.GetInstance("@builtin/material/pbr")) Assets.SetInstance("@builtin/material/pbr", this);
        if (!PBRMaterial.sampler) PBRMaterial.sampler = new TextureSampler({ maxAnisotropy: 4 });
    }

    protected async BuildShader(): Promise<Shader> {
        const shader = await Shader.Create({
            name: "PBRMaterial",
            code: await ShaderLoader.Draw,
            defines: this.params.defines,
            colorOutputs: Array(3).fill({ format: RenderingPipeline.GBufferFormat }),
            depthOutput: "depth24plus",
            cullMode: this.params.cullMode,
        });
        shader.SetSampler("TextureSampler", PBRMaterial.sampler);
        return shader;
    }

    public ReloadMaterial(): void {
        const s = this._shader;
        if (!s) return;
        const p = this.params;

        s.SetArray("material", new Float32Array([
            p.albedoColor.r, p.albedoColor.g, p.albedoColor.b, p.albedoColor.a,
            p.emissiveColor.r, p.emissiveColor.g, p.emissiveColor.b, p.emissiveColor.a,
            p.roughness, p.metalness, +p.unlit, p.alphaCutoff,
            p.repeat.x, p.repeat.y,
            p.offset.x, p.offset.y,
        ]));

        s.SetTexture("albedoMap", p.albedoMap);
        s.SetTexture("normalMap", p.normalMap);
        s.SetTexture("heightMap", p.heightMap);
        s.SetTexture("armMap", p.armMap);
        s.SetTexture("emissiveMap", p.emissiveMap);
    }
}

Material.Registry.set(PBRMaterial.type, PBRMaterial);

export class ShaderMaterial extends Material {
    public static type = "@trident/core/renderer/Material/ShaderMaterial";

    constructor(params: { shader: Shader } & Partial<MaterialParams>) {
        super(new MaterialParams(), params);
        this._shader = params.shader;
    }

    protected async BuildShader(): Promise<Shader> {
        return this._shader;
    }

    public ReloadMaterial(): void { }
}

Material.Registry.set(ShaderMaterial.type, ShaderMaterial);