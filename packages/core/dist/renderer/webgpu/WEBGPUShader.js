import { WEBGPUBaseShader } from "./WEBGPUBaseShader";
import { WEBGPURenderer } from "./WEBGPURenderer";
import { RendererDebug } from "../RendererDebug";
import { Utils } from "../../utils/Utils";
const BindGroupCache = new Map();
export const pipelineLayoutCache = new Map();
const pipelineCache = new Map();
// TODO: Make this error!!
const WGSLShaderAttributeFormat = {
    vec2: "float32x2",
    vec3: "float32x3",
    vec4: "float32x4",
};
export class WEBGPUShader extends WEBGPUBaseShader {
    vertexEntrypoint;
    fragmentEntrypoint;
    attributeMap = new Map();
    _pipeline = null;
    get pipeline() { return this._pipeline; }
    ;
    constructor(params) {
        super(params);
        this.params = params;
        this.vertexEntrypoint = this.params.vertexEntrypoint;
        this.fragmentEntrypoint = this.params.fragmentEntrypoint;
        if (this.params.attributes)
            this.attributeMap = new Map(Object.entries(this.params.attributes));
    }
    // TODO: This needs cleaning
    Compile() {
        if (!(this.needsUpdate || !this.pipeline || !this.bindGroups)) {
            return;
        }
        // console.warn("Compiling shader");
        // console.warn('%c Compiling shader', 'color: #3498db');
        let hasCompiled = false;
        this.bindGroupLayouts = this.BuildBindGroupLayouts();
        this._bindGroups = this.BuildBindGroups();
        let bindGroupLayoutsCRC = "";
        for (const b of this.bindGroupLayouts)
            bindGroupLayoutsCRC += b.label;
        let pipelineLayout = pipelineLayoutCache.get(bindGroupLayoutsCRC);
        if (pipelineLayout === undefined) {
            pipelineLayout = WEBGPURenderer.device.createPipelineLayout({
                bindGroupLayouts: this.bindGroupLayouts
            });
            pipelineLayout.label = Utils.UUID();
            pipelineLayoutCache.set(bindGroupLayoutsCRC, pipelineLayout);
            hasCompiled = true;
        }
        // Pipeline descriptor
        let targets = [];
        for (const output of this.params.colorOutputs)
            targets.push({
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
        const pipelineDescriptor = {
            layout: pipelineLayout,
            vertex: { module: this.module, entryPoint: this.vertexEntrypoint, buffers: [] },
            fragment: { module: this.module, entryPoint: this.fragmentEntrypoint, targets: targets },
            primitive: {
                topology: this.params.topology ? this.params.topology : "triangle-list",
                frontFace: this.params.frontFace ? this.params.frontFace : "ccw",
                cullMode: this.params.cullMode ? this.params.cullMode : "back"
            }
        };
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
        const buffers = [];
        for (const [_, attribute] of this.attributeMap) {
            // @ts-ignore
            buffers.push({ arrayStride: attribute.size * 4, attributes: [{ shaderLocation: attribute.location, offset: 0, format: WGSLShaderAttributeFormat[attribute.type] }] });
        }
        pipelineDescriptor.vertex.buffers = buffers;
        pipelineDescriptor.label += "," + pipelineLayout.label;
        const pipelineDescriptorKey = JSON.stringify(pipelineDescriptor);
        let pipeline = pipelineCache.get(pipelineDescriptorKey);
        if (!pipeline) {
            pipeline = WEBGPURenderer.device.createRenderPipeline(pipelineDescriptor);
            pipelineCache.set(pipelineDescriptorKey, pipeline);
            hasCompiled = true;
        }
        this._pipeline = pipeline;
        if (hasCompiled === true) {
            console.warn('%c Compiling shader', 'color: #3498db');
            RendererDebug.IncrementShaderCompiles(1);
        }
        // // Pipeline
        // this._pipeline = WEBGPURenderer.device.createRenderPipeline(pipelineDescriptor);
        this.needsUpdate = false;
    }
    GetAttributeSlot(name) {
        return this.attributeMap.get(name)?.location;
    }
}
