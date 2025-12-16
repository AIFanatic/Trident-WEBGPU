import { Geometry } from "../Geometry";
import { Matrix4 } from "../math/Matrix4";
import { Vector2 } from "../math/Vector2";
import { Vector3 } from "../math/Vector3";
import { Vector4 } from "../math/Vector4";
import { Buffer, DynamicBuffer } from "./Buffer";
import { Renderer } from "./Renderer";
import { ShaderPreprocessor } from "./ShaderUtils";
import { DepthTexture, RenderTexture, Texture, TextureFormat } from "./Texture";
import { TextureSampler } from "./TextureSampler";
import { ReflectWGSL } from "./webgpu/utils/WGSLReflection";
import { WEBGPUComputeShader } from "./webgpu/WEBGPUComputeShader";
import { WEBGPUShader } from "./webgpu/WEBGPUShader";

export type BlendMode = 'opaque' | 'alpha' | 'premultiplied' | 'add';

export interface ShaderColorOutput {
    format: TextureFormat;
    blendMode?: BlendMode;
};

export interface ShaderAttribute {
    location: number;
    size: number;
    type: "vec2" | "vec3" | "vec4" | "mat4" | "vec2u" | "vec3u" | "vec4u"
};

export interface ShaderUniform {
    group: number;
    binding: number;
    type: "uniform" | "storage" | "storage-write" | "texture" | "sampler" | "sampler-compare" | "sampler-non-filterable" | "depthTexture";
};

export enum Topology {
    Triangles = "triangle-list",
    Points = "point-list",
    Lines = "line-list"
}

export type DepthCompareFunctions =

| "never"
| "less"
| "equal"
| "less-equal"
| "greater"
| "not-equal"
| "greater-equal"
| "always";

export interface ShaderParams {
    code: string;
    name?: string;
    defines?: {[key: string]: boolean};
    attributes?: {[key: string]: ShaderAttribute};
    uniforms?: {[key: string]: ShaderUniform};
    vertexEntrypoint?: string;
    fragmentEntrypoint?: string;
    colorOutputs: ShaderColorOutput[];
    depthOutput?: TextureFormat;
    depthCompare?: DepthCompareFunctions;
    depthBias?: number;
    depthBiasSlopeScale?: number;
    depthBiasClamp?: number;
    depthWriteEnabled?: boolean;
    topology?: Topology;
    frontFace?: "ccw" | "cw";
    cullMode?: "back" | "front" | "none";
};

export interface ComputeShaderParams {
    code: string;
    name?: string;
    defines?: {[key: string]: boolean};
    uniforms?: {[key: string]: ShaderUniform};
    computeEntrypoint?: string;
};

export class BaseShader {
    public readonly id: string;
    public readonly params: ShaderParams | ComputeShaderParams;

    protected constructor() {};

    public SetValue(name: string, value: number) {}
    public SetMatrix4(name: string, matrix: Matrix4) {}
    public SetVector2(name: string, vector: Vector2) {}
    public SetVector3(name: string, vector: Vector3) {}
    public SetVector4(name: string, vector: Vector4) {}
    public SetArray(name: string, array: ArrayBufferView, bufferOffset?: number, dataOffset?: number | undefined, size?: number | undefined) {}
    public SetTexture(name: string, texture: Texture | DepthTexture | RenderTexture) {}
    public SetSampler(name: string, texture: TextureSampler) {}
    public SetBuffer(name: string, buffer: Buffer | DynamicBuffer) {}
    public HasBuffer(name: string): boolean { return false }

    public OnPreRender(geometry: Geometry): boolean { return true; };
    public Destroy() {};

    public Serialize(metadata: any = {}) { throw Error("Called deserialize on BaseShader")};
}

export class Shader extends BaseShader {
    declare public readonly id: string;
    declare public readonly params: ShaderParams;

    public static async Create(params: ShaderParams): Promise<Shader> {
        params.code = await ShaderPreprocessor.ProcessIncludesV2(params.code);
        const reflectionSource = params.defines ? ShaderPreprocessor.ProcessDefines(params.code, params.defines) : params.code;
        const reflection = ReflectWGSL(reflectionSource, params.vertexEntrypoint ?? "vertexMain");
        if (!params.attributes) params.attributes = reflection.attributes;
        if (!params.uniforms) params.uniforms = reflection.uniforms;
        else for (const [name, uniform] of Object.entries(reflection.uniforms)) if (!params.uniforms[name]) params.uniforms[name] = uniform;
        if (Renderer.type === "webgpu") return new WEBGPUShader(params);
        throw Error("Unknown api");
    }
}

export class Compute extends BaseShader {
    declare public readonly params: ComputeShaderParams;

    /**
     * @example
     * ```js
     * const = await GPU.Compute.Create({
     *     code: `
     *         @compute @workgroup_size(8, 8, 1)
     *         fn main(@builtin(global_invocation_id) grid: vec3<u32>) {
     *         }
     *     `,
     *     computeEntrypoint: "main",
     *     uniforms: {
     *         drawBuffer: {group: 0, binding: 0, type: "storage-write"}
     *     }
     * })
     * ```
     */
    public static async Create(params: ComputeShaderParams): Promise<Compute> {
        params.code = await ShaderPreprocessor.ProcessIncludesV2(params.code);
        const reflectionSource = params.defines ? ShaderPreprocessor.ProcessDefines(params.code, params.defines) : params.code;
        const reflection = ReflectWGSL(reflectionSource);
        if (!params.uniforms) params.uniforms = reflection.uniforms;
        else for (const [name, uniform] of Object.entries(reflection.uniforms)) if (!params.uniforms[name]) params.uniforms[name] = uniform;
        if (Renderer.type === "webgpu") return new WEBGPUComputeShader(params);
        throw Error("Unknown api");
    }
}