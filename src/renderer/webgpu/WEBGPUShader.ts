import { WEBGPUBaseShader } from "./WEBGPUBaseShader";
import { WEBGPURenderer } from "./WEBGPURenderer";
import { Shader, ShaderAttribute, ShaderParams } from "../Shader";

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

    public RebuildDescriptors() {
        console.warn("Compiling shader")

        this._bindGroupsInfo = this.BuildBindGroupLayouts();
        const bindGroupLayouts: GPUBindGroupLayout[] = [];
        this._bindGroups = [];
        for (const bindGroupInfo of this._bindGroupsInfo) {
            const bindGroupLayout = WEBGPURenderer.device.createBindGroupLayout({entries: bindGroupInfo.layoutEntries});
            bindGroupLayouts.push(bindGroupLayout);

            const bindGroup = WEBGPURenderer.device.createBindGroup({ layout: bindGroupLayout, entries: bindGroupInfo.entries });
            this._bindGroups.push(bindGroup);
        }

        const pipelineLayout = WEBGPURenderer.device.createPipelineLayout({
            bindGroupLayouts: bindGroupLayouts  // Array of all bind group layouts used
        });

        // Pipeline descriptor
        let targets: GPUColorTargetState[] = [];
        for (const output of this.params.colorOutputs) targets.push({
            format: output.format,
            // blend: {
            //     color: {
            //         srcFactor: "one",
            //         dstFactor: "one"
            //     },
            //     alpha: {

            //     }}
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
            depthCompare: 'less',
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