import { Geometry } from "../Geometry";
import { Matrix4 } from "../math/Matrix4";
import { Vector2 } from "../math/Vector2";
import { Vector3 } from "../math/Vector3";
import { Vector4 } from "../math/Vector4";
import { Buffer, DynamicBuffer } from "./Buffer";
import { DepthTexture, RenderTexture, Texture, TextureFormat } from "./Texture";
import { TextureSampler } from "./TextureSampler";
export interface ShaderColorOutput {
    format: TextureFormat;
}
export interface ShaderAttribute {
    location: number;
    size: number;
    type: "vec2" | "vec3" | "vec4" | "mat4";
}
export interface ShaderUniform {
    group: number;
    binding: number;
    type: "uniform" | "storage" | "storage-write" | "texture" | "sampler" | "sampler-compare" | "sampler-non-filterable" | "depthTexture";
}
export declare enum Topology {
    Triangles = "triangle-list",
    Points = "point-list",
    Lines = "line-list"
}
export type DepthCompareFunctions = "never" | "less" | "equal" | "less-equal" | "greater" | "not-equal" | "greater-equal" | "always";
export interface ShaderParams {
    code: string;
    defines?: {
        [key: string]: boolean;
    };
    attributes?: {
        [key: string]: ShaderAttribute;
    };
    uniforms?: {
        [key: string]: ShaderUniform;
    };
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
}
export interface ComputeShaderParams {
    code: string;
    defines?: {
        [key: string]: boolean;
    };
    uniforms?: {
        [key: string]: ShaderUniform;
    };
    computeEntrypoint?: string;
}
export declare class BaseShader {
    readonly id: string;
    readonly params: ShaderParams | ComputeShaderParams;
    protected constructor();
    SetValue(name: string, value: number): void;
    SetMatrix4(name: string, matrix: Matrix4): void;
    SetVector2(name: string, vector: Vector2): void;
    SetVector3(name: string, vector: Vector3): void;
    SetVector4(name: string, vector: Vector4): void;
    SetArray(name: string, array: ArrayBuffer, bufferOffset?: number, dataOffset?: number | undefined, size?: number | undefined): void;
    SetTexture(name: string, texture: Texture | DepthTexture | RenderTexture): void;
    SetSampler(name: string, texture: TextureSampler): void;
    SetBuffer(name: string, buffer: Buffer | DynamicBuffer): void;
    HasBuffer(name: string): boolean;
    OnPreRender(geometry: Geometry): boolean;
}
export declare class Shader extends BaseShader {
    readonly id: string;
    readonly params: ShaderParams;
    static Create(params: ShaderParams): Promise<Shader>;
}
export declare class Compute extends BaseShader {
    readonly params: ComputeShaderParams;
    static Create(params: ComputeShaderParams): Promise<Compute>;
}
//# sourceMappingURL=Shader.d.ts.map