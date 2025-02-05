import { WEBGPUBaseShader } from "./WEBGPUBaseShader";
import { WEBGPURenderer } from "./WEBGPURenderer";
import { Shader, ShaderAttribute, ShaderParams } from "../Shader";
import { RendererDebug } from "../RendererDebug";

const BindGroupCache: Map<string, GPUBindGroup> = new Map();


const pipelineLayoutCache: Map<GPUBindGroupLayout[], GPUPipelineLayout> = new Map();
const pipelineCache: Map<GPURenderPipelineDescriptor, GPURenderPipeline> = new Map();

// TODO: Make this error!!
const WGSLShaderAttributeFormat = {
    vec2: "float32x2",
    vec3: "float32x3",
    vec4: "float32x4",
};

export class WEBGPUShader extends WEBGPUBaseShader implements Shader {
    private readonly vertexEntrypoint: string | undefined;
    private readonly fragmentEntrypoint: string | undefined;
    public readonly params: ShaderParams;
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

    protected Compile() {
        // console.warn("Compiling shader");
        console.warn('%c Compiling shader', 'color: #3498db');

        RendererDebug.IncrementShaderCompiles(1);

        this.bindGroupLayouts = this.BuildBindGroupLayouts();
        this._bindGroups = this.BuildBindGroups();

        // if (this.bindGroupLayouts.length !== this._bindGroupsInfo.length) {
        //     throw Error(`${this.bindGroupLayouts.length} !== ${this._bindGroupsInfo.length}`);
        // }

        // this._bindGroups = [];
        // for (let i = 0; i < this._bindGroupsInfo.length; i++) {
        //     const bindGroup = WEBGPURenderer.device.createBindGroup({ layout: this.bindGroupLayouts[i], entries: this._bindGroupsInfo[i].entries });
        //     this._bindGroups.push(bindGroup);
        // }

        let pipelineLayout = pipelineLayoutCache.get(this.bindGroupLayouts);
        if (pipelineLayout === undefined) {
            pipelineLayout = WEBGPURenderer.device.createPipelineLayout({
                bindGroupLayouts: this.bindGroupLayouts
            });
            pipelineLayoutCache.set(this.bindGroupLayouts, pipelineLayout);
        }

        // Pipeline descriptor
        let targets: GPUColorTargetState[] = [];
        for (const output of this.params.colorOutputs) targets.push({
            format: output.format,
            // blend: {
            //     color: {
            //       srcFactor: 'one',
            //       dstFactor: 'one-minus-src-alpha',
            //       operation: 'add',
            //     },
            //     alpha: {
            //       srcFactor: 'one',
            //       dstFactor: 'one-minus-src-alpha',
            //       operation: 'add',
            //     },
            // }
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
        if (this.params.depthOutput) pipelineDescriptor.depthStencil = {
            depthWriteEnabled: true,
            depthCompare: this.params.depthCompare ? this.params.depthCompare : 'less',
            depthBias: this.params.depthBias ? this.params.depthBias : undefined,
            depthBiasSlopeScale: this.params.depthBiasSlopeScale ? this.params.depthBiasSlopeScale : undefined,
            depthBiasClamp: this.params.depthBiasClamp ? this.params.depthBiasClamp : undefined,
            format: this.params.depthOutput
        };
    
        // Pipeline descriptor - Vertex buffers (Attributes)
        const buffers: GPUVertexBufferLayout[] = [];
        for (const [_, attribute] of this.attributeMap) {
            buffers.push({arrayStride: attribute.size * 4, attributes: [{ shaderLocation: attribute.location, offset: 0, format: WGSLShaderAttributeFormat[attribute.type] }] })
        }
        pipelineDescriptor.vertex.buffers = buffers;

        // Pipeline
        this._pipeline = WEBGPURenderer.device.createRenderPipeline(pipelineDescriptor);

        this.needsUpdate = false;
    }

    public GetAttributeSlot(name: string): number | undefined {
        return this.attributeMap.get(name)?.location;
    }
}