import { Geometry } from "../../Geometry";
import { DepthTarget, RenderTarget, RendererContext } from "../RendererContext";
import { Topology } from "../Shader";
import { WEBGPUBuffer } from "./WEBGPUBuffer";
import { WEBGPURenderer } from "./WEBGPURenderer";
import { WEBGPUShader } from "./WEBGPUShader";
import { WEBGPUTexture } from "./WEBGPUTexture";

export class WEBGPURendererContext implements RendererContext {
    private static activeRenderPass: GPURenderPassEncoder | null = null;

    public static BeginRenderPass(name: string, renderTargets: RenderTarget[], depthTarget?: DepthTarget) {
        const activeCommandEncoder = WEBGPURenderer.GetActiveCommandEncoder();
        if (!activeCommandEncoder) throw Error("No active command encoder!!");
        if (this.activeRenderPass) throw Error("There is already an active render pass");

        const renderPassDescriptor: GPURenderPassDescriptor = { colorAttachments: [], label: "RenderPassDescriptor: " + name};

        const attachments: GPURenderPassColorAttachment[] = [];
        for (const renderTarget of renderTargets) {
            attachments.push({
                view: renderTarget.target ? (renderTarget.target as WEBGPUTexture).GetView() : WEBGPURenderer.context.getCurrentTexture().createView(),
                clearValue: renderTarget.color,
                loadOp: renderTarget.clear ? "clear" : "load",
                storeOp: 'store',                
            })
        }
        renderPassDescriptor.colorAttachments = attachments;
        
        if (depthTarget?.target) {
            renderPassDescriptor.depthStencilAttachment = {
                view: (depthTarget.target as WEBGPUTexture).GetView(),
                depthClearValue: 1.0,
                depthLoadOp: depthTarget.clear ? "clear" : "load",
                depthStoreOp: 'store'
            };
        }

        this.activeRenderPass = activeCommandEncoder.beginRenderPass(renderPassDescriptor);
        this.activeRenderPass.label = "RenderPass: " + name;
    }

    public static EndRenderPass() {
        if (!this.activeRenderPass) throw Error("No active render pass");
        this.activeRenderPass.end();
        this.activeRenderPass = null;
    }

    public static DrawGeometry(geometry: Geometry, shader: WEBGPUShader, instanceCount = 1) {
        if (!this.activeRenderPass) throw Error("No active render pass");

        shader.OnPreRender(geometry);

        if (!shader.pipeline) throw Error("Shader doesnt have a pipeline");

        this.activeRenderPass.setPipeline(shader.pipeline);
        if (shader.bindGroup) this.activeRenderPass.setBindGroup(0, shader.bindGroup);
        
        for (const [name, attribute] of geometry.attributes) {
            const attributeSlot = shader.GetAttributeSlot(name);
            if (attributeSlot === undefined) continue;
            const attributeBuffer = attribute.buffer as WEBGPUBuffer;
            this.activeRenderPass.setVertexBuffer(attributeSlot, attributeBuffer.GetBuffer());
        }

        if (!shader.params.topology || shader.params.topology === Topology.Triangles) {
            if (!geometry.index) throw Error("Drawing without indices is not supported yet");
            const indexBuffer = geometry.index.buffer as WEBGPUBuffer;
            this.activeRenderPass.setIndexBuffer(indexBuffer.GetBuffer(), "uint32");
            this.activeRenderPass.drawIndexed(indexBuffer.size / 4, instanceCount);
        }
        else if (shader.params.topology === Topology.Lines) {
            if (!geometry.index) throw Error("Cannot draw lines without index buffer");
            const numTriangles = geometry.index.array.length / 3;
            this.activeRenderPass.draw(6 * numTriangles, instanceCount);
        }
    }

    public static SetViewport(x: number, y: number, width: number, height: number, minDepth: number, maxDepth: number) {
        if (!this.activeRenderPass) throw Error("No active render pass");
        this.activeRenderPass.setViewport(x, y, width, height, minDepth, maxDepth);
    }

    public static SetScissor(x: number, y: number, width: number, height: number) {
        if (!this.activeRenderPass) throw Error("No active render pass");
        this.activeRenderPass.setScissorRect(x, y, width, height);
    }
}