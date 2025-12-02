import { WEBGPUBaseShader } from "./WEBGPUBaseShader";
import { WEBGPURenderer } from "./WEBGPURenderer";
import { BlendMode, Shader, ShaderAttribute, ShaderParams } from "../Shader";
import { UUID } from "../../utils";
import { Renderer } from "../Renderer";

const BindGroupCache: Map<string, GPUBindGroup> = new Map();

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

export class WEBGPUShader extends WEBGPUBaseShader implements Shader {
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

    // TODO: This needs cleaning
    public Compile() {
        if (!(this.needsUpdate || !this.pipeline || !this.bindGroups)) {
            return;
        }

        let hasCompiled = false;

        this.bindGroupLayouts = this.BuildBindGroupLayouts();
        this._bindGroups = this.BuildBindGroups();

        let bindGroupLayoutsCRC = "";
        for (const b of this.bindGroupLayouts) bindGroupLayoutsCRC += b.label;

        let pipelineLayout = pipelineLayoutCache.get(bindGroupLayoutsCRC);
        if (pipelineLayout === undefined) {
            pipelineLayout = WEBGPURenderer.device.createPipelineLayout({
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
            pipeline = WEBGPURenderer.device.createRenderPipeline(pipelineDescriptor);
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

    public Serialize(): Object {
        return {
            code: this.params.code,
            defines: this.params.defines,
            attributes: this.params.attributes,
            uniforms: Object.entries(this.params.uniforms).map(([key, value]) => { return { group: value.group, binding: value.binding, type: value.type }}),
            vertexEntrypoint: this.params.vertexEntrypoint,
            fragmentEntrypoint: this.params.fragmentEntrypoint,
            colorOutputs: this.params.colorOutputs,
            depthOutput: this.params.depthOutput,
            depthCompare: this.params.depthCompare,
            depthBiasSlopeScale: this.params.depthBiasSlopeScale,
            depthBiasClamp: this.params.depthBiasClamp,
            depthWriteEnabled: this.params.depthWriteEnabled,
            topology: this.params.topology,
            frontFace: this.params.frontFace,
            cullMode: this.params.cullMode,
        };
    }
}