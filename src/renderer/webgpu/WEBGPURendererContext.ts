import { Geometry } from "../../Geometry";
import { Color } from "../../math/Color";
import { RenderCommandBuffer } from "../RenderCommandBuffer";
import { RendererContext } from "../RendererContext";
import { WEBGPUBuffer } from "./WEBGPUBuffer";
import { WEBGPURenderer } from "./WEBGPURenderer";
import { WEBGPUShader } from "./WEBGPUShader";
import { WEBGPUTexture } from "./WEBGPUTexture";

interface CompiledMesh {
    pipeline: GPURenderPipeline;
    bindGroup: GPUBindGroup;
}

export class WEBGPURendererContext implements RendererContext {
    private static compiledGeometryCache: Map<string, CompiledMesh> = new Map();

    private static CompileGeometry(geometry: Geometry, shader: WEBGPUShader): CompiledMesh {

        const key = `${geometry.id}-${shader.id}`;
        let compiledMesh = this.compiledGeometryCache.get(key);
        if (compiledMesh) return compiledMesh;
        
        const pipelineDescriptor: GPURenderPipelineDescriptor = {
            layout: "auto",
            vertex: {
                module: shader.GetModule(),
                entryPoint: shader.GetVertexEntrypoint(),
                buffers: [
                    // position
                    { arrayStride: 3 * 4, attributes: [{ shaderLocation: 0, offset: 0, format: 'float32x3' }] },
                    // normals
                    { arrayStride: 3 * 4, attributes: [{ shaderLocation: 1, offset: 0, format: 'float32x3' }] }
                ]
            },
            fragment: {
                module: shader.GetModule(),
                entryPoint: shader.GetFragmentEntrypoint(),
                targets: [ { format: WEBGPURenderer.presentationFormat } ],
            },
            primitive: { topology: "triangle-list", frontFace: "ccw", cullMode: "back" },
        }
        if (shader.depthTest) pipelineDescriptor.depthStencil = { depthWriteEnabled: true, depthCompare: 'less', format: 'depth24plus' }

        const pipeline = WEBGPURenderer.device.createRenderPipeline(pipelineDescriptor)


        const bindGroupEntries: GPUBindGroupEntry[] = [];
        for (let [_, binding] of shader.GetBindings()) {
            if (!binding.buffer) throw Error(`Shader has binding (${binding.name}) but no buffer was set`);
            if (binding.buffer instanceof GPUBuffer) bindGroupEntries.push({binding: binding.binding, resource: {buffer: binding.buffer}});
            else if (binding.buffer instanceof GPUTexture) bindGroupEntries.push({binding: binding.binding, resource: binding.buffer.createView()});
            else if (binding.buffer instanceof GPUSampler) bindGroupEntries.push({binding: binding.binding, resource: binding.buffer});
        }
        
        const bindGroup = WEBGPURenderer.device.createBindGroup({
            layout: pipeline.getBindGroupLayout(0),
            entries: bindGroupEntries
        });

        compiledMesh = {pipeline: pipeline, bindGroup: bindGroup};

        this.compiledGeometryCache.set(key, compiledMesh);
        return compiledMesh;
    }

    private static GetRenderPassDescriptor(renderTarget: WEBGPUTexture | null, depthTarget: WEBGPUTexture | null, clearColor: GPULoadOp, clearDepth: GPULoadOp, backgroundColor: Color | undefined): GPURenderPassDescriptor {
        const renderPassDescriptor: GPURenderPassDescriptor = {
            colorAttachments: [
                {
                  view: renderTarget ? renderTarget.GetView() : WEBGPURenderer.context.getCurrentTexture().createView(),
                  clearValue: backgroundColor,
                  loadOp: clearColor,
                  storeOp: 'store',
                },
              ],
        }

        if (depthTarget) renderPassDescriptor.depthStencilAttachment = { view: depthTarget.GetView(), depthClearValue: 1.0, depthLoadOp: clearDepth, depthStoreOp: 'store' };
        
        return renderPassDescriptor;
    }

    public static ProcessCommandBuffer(commandBuffer: RenderCommandBuffer) {
        const geometry = commandBuffer.PopCommand("SetGeometry");
        const shader = commandBuffer.PopCommand("SetShader") as WEBGPUShader | null;
        const draw = commandBuffer.PopCommand("DrawIndexed");
        
        if (geometry && shader && draw) {
            const compiledMesh = this.CompileGeometry(geometry as Geometry, shader as WEBGPUShader);
            const vertexBuffer = commandBuffer.PopCommand("SetVertexBuffer") as WEBGPUBuffer | null;
            const normalBuffer = commandBuffer.PopCommand("SetNormalBuffer") as WEBGPUBuffer | null;
            const indexBuffer = commandBuffer.PopCommand("SetIndexBuffer") as WEBGPUBuffer | null;

            const renderTarget = commandBuffer.PopCommand("SetRenderTarget") as WEBGPUTexture | null;
            const depthTarget = commandBuffer.PopCommand("SetDepthTarget") as WEBGPUTexture | null;
            const clearCommand = commandBuffer.PopCommand("ClearRenderTarget");
            const clearColor = clearCommand && clearCommand.clearColor ? "clear" : "load";
            const clearDepth = clearCommand && clearCommand.clearDepth ? "clear" : "load";
            const backgroundColor = clearCommand ? clearCommand.backgroundColor : undefined;

            const renderPassDescriptor = this.GetRenderPassDescriptor(renderTarget, depthTarget, clearColor, clearDepth, backgroundColor);

            const activeCommandEncoder = WEBGPURenderer.GetActiveCommandEncoder();
            if (!activeCommandEncoder) throw Error("No active command encoder!!");

            const renderPass = activeCommandEncoder.beginRenderPass(renderPassDescriptor);
            renderPass.setPipeline(compiledMesh.pipeline);
            if (compiledMesh.bindGroup) renderPass.setBindGroup(0, compiledMesh.bindGroup);
            if (vertexBuffer) renderPass.setVertexBuffer(0, vertexBuffer.GetBuffer());
            if (normalBuffer) renderPass.setVertexBuffer(1, normalBuffer.GetBuffer());
            if (indexBuffer) renderPass.setIndexBuffer(indexBuffer.GetBuffer(), "uint32");
            renderPass.drawIndexed(draw.indexCount, draw.instanceCount);
            renderPass.end();
        }
    }
}