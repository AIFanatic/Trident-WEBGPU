import { UUID } from "../utils";
import { Matrix4 } from "../math/Matrix4";
import { Vector2 } from "../math/Vector2";
import { Vector3 } from "../math/Vector3";
import { Vector4 } from "../math/Vector4";
import { Geometry } from "../Geometry";
import { Renderer } from "./Renderer";
import { ShaderPreprocessor } from "./ShaderUtils";
import { Buffer, DynamicBuffer, BufferType } from "./Buffer";
import { Texture, TextureFormat, TextureType } from "./Texture";
import { TextureSampler } from "./TextureSampler";
import { ReflectWGSL } from "./webgpu/utils/WGSLReflection";

export const pipelineLayoutCache: Map<string, GPUPipelineLayout> = new Map();
const pipelineCache: Map<string, GPURenderPipeline> = new Map();

// TODO: Make this error!!
const WGSLShaderAttributeFormat: { [key: string]: string } = {
    vec2: "float32x2",
    vec3: "float32x3",
    vec4: "float32x4",
    vec2u: "uint32x2",
    vec3u: "uint32x3",
    vec4u: "uint32x4",
};

function blendState(mode: BlendMode): GPUBlendState | undefined {
    switch (mode) {
        case 'opaque':
            return undefined; // no blending
        case 'alpha': // straight alpha
            return {
                color: { srcFactor: 'src-alpha', dstFactor: 'one-minus-src-alpha', operation: 'add' },
                alpha: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' },
            };
        case 'premultiplied': // premultiplied alpha
            return {
                color: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' },
                alpha: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' },
            };
        case 'add': // additive glow (works best with premultiplied shader output)
            return {
                color: { srcFactor: 'one', dstFactor: 'one', operation: 'add' },
                alpha: { srcFactor: 'one', dstFactor: 'one', operation: 'add' },
            };
    }
}

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
    type: "uniform" | "storage" | "storage-write" | "storage-write-only" | "storage-read-only" | "texture" | "sampler" | "sampler-compare" | "sampler-non-filterable" | "depthTexture";
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
    defines?: { [key: string]: boolean };
    attributes?: { [key: string]: ShaderAttribute };
    uniforms?: { [key: string]: ShaderUniform };
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

export interface ShaderComputeParams {
    code: string;
    name?: string;
    defines?: { [key: string]: boolean };
    uniforms?: { [key: string]: ShaderUniform };
    computeEntrypoint?: string;
};

const BindGroupLayoutCache: Map<string, GPUBindGroupLayout> = new Map();
const BindGroupCache: Map<string, GPUBindGroup> = new Map();

export const UniformTypeToWGSL: { [key: string]: any } = {
    "uniform": "uniform",
    "storage": "read-only-storage",
    "storage-write": "storage",
    "storage-write-only": "storage",
    "storage-read-only": "storage",
}

interface WEBGPUShaderUniform extends ShaderUniform {
    buffer?: Buffer | DynamicBuffer | Texture | TextureSampler;
    textureDimension?: number;
    textureMip?: number;
    activeMipCount?: number;
}

interface BindGroup {
    entries: GPUBindGroupEntry[];
    buffers: (Buffer | DynamicBuffer | Texture | TextureSampler)[];
}

class BaseShader {
    public readonly id: string = UUID();
    public needsUpdate = false;

    protected readonly module: GPUShaderModule;

    public readonly params: ShaderParams | ShaderComputeParams;
    protected uniformMap: Map<string, WEBGPUShaderUniform> = new Map();

    protected valueArray = new Float32Array(1);

    protected _pipeline: GPUComputePipeline | GPURenderPipeline | null = null;
    protected _bindGroups: GPUBindGroup[] = [];
    protected _bindGroupsInfo: BindGroup[] = [];
    public get pipeline() { return this._pipeline };
    public get bindGroups() { return this._bindGroups };
    public get bindGroupsInfo() { return this._bindGroupsInfo };


    protected bindGroupLayouts: GPUBindGroupLayout[] = [];

    constructor(params: ShaderParams | ShaderComputeParams) {
        const code = params.defines ? ShaderPreprocessor.ProcessDefines(params.code, params.defines) : params.code;
        this.params = params;
        this.module = Renderer.device.createShaderModule({ code: code, label: params.name });
        if (this.params.uniforms) {
            this.uniformMap = new Map(Object.entries(this.params.uniforms));
        }
    }

    // TODO: This needs cleaning
    protected BuildBindGroupLayouts(): GPUBindGroupLayout[] {
        const bindGroupsLayoutEntries: GPUBindGroupLayoutEntry[][] = [];

        // Bind group layout
        for (const [name, uniform] of this.uniformMap) {
            if (!bindGroupsLayoutEntries[uniform.group]) bindGroupsLayoutEntries[uniform.group] = [];

            const layoutEntries = bindGroupsLayoutEntries[uniform.group];

            if (uniform.buffer instanceof Buffer) {
                const visibility = uniform.type === "storage-write" ? GPUShaderStage.FRAGMENT | GPUShaderStage.COMPUTE : GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT | GPUShaderStage.COMPUTE
                layoutEntries.push({ binding: uniform.binding, visibility: visibility, buffer: { type: UniformTypeToWGSL[uniform.type] } });
            }
            else if (uniform.buffer instanceof DynamicBuffer) {
                const visibility = uniform.type === "storage-write" ? GPUShaderStage.FRAGMENT | GPUShaderStage.COMPUTE : GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT | GPUShaderStage.COMPUTE
                layoutEntries.push({
                    binding: uniform.binding,
                    visibility: visibility,
                    buffer: {
                        type: UniformTypeToWGSL[uniform.type],
                        hasDynamicOffset: true,
                        minBindingSize: uniform.buffer.minBindingSize
                    }
                })
            }
            else if (uniform.buffer instanceof Texture) {
                // let sampleType: GPUTextureSampleType = uniform.type === "depthTexture" ? "depth" : "float";
                let sampleType: GPUTextureSampleType = uniform.type === "depthTexture" ? "depth" : "float";
                if (uniform.buffer.format.includes("32float")) sampleType = "unfilterable-float"
                else if (uniform.buffer.format.includes("32uint")) sampleType = "uint"
                else if (uniform.buffer.format.includes("32int")) sampleType = "sint"
                if (uniform.buffer.textureType === TextureType.RENDER_TARGET_STORAGE) {
                    layoutEntries.push({
                        binding: uniform.binding,
                        visibility: GPUShaderStage.COMPUTE | GPUShaderStage.FRAGMENT,
                        storageTexture: {
                            format: uniform.buffer.format,
                            viewDimension: uniform.buffer.dimension,
                            access: uniform.type === "storage-write-only" ? "write-only" : uniform.type === "storage-read-only" ? "read-only" : "read-write",
                        }
                    })
                }
                else {
                    layoutEntries.push({ binding: uniform.binding, visibility: GPUShaderStage.COMPUTE | GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT, texture: { sampleType: sampleType, viewDimension: uniform.buffer.dimension } })
                }
            }
            else if (uniform.buffer instanceof TextureSampler) {
                // const type: GPUSamplerBindingType = uniform.type === "sampler" ? "filtering" : "comparison";
                let type: GPUSamplerBindingType | undefined = undefined;
                if (uniform.type === "sampler") type = "filtering";
                else if (uniform.type === "sampler-compare") type = "comparison";
                else if (uniform.type === "sampler-non-filterable") type = "non-filtering";
                layoutEntries.push({ binding: uniform.binding, visibility: GPUShaderStage.COMPUTE | GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT, sampler: { type: type } })
            }

        }

        let bindGroupLayouts: GPUBindGroupLayout[] = [];
        for (const bindGroupsLayoutEntry of bindGroupsLayoutEntries) {
            const crc = JSON.stringify(bindGroupsLayoutEntry);
            // console.log(crc)

            let bindGroupLayout = BindGroupLayoutCache.get(crc);
            if (bindGroupLayout === undefined) {
                bindGroupLayout = Renderer.device.createBindGroupLayout({ label: this.params.name, entries: bindGroupsLayoutEntry });
                BindGroupLayoutCache.set(crc, bindGroupLayout);
                Renderer.info.bindGroupLayoutsStat += 1;
            }
            bindGroupLayout["crc"] = crc; // Meh
            bindGroupLayouts.push(bindGroupLayout);
        }

        return bindGroupLayouts;
    }

    protected BuildBindGroupsCRC(): string[] {
        const crcs: string[] = [];

        // Bind group layout
        for (const [name, uniform] of this.uniformMap) {
            if (!crcs[uniform.group]) crcs[uniform.group] = "";

            if (uniform.buffer instanceof Texture) {
                crcs[uniform.group] += `${uniform.buffer.id}:${uniform.textureMip}:${uniform.activeMipCount},`;
            } else if (uniform.buffer) {
                crcs[uniform.group] += `${uniform.buffer.id},`;
            }
        }

        return crcs;
    }

    protected BuildBindGroups(): GPUBindGroup[] {
        const bindGroupsInfo: BindGroup[] = [];

        // Bind group layout
        for (const [name, uniform] of this.uniformMap) {
            // // This should be here but it clashes with the preprocessor
            // if (!uniform.buffer) console.warn(`Shader has binding (${name}) but no buffer was set`);

            if (!bindGroupsInfo[uniform.group]) bindGroupsInfo[uniform.group] = { entries: [], buffers: [] };

            const group = bindGroupsInfo[uniform.group];
            if (uniform.buffer instanceof Buffer) {
                group.entries.push({ binding: uniform.binding, resource: { buffer: uniform.buffer.GetBuffer() } });
                group.buffers.push(uniform.buffer);
            }
            else if (uniform.buffer instanceof DynamicBuffer) {
                group.entries.push({
                    binding: uniform.binding,
                    resource: {
                        buffer: uniform.buffer.GetBuffer(),
                        offset: 0,
                        size: uniform.buffer.minBindingSize
                    }
                });

                group.buffers.push(uniform.buffer);
            }
            else if (uniform.buffer instanceof Texture) {
                // TODO: Can this use Texture.GetView()?
                // Remember this is for binding textures not color/depth outputs
                const view: GPUTextureViewDescriptor = {
                    dimension: uniform.buffer.dimension,
                    arrayLayerCount: uniform.buffer.dimension != "3d" ? uniform.buffer.GetBuffer().depthOrArrayLayers : 1,
                    // arrayLayerCount: uniform.buffer.GetBuffer().depthOrArrayLayers,
                    baseArrayLayer: 0,
                    baseMipLevel: uniform.textureMip,
                    mipLevelCount: uniform.activeMipCount
                };
                group.entries.push({ binding: uniform.binding, resource: uniform.buffer.GetBuffer().createView(view) });
                group.buffers.push(uniform.buffer);
            }
            else if (uniform.buffer instanceof TextureSampler) {
                group.entries.push({ binding: uniform.binding, resource: uniform.buffer.GetBuffer() });
                group.buffers.push(uniform.buffer);
            }
        }


        this._bindGroupsInfo = bindGroupsInfo;
        let bindGroupsCRC = this.BuildBindGroupsCRC();
        let bindGroups: GPUBindGroup[] = [];
        for (let i = 0; i < bindGroupsInfo.length; i++) {
            const crc = bindGroupsCRC[i];
            const bindGroupInfo = bindGroupsInfo[i];
            const bindGroupLayout = this.bindGroupLayouts[i];

            let bindGroup = BindGroupCache.get(crc);
            if (bindGroup === undefined) {
                bindGroup = Renderer.device.createBindGroup({ layout: bindGroupLayout, entries: bindGroupInfo.entries });
                Renderer.info.bindGroupsStat += 1;
                BindGroupCache.set(crc, bindGroup);
            }
            bindGroups.push(bindGroup);

        }

        return bindGroups;
    }

    private GetValidUniform(name: string): WEBGPUShaderUniform {
        const uniform = this.uniformMap.get(name);
        if (!uniform) throw Error(`Shader does not have a parameter named ${name}`);
        return uniform;
    }

    private SetUniformDataFromArray(name: string, data: ArrayBuffer, dataOffset?: number | undefined, bufferOffset: number = 0, size?: number | undefined) {
        const uniform = this.GetValidUniform(name);
        if (!uniform.buffer) {
            let type: BufferType = BufferType.STORAGE;
            if (uniform.type === "uniform") type = BufferType.UNIFORM;
            uniform.buffer = new Buffer(data.byteLength, type);
            this.needsUpdate = true;
        }

        Renderer.device.queue.writeBuffer(uniform.buffer.GetBuffer() as GPUBuffer, bufferOffset, data, dataOffset, size);
    }
    private SetUniformDataFromBuffer(name: string, data: Texture | TextureSampler | Buffer | DynamicBuffer) {
        if (!data) throw Error(`Invalid buffer ${name}`);

        const binding = this.GetValidUniform(name);
        if (!binding.buffer || binding.buffer.GetBuffer() !== data.GetBuffer()) {
            binding.buffer = data;
            this.needsUpdate = true;
        }
        if (data instanceof Texture) {
            const textureMip = data.GetActiveMip();
            const activeMipCount = data.GetActiveMipCount();

            if (binding.textureMip !== textureMip || binding.activeMipCount !== activeMipCount) {
                this.needsUpdate = true;
            }

            binding.textureDimension = data.GetActiveLayer();
            binding.textureMip = textureMip;
            binding.activeMipCount = activeMipCount;
        }
    }

    public SetArray(name: string, array: ArrayBufferView, bufferOffset: number = 0, dataOffset?: number, size?: number) { this.SetUniformDataFromArray(name, array, bufferOffset, dataOffset, size) }
    public SetValue(name: string, value: number) { this.valueArray[0] = value; this.SetUniformDataFromArray(name, this.valueArray) }
    public SetMatrix4(name: string, matrix: Matrix4) { this.SetUniformDataFromArray(name, matrix.elements) }
    public SetVector2(name: string, vector: Vector2) { this.SetUniformDataFromArray(name, vector.elements) }
    public SetVector3(name: string, vector: Vector3) { this.SetUniformDataFromArray(name, vector.elements) }
    public SetVector4(name: string, vector: Vector4) { this.SetUniformDataFromArray(name, vector.elements) }

    public SetTexture(name: string, texture: Texture) { this.SetUniformDataFromBuffer(name, texture) }
    public SetSampler(name: string, sampler: TextureSampler) { this.SetUniformDataFromBuffer(name, sampler) }
    public SetBuffer(name: string, buffer: Buffer | DynamicBuffer) { this.SetUniformDataFromBuffer(name, buffer) }

    public HasBuffer(name: string): boolean { return this.uniformMap.get(name)?.buffer ? true : false }

    public Compile() { }
    public OnPreRender(geometry: Geometry): boolean { return true; }

    public Destroy() {
        const crcs = this.BuildBindGroupsCRC();
        for (const crc of crcs) {
            if (BindGroupCache.delete(crc) === true) {
                Renderer.info.bindGroupsStat -= 1;
            }
        }

        // TODO: Efficiency
        for (const bindGroupLayout of this.bindGroupLayouts) {
            for (const [cachedBindGroupLayoutName, cachedBindGroupLayout] of BindGroupLayoutCache) {
                if (bindGroupLayout === cachedBindGroupLayout) {
                    if (BindGroupLayoutCache.delete(cachedBindGroupLayoutName) === true) {
                        Renderer.info.bindGroupLayoutsStat -= 1;
                    }
                }
            }
        }

        Renderer.info.compiledShadersStat -= 1;
    }
}

export class Shader extends BaseShader {
    private readonly vertexEntrypoint: string | undefined;
    private readonly fragmentEntrypoint: string | undefined;
    declare public readonly params: ShaderParams;
    private attributeMap: Map<string, ShaderAttribute> = new Map();

    protected _pipeline: GPURenderPipeline | null = null;
    public get pipeline() { return this._pipeline };

    constructor(params: ShaderParams) {
        super(params);
        this.params = params;
        this.vertexEntrypoint = this.params.vertexEntrypoint;
        this.fragmentEntrypoint = this.params.fragmentEntrypoint;

        if (this.params.attributes) this.attributeMap = new Map(Object.entries(this.params.attributes));
    }

    public static async Create(params: ShaderParams): Promise<Shader> {
        params.code = await ShaderPreprocessor.ProcessIncludesV2(params.code);
        const reflectionSource = params.defines ? ShaderPreprocessor.ProcessDefines(params.code, params.defines) : params.code;
        const reflection = ReflectWGSL(reflectionSource, params.vertexEntrypoint ?? "vertexMain");
        if (!params.attributes) params.attributes = reflection.attributes;
        if (!params.uniforms) params.uniforms = reflection.uniforms;
        else for (const [name, uniform] of Object.entries(reflection.uniforms)) if (!params.uniforms[name]) params.uniforms[name] = uniform;
        return new Shader(params);
    }

    // TODO: This needs cleaning
    public Compile() {
        if (!(this.needsUpdate || !this.pipeline || !this.bindGroups)) {
            return;
        }

        let hasCompiled = false;

        this.bindGroupLayouts = this.BuildBindGroupLayouts();
        this._bindGroups = this.BuildBindGroups();

        let bindGroupLayoutsCRC = "";
        for (const b of this.bindGroupLayouts) {
            bindGroupLayoutsCRC += b["crc"]; // Meh
        }

        let pipelineLayout = pipelineLayoutCache.get(bindGroupLayoutsCRC);
        if (pipelineLayout === undefined) {
            pipelineLayout = Renderer.device.createPipelineLayout({
                bindGroupLayouts: this.bindGroupLayouts
            });
            pipelineLayout.label = UUID();
            pipelineLayoutCache.set(bindGroupLayoutsCRC, pipelineLayout);
            hasCompiled = true;

        }

        // Pipeline descriptor
        let targets: GPUColorTargetState[] = [];
        for (const output of this.params.colorOutputs) targets.push({
            format: output.format,
            blend: blendState(output.blendMode)
        });
        const pipelineDescriptor: GPURenderPipelineDescriptor = {
            layout: pipelineLayout,
            vertex: { module: this.module, entryPoint: this.vertexEntrypoint, buffers: [] },
            fragment: { module: this.module, entryPoint: this.fragmentEntrypoint, targets: targets },
            primitive: {
                topology: this.params.topology ? this.params.topology : "triangle-list",
                frontFace: this.params.frontFace ? this.params.frontFace : "ccw",
                cullMode: this.params.cullMode ? this.params.cullMode : "back"
            }
        }

        // Pipeline descriptor - Depth target
        if (this.params.depthOutput) {
            pipelineDescriptor.depthStencil = {
                depthWriteEnabled: this.params.depthWriteEnabled !== undefined ? this.params.depthWriteEnabled : true,
                depthCompare: this.params.depthCompare ? this.params.depthCompare : 'less',
                depthBias: this.params.depthBias ? this.params.depthBias : undefined,
                depthBiasSlopeScale: this.params.depthBiasSlopeScale ? this.params.depthBiasSlopeScale : undefined,
                depthBiasClamp: this.params.depthBiasClamp ? this.params.depthBiasClamp : undefined,
                format: this.params.depthOutput
            };
        }

        // Pipeline descriptor - Vertex buffers (Attributes)
        const buffers: GPUVertexBufferLayout[] = [];
        for (const [_, attribute] of this.attributeMap) {
            // @ts-ignore
            buffers.push({ arrayStride: attribute.size * 4, attributes: [{ shaderLocation: attribute.location, offset: 0, format: WGSLShaderAttributeFormat[attribute.type] }] })
        }
        pipelineDescriptor.vertex.buffers = buffers;




        pipelineDescriptor.label += "," + pipelineLayout.label;
        const pipelineDescriptorKey = JSON.stringify(pipelineDescriptor) + this.params.code; // TODO: Use code CRC or something better
        let pipeline = pipelineCache.get(pipelineDescriptorKey);
        if (!pipeline) {
            pipeline = Renderer.device.createRenderPipeline(pipelineDescriptor);
            pipelineCache.set(pipelineDescriptorKey, pipeline);
            hasCompiled = true;
        }

        this._pipeline = pipeline;

        if (hasCompiled === true) {
            Renderer.info.compiledShadersStat += 1;
        }

        this.needsUpdate = false;
    }

    public GetAttributeSlot(name: string): number | undefined {
        return this.attributeMap.get(name)?.location;
    }
}

export class ShaderCompute extends BaseShader {
    private readonly computeEntrypoint: string | undefined;

    public readonly params: ShaderComputeParams;
    protected _pipeline: GPUComputePipeline | null = null;
    public get pipeline() { return this._pipeline };

    constructor(params: ShaderComputeParams) {
        super(params);
        this.params = params;
        this.computeEntrypoint = params.computeEntrypoint;
    }

    /**
     * @example
     * ```js
     * const = await GPU.ShaderCompute.Create({
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
    public static async Create(params: ShaderComputeParams): Promise<ShaderCompute> {
        params.code = await ShaderPreprocessor.ProcessIncludesV2(params.code);
        const reflectionSource = params.defines ? ShaderPreprocessor.ProcessDefines(params.code, params.defines) : params.code;
        const reflection = ReflectWGSL(reflectionSource);
        if (!params.uniforms) params.uniforms = reflection.uniforms;
        else for (const [name, uniform] of Object.entries(reflection.uniforms)) if (!params.uniforms[name]) params.uniforms[name] = uniform;
        return new ShaderCompute(params);
    }

    public Compile() {
        if (!(this.needsUpdate || !this.pipeline || !this.bindGroups)) {
            return;
        }

        this.bindGroupLayouts = this.BuildBindGroupLayouts();
        this._bindGroups = this.BuildBindGroups();

        // let pipelineLayout = pipelineLayoutCache.get(this.bindGroupLayouts);
        // if (pipelineLayout === undefined) {
        let pipelineLayout = Renderer.device.createPipelineLayout({
            bindGroupLayouts: this.bindGroupLayouts
        });
        //     pipelineLayoutCache.set(this.bindGroupLayouts, pipelineLayout);
        // }

        // Pipeline descriptor
        const pipelineDescriptor: GPUComputePipelineDescriptor = {
            layout: pipelineLayout,
            compute: { module: this.module, entryPoint: this.computeEntrypoint }
        }

        // Pipeline
        this._pipeline = Renderer.device.createComputePipeline(pipelineDescriptor);

        Renderer.info.compiledShadersStat += 1;

        this.needsUpdate = false;
    }

}