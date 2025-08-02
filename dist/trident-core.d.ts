declare module "EngineDebug" {
    class _EngineDebug {
    }
    export const EngineDebug: _EngineDebug;
}
declare module "Events" {
    export class EventSystem {
        private static events;
        static on<N>(event: N, callback: typeof event): void;
        static emit<N>(event: N, ...args: N extends (...args: infer P) => void ? P : never): void;
    }
    export class EventSystemLocal {
        private static events;
        static on<N>(event: N, localId: any, callback: typeof event): void;
        static emit<N>(event: N, localId: any, ...args: N extends (...args: infer P) => void ? P : never): void;
    }
}
declare module "utils/Utils" {
    export class Utils {
        static UUID(): string;
        static StringFindAllBetween(source: string, start: string, end: string, exclusive?: boolean): string[];
    }
}
declare module "math/Vector3" {
    import { Matrix4 } from "math/Matrix4";
    import { Quaternion } from "math/Quaternion";
    export class Vector3 {
        _x: number;
        _y: number;
        _z: number;
        get x(): number;
        get y(): number;
        get z(): number;
        set x(v: number);
        set y(v: number);
        set z(v: number);
        private _elements;
        get elements(): Float32Array;
        constructor(x?: number, y?: number, z?: number);
        set(x: number, y: number, z: number): Vector3;
        setX(x: number): Vector3;
        setY(y: number): Vector3;
        setZ(z: number): Vector3;
        clone(): Vector3;
        copy(v: Vector3): Vector3;
        mul(v: Vector3 | number): Vector3;
        div(v: Vector3 | number): Vector3;
        add(v: Vector3 | number): Vector3;
        sub(v: Vector3 | number): Vector3;
        subVectors(a: Vector3, b: Vector3): Vector3;
        applyQuaternion(q: Quaternion): Vector3;
        length(): number;
        lengthSq(): number;
        normalize(): Vector3;
        distanceTo(v: Vector3): number;
        distanceToSquared(v: Vector3): number;
        dot(v: Vector3): number;
        cross(v: Vector3): Vector3;
        crossVectors(a: Vector3, b: Vector3): Vector3;
        applyMatrix4(m: Matrix4): Vector3;
        min(v: Vector3): Vector3;
        max(v: Vector3): Vector3;
        lerp(v: Vector3, t: number): Vector3;
        setFromSphericalCoords(radius: number, phi: number, theta: number): this;
        setFromMatrixPosition(m: Matrix4): Vector3;
        equals(v: Vector3): boolean;
        abs(): Vector3;
        sign(): Vector3;
        transformDirection(m: Matrix4): Vector3;
        toString(): string;
        static fromArray(array: number[]): Vector3;
    }
    export class ObservableVector3 extends Vector3 {
        private onChange;
        get x(): number;
        get y(): number;
        get z(): number;
        set x(value: number);
        set y(value: number);
        set z(value: number);
        constructor(onChange: () => void, x?: number, y?: number, z?: number);
    }
}
declare module "math/Quaternion" {
    import { Matrix4 } from "math/Matrix4";
    import { Vector3 } from "math/Vector3";
    export class Quaternion {
        private _a;
        private _b;
        private _c;
        _x: number;
        _y: number;
        _z: number;
        _w: number;
        get x(): number;
        get y(): number;
        get z(): number;
        get w(): number;
        set x(v: number);
        set y(v: number);
        set z(v: number);
        set w(v: number);
        private _elements;
        get elements(): Float32Array;
        constructor(x?: number, y?: number, z?: number, w?: number);
        equals(v: Quaternion): boolean;
        set(x: number, y: number, z: number, w: number): Quaternion;
        clone(): Quaternion;
        copy(quaternion: Quaternion): Quaternion;
        fromEuler(euler: Vector3, inDegrees?: boolean): Quaternion;
        toEuler(out?: Vector3, inDegrees?: boolean): Vector3;
        mul(b: Quaternion): Quaternion;
        lookAt(eye: Vector3, target: Vector3, up: Vector3): Quaternion;
        setFromAxisAngle(axis: Vector3, angle: number): Quaternion;
        setFromRotationMatrix(m: Matrix4): this;
        static fromArray(array: number[]): Quaternion;
    }
    export class ObservableQuaternion extends Quaternion {
        private onChange;
        get x(): number;
        get y(): number;
        get z(): number;
        get w(): number;
        set x(value: number);
        set y(value: number);
        set z(value: number);
        set w(value: number);
        constructor(onChange: () => void, x?: number, y?: number, z?: number, w?: number);
    }
}
declare module "math/Matrix4" {
    import { Quaternion } from "math/Quaternion";
    import { Vector3 } from "math/Vector3";
    export class Matrix4 {
        elements: Float32Array;
        constructor(n11?: number, n12?: number, n13?: number, n14?: number, n21?: number, n22?: number, n23?: number, n24?: number, n31?: number, n32?: number, n33?: number, n34?: number, n41?: number, n42?: number, n43?: number, n44?: number);
        copy(m: Matrix4): this;
        set(n11: number, n12: number, n13: number, n14: number, n21: number, n22: number, n23: number, n24: number, n31: number, n32: number, n33: number, n34: number, n41: number, n42: number, n43: number, n44: number): this;
        setFromArray(array: ArrayLike<number>): Matrix4;
        clone(): Matrix4;
        compose(position: Vector3, quaternion: Quaternion, scale: Vector3): this;
        decompose(position: Vector3, quaternion: Quaternion, scale: Vector3): this;
        mul(m: Matrix4): this;
        premultiply(m: Matrix4): this;
        multiplyMatrices(a: Matrix4, b: Matrix4): this;
        invert(): Matrix4;
        determinant(): number;
        transpose(): this;
        perspective(fov: number, aspect: number, near: number, far: number): Matrix4;
        perspectiveZO(fovy: number, aspect: number, near: number, far: number): Matrix4;
        perspectiveLH(fovy: number, aspect: number, near: number, far: number): Matrix4;
        perspectiveWGPUMatrix(fieldOfViewYInRadians: number, aspect: number, zNear: number, zFar: number): Matrix4;
        orthoZO(left: number, right: number, bottom: number, top: number, near: number, far: number): Matrix4;
        identity(): Matrix4;
        lookAt(eye: Vector3, center: Vector3, up: Vector3): Matrix4;
        translate(v: Vector3): this;
        scale(v: Vector3): this;
        makeTranslation(v: Vector3): this;
        makeScale(v: Vector3): this;
    }
}
declare module "components/Transform" {
    import { Matrix4 } from "math/Matrix4";
    import { Quaternion } from "math/Quaternion";
    import { Vector3 } from "math/Vector3";
    import { Component } from "components/Component";
    export class TransformEvents {
        static Updated: () => void;
    }
    export class Transform extends Component {
        private tempRotation;
        up: Vector3;
        forward: Vector3;
        right: Vector3;
        private _localToWorldMatrix;
        private _worldToLocalMatrix;
        get localToWorldMatrix(): Matrix4;
        get worldToLocalMatrix(): Matrix4;
        private _position;
        private _rotation;
        private _scale;
        private _eulerAngles;
        get position(): Vector3;
        set position(value: Vector3);
        get rotation(): Quaternion;
        set rotation(value: Quaternion);
        get eulerAngles(): Vector3;
        set eulerAngles(value: Vector3);
        get scale(): Vector3;
        set scale(value: Vector3);
        private children;
        private _parent;
        get parent(): Transform | null;
        set parent(parent: Transform | null);
        private onEulerChanged;
        private onChanged;
        private UpdateMatrices;
        Update(): void;
        LookAt(target: Vector3): void;
        LookAtV1(target: Vector3): void;
    }
}
declare module "components/Component" {
    import { GameObject } from "GameObject";
    import { Scene } from "Scene";
    import { Transform } from "components/Transform";
    export class ComponentEvents {
        static CallUpdate: (component: Component, shouldUpdate: boolean) => void;
        static AddedComponent: (component: Component, scene: Scene) => void;
        static RemovedComponent: (component: Component, scene: Scene) => void;
    }
    export class Component {
        id: string;
        enabled: boolean;
        hasStarted: boolean;
        name: string;
        readonly gameObject: GameObject;
        readonly transform: Transform;
        constructor(gameObject: GameObject);
        Start(): void;
        Update(): void;
        LateUpdate(): void;
        Destroy(): void;
    }
}
declare module "math/Vector4" {
    import { Matrix4 } from "math/Matrix4";
    export class Vector4 {
        _x: number;
        _y: number;
        _z: number;
        _w: number;
        get x(): number;
        get y(): number;
        get z(): number;
        get w(): number;
        set x(v: number);
        set y(v: number);
        set z(v: number);
        set w(v: number);
        private _elements;
        get elements(): Float32Array;
        constructor(x?: number, y?: number, z?: number, w?: number);
        set(x: number, y: number, z: number, w: number): Vector4;
        setX(x: number): Vector4;
        setY(y: number): Vector4;
        setZ(z: number): Vector4;
        setW(w: number): Vector4;
        clone(): Vector4;
        copy(v: Vector4): Vector4;
        applyMatrix4(m: Matrix4): Vector4;
        normalize(): Vector4;
        length(): number;
        toString(): string;
    }
}
declare module "math/Color" {
    import { Vector3 } from "math/Vector3";
    import { Vector4 } from "math/Vector4";
    export class Color {
        r: number;
        g: number;
        b: number;
        a: number;
        private _elements;
        get elements(): Float32Array;
        constructor(r?: number, g?: number, b?: number, a?: number);
        set(r: number, g: number, b: number, a: number): void;
        static fromVector(v: Vector3 | Vector4): Color;
        static fromHex(hex: number): Color;
        mul(v: Color | number): Color;
        toHex(): string;
    }
}
declare module "components/Camera" {
    import { Color } from "math/Color";
    import { Matrix4 } from "math/Matrix4";
    import { Component } from "components/Component";
    export class CameraEvents {
        static Updated: (camera: Camera) => void;
    }
    export class Camera extends Component {
        backgroundColor: Color;
        projectionMatrix: Matrix4;
        viewMatrix: Matrix4;
        static mainCamera: Camera;
        fov: number;
        aspect: number;
        near: number;
        far: number;
        SetPerspective(fov: number, aspect: number, near: number, far: number): void;
        SetOrthographic(left: number, right: number, top: number, bottom: number, near: number, far: number): void;
        Start(): void;
        Update(): void;
    }
}
declare module "GameObject" {
    import { Component } from "components/Component";
    import { Scene } from "Scene";
    import { Transform } from "components/Transform";
    export class GameObject {
        id: string;
        name: string;
        scene: Scene;
        transform: Transform;
        private componentsArray;
        private componentsMapped;
        constructor(scene: Scene);
        AddComponent<T extends Component>(component: new (...args: any[]) => T): T;
        GetComponent<T extends Component>(type: new (...args: any[]) => T): T | null;
        GetComponents<T extends Component>(type?: new (...args: any[]) => T): T[];
        Start(): void;
        Destroy(): void;
    }
}
declare module "math/Vector2" {
    export class Vector2 {
        _x: number;
        _y: number;
        get x(): number;
        get y(): number;
        set x(v: number);
        set y(v: number);
        private _elements;
        get elements(): Float32Array;
        constructor(x?: number, y?: number);
        set(x: number, y: number): void;
        mul(v: Vector2 | number): Vector2;
        div(v: Vector2 | number): Vector2;
        add(v: Vector2 | number): Vector2;
        sub(v: Vector2 | number): Vector2;
        dot(v: Vector2): number;
        length(): number;
        clone(): Vector2;
        copy(v: Vector2): Vector2;
        toString(): string;
    }
}
declare module "renderer/RendererDebug" {
    class _RendererDebug {
        viewTypeValue: number;
        heightScaleValue: number;
        useHeightMapValue: boolean;
        private gpuBufferSizeTotal;
        private gpuTextureSizeTotal;
        SetPassTime(name: string, time: number): void;
        SetCPUTime(value: number): void;
        SetTriangleCount(count: number): void;
        IncrementTriangleCount(count: number): void;
        SetVisibleTriangleCount(count: number): void;
        IncrementVisibleTriangleCount(count: number): void;
        SetFPS(count: number): void;
        IncrementBindGroupLayouts(value: number): void;
        IncrementBindGroups(value: number): void;
        private FormatBytes;
        IncrementGPUBufferSize(value: number): void;
        IncrementGPUTextureSize(value: number): void;
        IncrementDrawCalls(count: number): void;
        IncrementShaderCompiles(count: number): void;
        ResetFrame(): void;
    }
    export const RendererDebug: _RendererDebug;
}
declare module "renderer/webgpu/WEBGPURenderer" {
    import { Renderer } from "renderer/Renderer";
    export class WEBGPURenderer implements Renderer {
        static adapter: GPUAdapter;
        static device: GPUDevice;
        static context: GPUCanvasContext;
        static presentationFormat: GPUTextureFormat;
        private static activeCommandEncoder;
        constructor(canvas: HTMLCanvasElement);
        static GetActiveCommandEncoder(): GPUCommandEncoder | null;
        static BeginRenderFrame(): void;
        static EndRenderFrame(): void;
        static HasActiveFrame(): boolean;
        static OnFrameCompleted(): Promise<undefined>;
    }
}
declare module "renderer/webgpu/utils/WEBGPUMipsGenerator" {
    import { WEBGPUTexture } from "renderer/webgpu/WEBGPUTexture";
    export class WEBGPUMipsGenerator {
        private static sampler;
        private static module;
        private static pipelineByFormat;
        static numMipLevels(...sizes: number[]): number;
        static generateMips(source: WEBGPUTexture): GPUTexture;
    }
}
declare module "renderer/webgpu/WEBGPUTexture" {
    import { Texture, TextureDimension, TextureFormat, TextureType } from "renderer/Texture";
    export class WEBGPUTexture implements Texture {
        readonly id: string;
        readonly width: number;
        readonly height: number;
        readonly depth: number;
        readonly format: TextureFormat;
        readonly type: TextureType;
        readonly dimension: TextureDimension;
        readonly mipLevels: number;
        private buffer;
        private viewCache;
        private currentLayer;
        private currentMip;
        private activeMipCount;
        constructor(width: number, height: number, depth: number, format: TextureFormat, type: TextureType, dimension: TextureDimension, mipLevels: number);
        GetBuffer(): GPUTexture;
        GetView(): GPUTextureView;
        GenerateMips(): void;
        SetActiveLayer(layer: number): void;
        GetActiveLayer(): number;
        SetActiveMip(mip: number): void;
        GetActiveMip(): number;
        SetActiveMipCount(mipCount: number): number;
        GetActiveMipCount(): number;
        Destroy(): void;
        SetData(data: BufferSource): void;
        static FromImageBitmap(imageBitmap: ImageBitmap, width: number, height: number, format: TextureFormat, flipY: boolean): WEBGPUTexture;
    }
}
declare module "math/BoundingVolume" {
    import { Vector3 } from "math/Vector3";
    export class BoundingVolume {
        min: Vector3;
        max: Vector3;
        center: Vector3;
        radius: number;
        constructor(min?: Vector3, max?: Vector3, center?: Vector3, radius?: number);
        static FromVertices(vertices: Float32Array): BoundingVolume;
    }
}
declare module "renderer/webgpu/WEBGPUBuffer" {
    import { Buffer, BufferType, DynamicBuffer } from "renderer/Buffer";
    class BaseBuffer {
        id: string;
        private buffer;
        readonly size: number;
        set name(name: string);
        get name(): string;
        constructor(sizeInBytes: number, type: BufferType);
        GetBuffer(): GPUBuffer;
        SetArray(array: ArrayBuffer, bufferOffset?: number, dataOffset?: number | undefined, size?: number | undefined): void;
        GetData(sourceOffset?: number, destinationOffset?: number, size?: number): Promise<ArrayBuffer>;
        Destroy(): void;
    }
    export class WEBGPUBuffer extends BaseBuffer implements Buffer {
        constructor(sizeInBytes: number, type: BufferType);
    }
    export class WEBGPUDynamicBuffer extends BaseBuffer implements DynamicBuffer {
        readonly minBindingSize: number;
        dynamicOffset: number;
        constructor(sizeInBytes: number, type: BufferType, minBindingSize: number);
    }
}
declare module "renderer/Buffer" {
    import { WEBGPUBuffer, WEBGPUDynamicBuffer } from "renderer/webgpu/WEBGPUBuffer";
    export enum BufferType {
        STORAGE = 0,
        STORAGE_WRITE = 1,
        UNIFORM = 2,
        VERTEX = 3,
        INDEX = 4,
        INDIRECT = 5
    }
    export class Buffer {
        readonly size: number;
        set name(name: string);
        get name(): string;
        protected constructor();
        static Create(size: number, type: BufferType): WEBGPUBuffer;
        SetArray(array: ArrayBuffer, bufferOffset?: number, dataOffset?: number | undefined, size?: number | undefined): void;
        GetData(sourceOffset?: number, destinationOffset?: number, size?: number): Promise<ArrayBuffer>;
        Destroy(): void;
    }
    export class DynamicBuffer {
        readonly size: number;
        readonly minBindingSize: number | undefined;
        dynamicOffset: number;
        protected constructor();
        static Create(size: number, type: BufferType, minBindingSize: number): WEBGPUDynamicBuffer;
        SetArray(array: ArrayBuffer, bufferOffset?: number, dataOffset?: number | undefined, size?: number | undefined): void;
        GetData(sourceOffset?: number, destinationOffset?: number, size?: number): Promise<ArrayBuffer>;
        Destroy(): void;
    }
}
declare module "Geometry" {
    import { BoundingVolume } from "math/BoundingVolume";
    import { Vector3 } from "math/Vector3";
    import { Buffer, BufferType } from "renderer/Buffer";
    export class GeometryAttribute {
        array: Float32Array | Uint32Array;
        buffer: Buffer;
        constructor(array: Float32Array | Uint32Array, type: BufferType);
        GetBuffer(): Buffer;
    }
    export class VertexAttribute extends GeometryAttribute {
        constructor(array: Float32Array);
    }
    export class InterleavedVertexAttribute extends GeometryAttribute {
        array: Float32Array;
        stride: number;
        constructor(array: Float32Array, stride: number);
        static fromArrays(attributes: Float32Array[], inputStrides: number[], outputStrides?: number[]): InterleavedVertexAttribute;
    }
    export class IndexAttribute extends GeometryAttribute {
        constructor(array: Uint32Array);
    }
    export class Geometry {
        id: string;
        index?: IndexAttribute;
        readonly attributes: Map<string, VertexAttribute | InterleavedVertexAttribute>;
        enableShadows: boolean;
        _boundingVolume: BoundingVolume;
        get boundingVolume(): BoundingVolume;
        ComputeBoundingVolume(): void;
        Clone(): Geometry;
        private ApplyOperationToVertices;
        Center(): Geometry;
        Scale(scale: Vector3): Geometry;
        ComputeNormals(): void;
        static ToNonIndexed(vertices: Float32Array, indices: Uint32Array): Float32Array;
        static Cube(): Geometry;
        static Plane(): Geometry;
        static Sphere(): Geometry;
    }
}
declare module "Assets" {
    type ResponseType<T> = T extends 'json' ? object : T extends 'text' ? string : T extends 'binary' ? ArrayBuffer : never;
    export class Assets {
        private static cache;
        static Load<T extends "json" | "text" | "binary">(url: string, type: T): Promise<ResponseType<T>>;
        static LoadURL<T extends "json" | "text" | "binary">(url: URL, type: T): Promise<ResponseType<T>>;
    }
}
declare module "renderer/ShaderUtils" {
    export class ShaderPreprocessor {
        static ProcessDefines(code: string, defines: {
            [key: string]: boolean;
        }): string;
        static ProcessIncludes(code: string, url?: string): Promise<string>;
    }
    export class ShaderLoader {
        static Load(shader_url: string): Promise<string>;
        static LoadURL(shader_url: URL): Promise<string>;
        static get Draw(): string;
        static get Blit(): string;
        static get BlitDepth(): string;
        static get DeferredLighting(): string;
    }
}
declare module "renderer/webgpu/WEBGPUTextureSampler" {
    import { TextureSampler, TextureSamplerParams } from "renderer/TextureSampler";
    export class WEBGPUTextureSampler implements TextureSampler {
        readonly id: string;
        readonly params: TextureSamplerParams;
        private sampler;
        constructor(params: TextureSamplerParams);
        GetBuffer(): GPUSampler;
    }
}
declare module "renderer/TextureSampler" {
    export interface TextureSamplerParams {
        magFilter?: "linear" | "nearest";
        minFilter?: "linear" | "nearest";
        mipmapFilter?: "linear" | "nearest";
        addressModeU?: "clamp-to-edge" | "repeat" | "mirror-repeat";
        addressModeV?: "clamp-to-edge" | "repeat" | "mirror-repeat";
        compare?: "never" | "less" | "equal" | "less-equal" | "greater" | "not-equal" | "greater-equal" | "always";
        maxAnisotropy?: number;
    }
    export class TextureSampler {
        readonly params: TextureSamplerParams;
        static Create(params?: TextureSamplerParams): TextureSampler;
    }
}
declare module "renderer/webgpu/WEBGPUBaseShader" {
    import { Matrix4 } from "math/Matrix4";
    import { Vector3 } from "math/Vector3";
    import { ComputeShaderParams, ShaderParams, ShaderUniform } from "renderer/Shader";
    import { WEBGPUBuffer, WEBGPUDynamicBuffer } from "renderer/webgpu/WEBGPUBuffer";
    import { WEBGPUTexture } from "renderer/webgpu/WEBGPUTexture";
    import { WEBGPUTextureSampler } from "renderer/webgpu/WEBGPUTextureSampler";
    import { Vector2 } from "math/Vector2";
    import { Vector4 } from "math/Vector4";
    export const UniformTypeToWGSL: {
        [key: string]: any;
    };
    interface WEBGPUShaderUniform extends ShaderUniform {
        buffer?: WEBGPUBuffer | WEBGPUDynamicBuffer | WEBGPUTexture | WEBGPUTextureSampler;
        textureDimension?: number;
        textureMip?: number;
        activeMipCount?: number;
    }
    interface BindGroup {
        entries: GPUBindGroupEntry[];
        buffers: (WEBGPUBuffer | WEBGPUDynamicBuffer | WEBGPUTexture | WEBGPUTextureSampler)[];
    }
    export class WEBGPUBaseShader {
        readonly id: string;
        needsUpdate: boolean;
        protected readonly module: GPUShaderModule;
        readonly params: ShaderParams | ComputeShaderParams;
        protected uniformMap: Map<string, WEBGPUShaderUniform>;
        protected valueArray: Float32Array<ArrayBuffer>;
        protected _pipeline: GPUComputePipeline | GPURenderPipeline | null;
        protected _bindGroups: GPUBindGroup[];
        protected _bindGroupsInfo: BindGroup[];
        get pipeline(): GPURenderPipeline | GPUComputePipeline;
        get bindGroups(): GPUBindGroup[];
        get bindGroupsInfo(): BindGroup[];
        protected bindGroupLayouts: GPUBindGroupLayout[];
        constructor(params: ShaderParams | ComputeShaderParams);
        protected BuildBindGroupLayouts(): GPUBindGroupLayout[];
        protected BuildBindGroupsCRC(): string[];
        protected BuildBindGroups(): GPUBindGroup[];
        private GetValidUniform;
        private SetUniformDataFromArray;
        private SetUniformDataFromBuffer;
        SetArray(name: string, array: ArrayBuffer, bufferOffset?: number, dataOffset?: number, size?: number): void;
        SetValue(name: string, value: number): void;
        SetMatrix4(name: string, matrix: Matrix4): void;
        SetVector2(name: string, vector: Vector2): void;
        SetVector3(name: string, vector: Vector3): void;
        SetVector4(name: string, vector: Vector4): void;
        SetTexture(name: string, texture: WEBGPUTexture): void;
        SetSampler(name: string, sampler: WEBGPUTextureSampler): void;
        SetBuffer(name: string, buffer: WEBGPUBuffer | WEBGPUDynamicBuffer): void;
        HasBuffer(name: string): boolean;
        Compile(): void;
        OnPreRender(): boolean;
    }
}
declare module "renderer/webgpu/WEBGPUShader" {
    import { WEBGPUBaseShader } from "renderer/webgpu/WEBGPUBaseShader";
    import { Shader, ShaderParams } from "renderer/Shader";
    export const pipelineLayoutCache: Map<string, GPUPipelineLayout>;
    export class WEBGPUShader extends WEBGPUBaseShader implements Shader {
        private readonly vertexEntrypoint;
        private readonly fragmentEntrypoint;
        readonly params: ShaderParams;
        private attributeMap;
        protected _pipeline: GPURenderPipeline | null;
        get pipeline(): GPURenderPipeline;
        constructor(params: ShaderParams);
        Compile(): void;
        GetAttributeSlot(name: string): number | undefined;
    }
}
declare module "renderer/webgpu/WEBGPUComputeShader" {
    import { Compute, ComputeShaderParams } from "renderer/Shader";
    import { WEBGPUBaseShader } from "renderer/webgpu/WEBGPUBaseShader";
    export class WEBGPUComputeShader extends WEBGPUBaseShader implements Compute {
        private readonly computeEntrypoint;
        readonly params: ComputeShaderParams;
        protected _pipeline: GPUComputePipeline | null;
        get pipeline(): GPUComputePipeline;
        constructor(params: ComputeShaderParams);
        Compile(): void;
    }
}
declare module "renderer/Shader" {
    import { Geometry } from "Geometry";
    import { Matrix4 } from "math/Matrix4";
    import { Vector2 } from "math/Vector2";
    import { Vector3 } from "math/Vector3";
    import { Vector4 } from "math/Vector4";
    import { Buffer, DynamicBuffer } from "renderer/Buffer";
    import { DepthTexture, RenderTexture, Texture, TextureFormat } from "renderer/Texture";
    import { TextureSampler } from "renderer/TextureSampler";
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
    export enum Topology {
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
    export class BaseShader {
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
    export class Shader extends BaseShader {
        readonly id: string;
        readonly params: ShaderParams;
        static Create(params: ShaderParams): Promise<Shader>;
    }
    export class Compute extends BaseShader {
        readonly params: ComputeShaderParams;
        static Create(params: ComputeShaderParams): Promise<Compute>;
    }
}
declare module "renderer/webgpu/WEBGPUTimestampQuery" {
    export class WEBGPUTimestampQuery {
        private static querySet;
        private static resolveBuffer;
        private static resultBuffer;
        private static isTimestamping;
        private static links;
        private static currentLinkIndex;
        static BeginRenderTimestamp(name: string): GPURenderPassTimestampWrites | GPUComputePassTimestampWrites | undefined;
        static EndRenderTimestamp(): void;
        static GetResult(): Promise<Map<string, number>>;
    }
}
declare module "renderer/webgpu/WEBGPURendererContext" {
    import { Geometry } from "Geometry";
    import { BufferCopyParameters, DepthTarget, RenderTarget, RendererContext, TextureCopyParameters } from "renderer/RendererContext";
    import { WEBGPUBuffer } from "renderer/webgpu/WEBGPUBuffer";
    import { WEBGPUShader } from "renderer/webgpu/WEBGPUShader";
    import { WEBGPUTexture } from "renderer/webgpu/WEBGPUTexture";
    export class WEBGPURendererContext implements RendererContext {
        private static activeRenderPass;
        static BeginRenderPass(name: string, renderTargets: RenderTarget[], depthTarget?: DepthTarget, timestamp?: boolean): void;
        static EndRenderPass(): void;
        static DrawGeometry(geometry: Geometry, shader: WEBGPUShader, instanceCount?: number): void;
        static DrawIndirect(geometry: Geometry, shader: WEBGPUShader, indirectBuffer: WEBGPUBuffer, indirectOffset: number): void;
        static SetViewport(x: number, y: number, width: number, height: number, minDepth: number, maxDepth: number): void;
        static SetScissor(x: number, y: number, width: number, height: number): void;
        static CopyBufferToBuffer(source: WEBGPUBuffer, destination: WEBGPUBuffer, sourceOffset: number, destinationOffset: number, size: number): void;
        static CopyBufferToTexture(source: BufferCopyParameters, destination: TextureCopyParameters, copySize?: number[]): void;
        static CopyTextureToTexture(source: WEBGPUTexture, destination: WEBGPUTexture, srcMip: number, dstMip: number, size?: number[]): void;
        static CopyTextureToBuffer(source: WEBGPUTexture, destination: WEBGPUBuffer, srcMip: number, size?: number[]): void;
        static CopyTextureToBufferV2(source: TextureCopyParameters, destination: BufferCopyParameters, copySize?: number[]): void;
        static CopyTextureToTextureV2(source: WEBGPUTexture, destination: WEBGPUTexture, srcMip: number, dstMip: number, size?: number[], depth?: number): void;
        static CopyTextureToTextureV3(source: TextureCopyParameters, destination: TextureCopyParameters, copySize?: number[]): void;
        static ClearBuffer(buffer: WEBGPUBuffer, offset: number, size: number): void;
    }
}
declare module "renderer/RendererContext" {
    import { Geometry } from "Geometry";
    import { Color } from "math/Color";
    import { Buffer } from "renderer/Buffer";
    import { Shader } from "renderer/Shader";
    import { DepthTexture, RenderTexture, Texture } from "renderer/Texture";
    import { WEBGPUBuffer } from "renderer/webgpu/WEBGPUBuffer";
    export interface RenderTarget {
        target?: RenderTexture;
        clear: boolean;
        color?: Color;
    }
    export interface DepthTarget {
        target: DepthTexture;
        clear: boolean;
    }
    export interface TextureCopyParameters {
        texture: Texture;
        mipLevel?: number;
        origin?: number[];
    }
    export interface BufferCopyParameters {
        buffer: Buffer;
        offset?: number;
        bytesPerRow?: number;
        rowsPerImage?: number;
    }
    export class RendererContext {
        private constructor();
        static BeginRenderPass(name: string, renderTargets: RenderTarget[], depthTarget?: DepthTarget, timestamp?: boolean): void;
        static EndRenderPass(): void;
        static SetViewport(x: number, y: number, width: number, height: number, minDepth?: number, maxDepth?: number): void;
        static SetScissor(x: number, y: number, width: number, height: number): void;
        static DrawGeometry(geometry: Geometry, shader: Shader, instanceCount?: number): void;
        static DrawIndirect(geometry: Geometry, shader: Shader, indirectBuffer: Buffer, indirectOffset?: number): void;
        static CopyBufferToBuffer(source: Buffer, destination: Buffer, sourceOffset?: number, destinationOffset?: number, size?: number | undefined): void;
        static CopyBufferToTexture(source: BufferCopyParameters, destination: TextureCopyParameters, copySize?: number[]): void;
        static CopyTextureToTexture(source: Texture, destination: Texture, srcMip?: number, dstMip?: number, size?: number[]): void;
        static CopyTextureToBuffer(source: Texture, destination: WEBGPUBuffer, srcMip: number, size?: number[]): void;
        static CopyTextureToBufferV2(source: TextureCopyParameters, destination: BufferCopyParameters, copySize?: number[]): void;
        static CopyTextureToTextureV2(source: Texture, destination: Texture, srcMip?: number, dstMip?: number, size?: number[], depth?: number): void;
        static CopyTextureToTextureV3(source: TextureCopyParameters, destination: TextureCopyParameters, copySize?: number[]): void;
        static ClearBuffer(buffer: Buffer, offset?: number, size?: number): void;
    }
}
declare module "renderer/webgpu/utils/WEBGBPUBlit" {
    import { Vector2 } from "math/Vector2";
    import { Shader } from "renderer/Shader";
    import { Texture } from "renderer/Texture";
    export class WEBGPUBlit {
        static blitShader: Shader;
        private static blitGeometry;
        static Blit(source: Texture, destination: Texture, width: number, height: number, uv_scale: Vector2): void;
    }
}
declare module "renderer/Texture" {
    import { Vector2 } from "math/Vector2";
    export type TextureFormat = "r16uint" | "r16sint" | "r16float" | "rg8unorm" | "rg8snorm" | "rg8uint" | "rg8sint" | "r32uint" | "r32sint" | "r32float" | "rg16uint" | "rg16sint" | "rg16float" | "rgba8unorm" | "rgba8unorm-srgb" | "rgba8snorm" | "rgba8uint" | "rgba8sint" | "bgra8unorm" | "bgra8unorm-srgb" | "rg32uint" | "rg32sint" | "rg32float" | "rgba16uint" | "rgba16sint" | "rgba16float" | "rgba32uint" | "rgba32sint" | "rgba32float" | "stencil8" | "depth16unorm" | "depth24plus" | "depth24plus-stencil8" | "depth24plus" | "depth24plus-stencil8";
    export enum TextureType {
        IMAGE = 0,
        DEPTH = 1,
        RENDER_TARGET = 2,
        RENDER_TARGET_STORAGE = 3
    }
    export type TextureDimension = "1d" | "2d" | "2d-array" | "cube" | "cube-array" | "3d";
    export class Texture {
        readonly id: string;
        readonly width: number;
        readonly height: number;
        readonly depth: number;
        readonly type: TextureType;
        readonly dimension: TextureDimension;
        SetActiveLayer(layer: number): void;
        GetActiveLayer(): number;
        SetActiveMip(layer: number): void;
        GetActiveMip(): number;
        SetActiveMipCount(layer: number): void;
        GetActiveMipCount(): number;
        GenerateMips(): void;
        Destroy(): void;
        SetData(data: BufferSource): void;
        static Create(width: number, height: number, depth?: number, format?: TextureFormat, mipLevels?: number): Texture;
        static Load(url: string | URL, format?: TextureFormat, flipY?: boolean): Promise<Texture>;
        static LoadImageSource(imageSource: ImageBitmapSource, format?: TextureFormat, flipY?: boolean): Promise<Texture>;
        static Blit(source: Texture, destination: Texture, width: number, height: number, uv_scale?: Vector2): Promise<void>;
    }
    export class DepthTexture extends Texture {
        static Create(width: number, height: number, depth?: number, format?: TextureFormat, mipLevels?: number): Texture;
    }
    export class RenderTexture extends Texture {
        static Create(width: number, height: number, depth?: number, format?: TextureFormat, mipLevels?: number): Texture;
    }
    export class RenderTextureStorage extends Texture {
        static Create(width: number, height: number, depth?: number, format?: TextureFormat, mipLevels?: number): Texture;
    }
    export class RenderTextureStorage3D extends Texture {
        static Create(width: number, height: number, depth?: number, format?: TextureFormat, mipLevels?: number): Texture;
    }
    export class RenderTextureCube extends Texture {
        static Create(width: number, height: number, depth?: number, format?: TextureFormat, mipLevels?: number): Texture;
    }
    export class TextureArray extends Texture {
        static Create(width: number, height: number, depth?: number, format?: TextureFormat, mipLevels?: number): Texture;
    }
    export class Texture3D extends Texture {
        static Create(width: number, height: number, depth?: number, format?: TextureFormat, mipLevels?: number): Texture;
    }
    export class CubeTexture extends Texture {
        static Create(width: number, height: number, depth?: number, format?: TextureFormat, mipLevels?: number): Texture;
    }
    export class DepthTextureArray extends Texture {
        static Create(width: number, height: number, depth?: number, format?: TextureFormat, mipLevels?: number): Texture;
    }
    export class RenderTextureArray extends Texture {
        static Create(width: number, height: number, depth?: number, format?: TextureFormat, mipLevels?: number): Texture;
    }
    export class RenderTexture3D extends Texture {
        static Create(width: number, height: number, depth?: number, format?: TextureFormat, mipLevels?: number): Texture;
    }
}
declare module "renderer/Renderer" {
    import { TextureFormat } from "renderer/Texture";
    export type RendererAPIType = "webgpu";
    export class Renderer {
        static type: RendererAPIType;
        static width: number;
        static height: number;
        static activeRenderer: Renderer;
        static Create(canvas: HTMLCanvasElement, type: RendererAPIType): Renderer;
        static get SwapChainFormat(): TextureFormat;
        static BeginRenderFrame(): void;
        static EndRenderFrame(): void;
        static HasActiveFrame(): boolean;
        static OnFrameCompleted(): Promise<undefined>;
    }
}
declare module "renderer/RenderGraph" {
    export class RenderPass {
        name: string;
        inputs: string[];
        outputs: string[];
        initialized: boolean;
        initializing: boolean;
        constructor(params: {
            inputs?: string[];
            outputs?: string[];
        });
        init(resources: ResourcePool): Promise<void>;
        execute(resources: ResourcePool, ...args: any): void;
        set(data: {
            inputs?: string[];
            outputs?: string[];
        }): void;
    }
    export class ResourcePool {
        private resources;
        setResource(name: string, resource: any): void;
        getResource(name: string): any;
    }
    export class RenderGraph {
        passes: RenderPass[];
        resourcePool: ResourcePool;
        addPass(pass: RenderPass): void;
        init(): Promise<void>;
        execute(): void;
        private topologicalSort;
    }
}
declare module "components/Light" {
    import { Color } from "math/Color";
    import { Vector3 } from "math/Vector3";
    import { Camera } from "components/Camera";
    import { Component } from "components/Component";
    export class LightEvents {
        static Updated: (light: Light) => void;
    }
    export class Light extends Component {
        camera: Camera;
        color: Color;
        intensity: number;
        range: number;
        castShadows: boolean;
        Start(): void;
    }
    export class SpotLight extends Light {
        direction: Vector3;
        angle: number;
        Start(): void;
    }
    export class PointLight extends Light {
        Start(): void;
    }
    export class AreaLight extends Light {
        Start(): void;
    }
    export class DirectionalLight extends Light {
        direction: Vector3;
        Start(): void;
    }
}
declare module "renderer/Material" {
    import { Color } from "math/Color";
    import { Shader } from "renderer/Shader";
    import { Texture } from "renderer/Texture";
    export interface MaterialParams {
        isDeferred: boolean;
    }
    export class Material {
        shader: Shader;
        params: MaterialParams;
        createShader(): Promise<Shader>;
        constructor(params?: Partial<MaterialParams>);
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
    }
    export class PBRMaterial extends Material {
        id: string;
        initialParams?: Partial<PBRMaterialParams>;
        params: PBRMaterialParams;
        constructor(params?: Partial<PBRMaterialParams>);
        createShader(): Promise<Shader>;
    }
}
declare module "components/Mesh" {
    import { Component } from "components/Component";
    import { Geometry } from "Geometry";
    import { Material } from "renderer/Material";
    export class Mesh extends Component {
        protected geometry: Geometry;
        private materialsMapped;
        enableShadows: boolean;
        Start(): void;
        AddMaterial(material: Material): void;
        GetMaterials<T extends Material>(type?: new (...args: any[]) => T): T[];
        SetGeometry(geometry: Geometry): void;
        GetGeometry(): Geometry;
    }
}
declare module "utils/MemoryAllocator" {
    import { Buffer } from "renderer/Buffer";
    interface MemoryBlock {
        offset: number;
        size: number;
    }
    export class MemoryAllocator {
        memorySize: number;
        availableMemorySize: number;
        freeBlocks: MemoryBlock[];
        usedBlocks: MemoryBlock[];
        constructor(memorySize: number);
        allocate(size: number): number;
        private mergeFreeBlocks;
        free(offset: number): void;
    }
    export class BufferMemoryAllocator {
        protected allocator: MemoryAllocator;
        protected buffer: Buffer;
        protected links: Map<any, number>;
        protected static BYTES_PER_ELEMENT: number;
        constructor(size: number);
        has(link: any): boolean;
        set(link: any, data: Float32Array | Uint32Array): number;
        delete(link: any): void;
        getBuffer(): Buffer;
        getAllocator(): MemoryAllocator;
    }
    export class DynamicBufferMemoryAllocator extends BufferMemoryAllocator {
        private incrementAmount;
        constructor(size: number, incrementAmount?: number);
        set(link: any, data: Float32Array | Uint32Array): number;
        delete(link: any): void;
    }
}
declare module "components/InstancedMesh" {
    import { Buffer } from "renderer/Buffer";
    import { Matrix4 } from "math/Matrix4";
    import { Mesh } from "components/Mesh";
    export class InstancedMesh extends Mesh {
        private incrementInstanceCount;
        private _matricesBuffer;
        get matricesBuffer(): Buffer;
        private _instanceCount;
        get instanceCount(): number;
        SetMatrixAt(index: number, matrix: Matrix4): void;
    }
}
declare module "renderer/passes/DeferredShadowMapPass" {
    import { RenderPass, ResourcePool } from "renderer/RenderGraph";
    export interface LightShadowData {
        cascadeSplits: Float32Array;
        projectionMatrices: Float32Array;
        shadowMapIndex: number;
    }
    class _DeferredShadowMapPassDebug {
        shadowsUpdateValue: boolean;
        roundToPixelSizeValue: boolean;
        debugCascadesValue: boolean;
        pcfResolutionValue: number;
        blendThresholdValue: number;
        viewBlendThresholdValue: boolean;
        constructor();
    }
    export const DeferredShadowMapPassDebug: _DeferredShadowMapPassDebug;
    export class DeferredShadowMapPass extends RenderPass {
        name: string;
        private drawInstancedShadowShader;
        private drawShadowShader;
        private lightProjectionMatrixBuffer;
        private lightProjectionViewMatricesBuffer;
        private modelMatrices;
        private cascadeIndexBuffers;
        private cascadeCurrentIndexBuffer;
        private numOfCascades;
        private lightShadowData;
        private shadowOutput;
        private shadowWidth;
        private shadowHeight;
        constructor();
        init(resources: ResourcePool): Promise<void>;
        private getCornersForCascade;
        private getCascades;
        execute(resources: ResourcePool): void;
    }
}
declare module "renderer/passes/DeferredLightingPass" {
    import { RenderPass, ResourcePool } from "renderer/RenderGraph";
    export class DeferredLightingPass extends RenderPass {
        name: string;
        private shader;
        private sampler;
        private quadGeometry;
        private lightsBuffer;
        private lightsCountBuffer;
        private outputLightingPass;
        private needsUpdate;
        initialized: boolean;
        private dummyShadowPassDepth;
        constructor();
        init(): Promise<void>;
        private updateLightsBuffer;
        execute(resources: ResourcePool): void;
    }
}
declare module "renderer/passes/TextureViewer" {
    import { RenderPass, ResourcePool } from "renderer/RenderGraph";
    export class TextureViewer extends RenderPass {
        name: string;
        private shader;
        private quadGeometry;
        constructor();
        init(): Promise<void>;
        execute(resources: ResourcePool): void;
    }
}
declare module "renderer/passes/PrepareGBuffers" {
    import { RenderPass, ResourcePool } from "renderer/RenderGraph";
    import { CubeTexture, DepthTexture, RenderTexture } from "renderer/Texture";
    export class PrepareGBuffers extends RenderPass {
        name: string;
        gBufferAlbedoRT: RenderTexture;
        gBufferNormalRT: RenderTexture;
        gBufferERMORT: RenderTexture;
        depthTexture: DepthTexture;
        depthTextureClone: DepthTexture;
        gBufferAlbedoRTClone: RenderTexture;
        skybox: CubeTexture;
        constructor();
        init(resources: ResourcePool): Promise<void>;
        execute(resources: ResourcePool): void;
    }
}
declare module "renderer/passes/DebuggerTextureViewer" {
    import { RenderPass, ResourcePool } from "renderer/RenderGraph";
    export class DebuggerTextureViewer extends RenderPass {
        name: string;
        private shader;
        private quadGeometry;
        constructor();
        init(): Promise<void>;
        execute(resources: ResourcePool): void;
    }
}
declare module "renderer/passes/DeferredGBufferPass" {
    import { RenderPass, ResourcePool } from "renderer/RenderGraph";
    export class DeferredGBufferPass extends RenderPass {
        name: string;
        constructor();
        init(resources: ResourcePool): Promise<void>;
        execute(resources: ResourcePool): void;
    }
}
declare module "renderer/RenderingPipeline" {
    import { Scene } from "Scene";
    import { Renderer } from "renderer/Renderer";
    import { RenderPass } from "renderer/RenderGraph";
    import { CubeTexture } from "renderer/Texture";
    export const PassParams: {
        DebugSettings: string;
        MainCamera: string;
        depthTexture: string;
        depthTexturePyramid: string;
        GBufferAlbedo: string;
        GBufferAlbedoClone: string;
        GBufferNormal: string;
        GBufferERMO: string;
        GBufferDepth: string;
        GBufferDepthClone: string;
        Skybox: string;
        ShadowPassDepth: string;
        ShadowPassCascadeData: string;
        LightingPassOutput: string;
    };
    export enum RenderPassOrder {
        BeforeGBuffer = 0,
        AfterGBuffer = 1,
        BeforeLighting = 2,
        AfterLighting = 3,
        BeforeScreenOutput = 4
    }
    export class RenderingPipeline {
        private renderer;
        private renderGraph;
        private frame;
        private previousTime;
        private beforeGBufferPasses;
        private afterGBufferPasses;
        private beforeLightingPasses;
        private afterLightingPasses;
        private beforeScreenOutputPasses;
        private prepareGBuffersPass;
        get skybox(): CubeTexture;
        set skybox(skybox: CubeTexture);
        constructor(renderer: Renderer);
        private UpdateRenderGraphPasses;
        AddPass(pass: RenderPass, order: RenderPassOrder): void;
        Render(scene: Scene): void;
    }
}
declare module "Scene" {
    import { GameObject } from "GameObject";
    import { Component } from "components/Component";
    import { Renderer } from "renderer/Renderer";
    import { RenderingPipeline } from "renderer/RenderingPipeline";
    export class Scene {
        readonly renderer: Renderer;
        name: string;
        id: string;
        private _hasStarted;
        get hasStarted(): boolean;
        private gameObjects;
        private toUpdate;
        private componentsByType;
        readonly renderPipeline: RenderingPipeline;
        constructor(renderer: Renderer);
        AddGameObject(gameObject: GameObject): void;
        GetGameObjects(): GameObject[];
        GetComponents<T extends Component>(type: new (...args: any[]) => T): T[];
        RemoveGameObject(gameObject: GameObject): void;
        Start(): void;
        private Tick;
    }
}
declare module "Object3D" {
    import { Geometry } from "Geometry";
    import { Matrix4 } from "math/Matrix4";
    import { PBRMaterial } from "renderer/Material";
    export interface ExtensionInstanced {
        instanceMatrices: Matrix4[];
        instanceCount: number;
    }
    export interface Object3D {
        name?: string;
        geometry?: Geometry;
        material?: PBRMaterial;
        localMatrix?: Matrix4;
        children: Object3D[];
        extensions?: ExtensionInstanced[];
    }
}
declare module "components/index" {
    export * from "components/Camera";
    export * from "components/Component";
    export * from "components/InstancedMesh";
    export * from "components/Light";
    export * from "components/Mesh";
    export * from "components/Transform";
}
declare module "math/Sphere" {
    import { Vector3 } from "math/Vector3";
    export class Sphere {
        center: Vector3;
        radius: number;
        constructor(center?: Vector3, radius?: number);
        static fromAABB(minBounds: Vector3, maxBounds: Vector3): Sphere;
        static fromVertices(vertices: Float32Array, indices: Uint32Array, vertex_positions_stride: number): Sphere;
        SetFromPoints(points: Vector3[]): void;
    }
}
declare module "math/Plane" {
    import { Vector3 } from "math/Vector3";
    export class Plane {
        normal: Vector3;
        constant: number;
        constructor(normal?: Vector3, constant?: number);
        setComponents(x: number, y: number, z: number, w: number): this;
        normalize(): this;
    }
}
declare module "math/Frustum" {
    import { Matrix4 } from "math/Matrix4";
    import { Plane } from "math/Plane";
    export class Frustum {
        planes: Plane[];
        constructor(p0?: Plane, p1?: Plane, p2?: Plane, p3?: Plane, p4?: Plane, p5?: Plane);
        setFromProjectionMatrix(m: Matrix4): Frustum;
    }
}
declare module "math/index" {
    export * from "math/Vector2";
    export * from "math/Vector3";
    export * from "math/Vector4";
    export * from "math/Sphere";
    export * from "math/Matrix4";
    export * from "math/Frustum";
    export * from "math/Color";
    export * from "math/BoundingVolume";
    export * from "math/Plane";
    export * from "math/Quaternion";
}
declare module "renderer/index" {
    export { Renderer } from "renderer/Renderer";
    export { Buffer, BufferType } from "renderer/Buffer";
    export { RenderPass, ResourcePool } from "renderer/RenderGraph";
    export { RendererContext } from "renderer/RendererContext";
    export { RenderingPipeline, RenderPassOrder, PassParams } from "renderer/RenderingPipeline";
    export { Shader } from "renderer/Shader";
    export { ShaderLoader } from "renderer/ShaderUtils";
    export { DepthTexture, RenderTexture, Texture } from "renderer/Texture";
    export { TextureSampler } from "renderer/TextureSampler";
}
declare module "index" {
    export { Scene } from "Scene";
    export { GameObject } from "GameObject";
    export { Component } from "components/Component";
    export { Renderer } from "renderer/Renderer";
    export { Utils } from "utils/Utils";
    export { PBRMaterial, PBRMaterialParams } from "renderer/Material";
    export { Object3D } from "Object3D";
    export { Texture } from "renderer/Texture";
    export { Geometry, IndexAttribute, VertexAttribute } from "Geometry";
    export * as Components from "components/index";
    export * as Mathf from "math/index";
    export * as GPU from "renderer/index";
}
