import { Mathf } from "../";
import { Assets } from "../Assets";
import { HideInInspector, Pool, SerializeField, UUID } from "../utils/";
import { Shader } from "./Shader";
import { ShaderLoader } from "./ShaderUtils";
import { Texture } from "./Texture";
import { TextureSampler } from "./TextureSampler";
import { RenderingPipeline } from "./RenderingPipeline";
import { RendererContext } from "./RendererContext";

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

type TextureKeys<T> = { [K in keyof T]-?: NonNullable<T[K]> extends Texture ? K : never; }[keyof T];
type ColorKeys<T> = { [K in keyof T]-?: NonNullable<T[K]> extends Mathf.Color ? K : never; }[keyof T];
type Vector4Keys<T> = { [K in keyof T]-?: NonNullable<T[K]> extends Mathf.Vector4 ? K : never; }[keyof T];
type Vector3Keys<T> = { [K in keyof T]-?: NonNullable<T[K]> extends Mathf.Vector3 ? K : never; }[keyof T];
type Vector2Keys<T> = { [K in keyof T]-?: NonNullable<T[K]> extends Mathf.Vector2 ? K : never; }[keyof T];
type Matrix4Keys<T> = { [K in keyof T]-?: NonNullable<T[K]> extends Mathf.Matrix4 ? K : never; }[keyof T];
type QuaternionKeys<T> = { [K in keyof T]-?: NonNullable<T[K]> extends Mathf.Quaternion ? K : never; }[keyof T];
type ValueKeys<T> = { [K in keyof T]-?: NonNullable<T[K]> extends Number ? K : never; }[keyof T];
type BooleanKeys<T> = { [K in keyof T]-?: NonNullable<T[K]> extends Boolean ? K : never; }[keyof T];

export abstract class Material<TParams extends MaterialParams = MaterialParams> {
    public static type = "@trident/core/renderer/Material";
    public id = UUID();
    @SerializeField @HideInInspector public assetPath?: string;

    public static Registry = new Map<string, typeof Material>();

    public get name(): string {
        if (this.assetPath && !this.assetPath.startsWith("@builtin")) {
            const slash = this.assetPath.lastIndexOf("/");
            const dot = this.assetPath.lastIndexOf(".");
            return this.assetPath.slice(slash + 1, dot > slash ? dot : undefined);
        }
        return "Material";
    }

    @SerializeField(MaterialParams) public readonly params: TParams;
    public materialId: number;

    constructor(defaults: TParams, params?: Partial<TParams>) {
        this.materialId = MaterialPool.add(this);
        this.params = Object.assign(defaults, params);
        this.params.materialID = this.materialId;
    }

    // A material provides these two: how to build its shader, and how to push its params into it.
    protected abstract BuildShader(): Promise<Shader>;
    protected abstract ReloadMaterial(): void;

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

    public SetTexture<K extends TextureKeys<TParams>>(name: K, value: TParams[K]): void { this.params[name] = value; this.ReloadMaterial(); }
    public SetColor<K extends ColorKeys<TParams>>(name: K, value: TParams[K]): void { this.params[name] = value; this.ReloadMaterial(); }
    public SetVector4<K extends Vector4Keys<TParams>>(name: K, value: TParams[K]): void { this.params[name] = value; this.ReloadMaterial(); }
    public SetVector3<K extends Vector3Keys<TParams>>(name: K, value: TParams[K]): void { this.params[name] = value; this.ReloadMaterial(); }
    public SetVector2<K extends Vector2Keys<TParams>>(name: K, value: TParams[K]): void { this.params[name] = value; this.ReloadMaterial(); }
    public SetMatrix4<K extends Matrix4Keys<TParams>>(name: K, value: TParams[K]): void { this.params[name] = value; this.ReloadMaterial(); }
    public SetQuaternion<K extends QuaternionKeys<TParams>>(name: K, value: TParams[K]): void { this.params[name] = value; this.ReloadMaterial(); }
    public SetValue<K extends ValueKeys<TParams>>(name: K, value: TParams[K]): void { this.params[name] = value; this.ReloadMaterial(); }
    public SetBoolean<K extends BooleanKeys<TParams>>(name: K, value: TParams[K]): void { this.params[name] = value; this.ReloadMaterial(); }

    private pendingShaderCreation?: Promise<Shader>;
    protected _shader: Shader;
    public get shader(): Shader {
        const pass = RendererContext.activePass;
        if (pass) {
            const s = this.passShaders.get(pass.name);
            if (s && pass.buffers) for (const n in pass.buffers) if (s.HasProperty(n)) s.SetBuffer(n, pass.buffers[n]);
            return s as Shader;                    // undefined until built → draw path skips
        }
        if (!this._shader && !this.pendingShaderCreation) {
            if (this.pendingShaderCreation) return this.pendingShaderCreation;

            this.pendingShaderCreation = (async () => {
                const shader = await this.BuildShader();
                if (!shader) throw new Error(`${this.constructor.name}.BuildShader() returned no shader — material not fully configured`);
                const old = this._shader;
                this._shader = shader;
                old?.Destroy();

                this.ReloadMaterial();

                return shader;
            })();

            this.pendingShaderCreation.finally(() => (this.pendingShaderCreation = undefined));
        }
        return this._shader;
    }
    public set shader(shader: Shader) { this._shader = shader };

    private passShaders: Map<string, Shader> = new Map();

    public GetShader(pass?: string): Shader | undefined {
        return pass ? this.passShaders.get(pass) : this._shader;
    }

    public SetShader(pass: string, shader: Shader): void {
        this.passShaders.set(pass, shader);
        this.ReloadMaterial();          // push current params into the new shader
    }

    // Every shader this material owns — used when re-pushing params.
    protected *allShaders(): Iterable<Shader> {
        if (this._shader) yield this._shader;
        yield* this.passShaders.values();
    }
}

export class PBRMaterialParams extends MaterialParams {
    @SerializeField public isDeferred = true;
    @SerializeField public defines = { USE_SKINNING: false };

    @SerializeField public albedoColor = new Mathf.Color(1, 1, 1, 1);
    @SerializeField public emissiveColor = new Mathf.Color(0, 0, 0, 0);
    @SerializeField public roughness = 1.0;
    @SerializeField public metalness = 1.0;
    @SerializeField public unlit = false;
    @SerializeField public alphaCutoff = 0.5;
    @SerializeField public repeat = new Mathf.Vector2(1, 1);
    @SerializeField public offset = new Mathf.Vector2(0, 0);

    @SerializeField(Texture) public albedoMap: Texture = Texture.WhiteTexture;
    @SerializeField(Texture) public normalMap: Texture = Texture.NormalTexture;
    @SerializeField(Texture) public heightMap: Texture = Texture.BlackTexture;
    @SerializeField(Texture) public armMap: Texture = Texture.WhiteTexture;
    @SerializeField(Texture) public emissiveMap: Texture = Texture.WhiteTexture;
}

export class PBRMaterial extends Material<PBRMaterialParams> {
    public static type = "@trident/core/renderer/Material/PBRMaterial";
    public static sampler: TextureSampler;

    public static ShadowCode = `
          struct Material {
                AlbedoColor: vec4<f32>, EmissiveColor: vec4<f32>,
                Roughness: f32, Metalness: f32, Unlit: f32, AlphaCutoff: f32,
                RepeatOffset: vec4<f32>,
            };

            struct VertexInput {
                @builtin(instance_index) instance: u32,
                @location(0) position: vec3<f32>,
                @location(1) uv: vec2<f32>,
                #if USE_SKINNING
                    @location(2) joints: vec4<u32>,
                    @location(3) weights: vec4<f32>,
                #endif
            };
            struct VertexOutput {
                @builtin(position) position: vec4<f32>,
                @location(0) uv: vec2<f32>,
            };

            @group(0) @binding(0) var<storage, read> modelMatrix: array<mat4x4<f32>>;
            @group(0) @binding(1) var<storage, read> lightProjection: array<mat4x4<f32>, 4>;
            @group(0) @binding(2) var<storage, read> cascadeIndex: u32;
            @group(0) @binding(3) var<storage, read> material: Material;
            @group(0) @binding(4) var albedoMap: texture_2d<f32>;
            @group(0) @binding(5) var TextureSampler: sampler;
            #if USE_SKINNING
                @group(0) @binding(6) var<storage, read> boneMatrices: array<mat4x4<f32>>;
            #endif

            @vertex
            fn vertexMain(input: VertexInput) -> VertexOutput {
                var out: VertexOutput;
                var p = vec4(input.position, 1.0);
                #if USE_SKINNING
                    let skin = boneMatrices[input.joints.x] * input.weights.x
                            + boneMatrices[input.joints.y] * input.weights.y
                            + boneMatrices[input.joints.z] * input.weights.z
                            + boneMatrices[input.joints.w] * input.weights.w;
                    p = skin * p;
                #endif
                out.position = lightProjection[cascadeIndex] * modelMatrix[input.instance] * p;
                out.uv = input.uv * material.RepeatOffset.xy + material.RepeatOffset.zw;
                return out;
            }

            @fragment
            fn fragmentMain(in: VertexOutput) {
                let alpha = textureSample(albedoMap, TextureSampler, in.uv).a * material.AlbedoColor.a;
                if (alpha < material.AlphaCutoff) { discard; }
            }
      `;

    constructor(params?: Partial<PBRMaterialParams>) {
        super(new PBRMaterialParams(), { isDeferred: true, ...params });
        this.assetPath = "@builtin/material/pbr";
        if (!Assets.GetInstance("@builtin/material/pbr")) Assets.SetInstance("@builtin/material/pbr", this);
        if (!PBRMaterial.sampler) PBRMaterial.sampler = new TextureSampler({ maxAnisotropy: 4 });
    }

    protected async BuildShader(): Promise<Shader> {
        // Normal (GBuffer / lit) shader — the material's main shader
        const shader = await Shader.Create({
            name: "PBRMaterial",
            code: await ShaderLoader.Draw,
            defines: this.params.defines,
            colorOutputs: Array(3).fill({ format: RenderingPipeline.GBufferFormat }),
            depthOutput: "depth24plus",
            cullMode: this.params.cullMode,
        });
        shader.SetSampler("TextureSampler", PBRMaterial.sampler);

        const shadow = await Shader.Create({
            name: "PBRMaterial-Shadow",
            code: PBRMaterial.ShadowCode,
            defines: this.params.defines,
            colorOutputs: [],
            depthOutput: "depth24plus",
            cullMode: this.params.cullMode === "none" ? "none" : "front",
            depthBias: 1,
            depthBiasSlopeScale: 1,
        });
        shadow.SetSampler("TextureSampler", PBRMaterial.sampler);
        this.SetShader("ShadowCaster", shadow);

        return shader;
    }

    protected ReloadMaterial(): void {
        const p = this.params;
        const material = new Float32Array([
            p.albedoColor.r, p.albedoColor.g, p.albedoColor.b, p.albedoColor.a,
            p.emissiveColor.r, p.emissiveColor.g, p.emissiveColor.b, p.emissiveColor.a,
            p.roughness, p.metalness, +p.unlit, p.alphaCutoff,
            p.repeat.x, p.repeat.y, p.offset.x, p.offset.y,
        ]);
        for (const s of this.allShaders()) {
            if (s.HasProperty("material")) s.SetArray("material", material);
            if (s.HasProperty("albedoMap")) s.SetTexture("albedoMap", p.albedoMap);
            if (s.HasProperty("normalMap")) s.SetTexture("normalMap", p.normalMap);
            if (s.HasProperty("heightMap")) s.SetTexture("heightMap", p.heightMap);
            if (s.HasProperty("armMap")) s.SetTexture("armMap", p.armMap);
            if (s.HasProperty("emissiveMap")) s.SetTexture("emissiveMap", p.emissiveMap);
        }
    }
}

Material.Registry.set(PBRMaterial.type, PBRMaterial);

export class ShaderMaterial extends Material {
    public static type = "@trident/core/renderer/Material/ShaderMaterial";

    constructor(params: { shader: Shader } & Partial<MaterialParams>) {
        super(new MaterialParams(), params);
        this._shader = params.shader;


        Shader.Create({
            name: "PBRMaterial-Shadow",
            code: `
                struct VertexInput {
                    @builtin(instance_index) instance: u32,
                    @location(0) position: vec3<f32>,
                };
                @group(0) @binding(0) var<storage, read> modelMatrix: array<mat4x4<f32>>;
                @group(0) @binding(1) var<storage, read> lightProjection: array<mat4x4<f32>, 4>;
                @group(0) @binding(2) var<storage, read> cascadeIndex: u32;
                @vertex fn vertexMain(input: VertexInput) -> @builtin(position) vec4<f32> {
                    return lightProjection[cascadeIndex] * modelMatrix[input.instance] * vec4(input.position, 1.0);
                }
                @fragment fn fragmentMain() {}
            `,
            defines: this.params.defines,
            colorOutputs: [],
            depthOutput: "depth24plus",
            cullMode: "front",
            depthBias: 1,
            depthBiasSlopeScale: 1,
        }).then(shadowShader => {
            this.SetShader("ShadowCaster", shadowShader);
        })
    }

    protected async BuildShader(): Promise<Shader> {
        return this._shader;
    }

    protected ReloadMaterial(): void {
    }
}

Material.Registry.set(ShaderMaterial.type, ShaderMaterial);