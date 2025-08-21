import { Geometry, VertexAttribute } from "../../Geometry";
import { BufferCopyParameters, DepthTarget, RenderTarget, RendererContext, TextureCopyParameters } from "../RendererContext";
import { Renderer } from "../Renderer";
import { Topology } from "../Shader";
import { WEBGPUBuffer, WEBGPUDynamicBuffer } from "./WEBGPUBuffer";
import { WEBGPURenderer } from "./WEBGPURenderer";
import { WEBGPUShader } from "./WEBGPUShader";
import { WEBGPUTexture } from "./WEBGPUTexture";
import { WEBGPUTimestampQuery } from "./WEBGPUTimestampQuery";

export class WEBGPURendererContext implements RendererContext {
    private static activeRenderPass: GPURenderPassEncoder | null = null;

    public static BeginRenderPass(name: string, renderTargets: RenderTarget[], depthTarget?: DepthTarget, timestamp?: boolean) {
        const activeCommandEncoder = WEBGPURenderer.GetActiveCommandEncoder();
        if (!activeCommandEncoder) throw Error("No active command encoder!!");
        if (this.activeRenderPass) throw Error("There is already an active render pass");

        const renderPassDescriptor: GPURenderPassDescriptor = { colorAttachments: [], label: "RenderPassDescriptor: " + name};

        if (timestamp === true) renderPassDescriptor.timestampWrites = WEBGPUTimestampQuery.BeginRenderTimestamp(name);

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
                depthStoreOp: 'store',
            };
        }

        this.activeRenderPass = activeCommandEncoder.beginRenderPass(renderPassDescriptor);
        this.activeRenderPass.label = "RenderPass: " + name;
    }

    public static EndRenderPass() {
        if (!this.activeRenderPass) throw Error("No active render pass");
        this.activeRenderPass.end();

        this.activeRenderPass = null;
        
        WEBGPUTimestampQuery.EndRenderTimestamp();
    }

    private static PrepareDraw(geometry: Geometry, shader: WEBGPUShader) {
        if (!this.activeRenderPass) throw Error("No active render pass");

        if (!shader.OnPreRender()) return;
        shader.Compile();

        if (!shader.pipeline) throw Error("Shader doesnt have a pipeline");

        Renderer.info.drawCallsStat += 1;

        this.activeRenderPass.setPipeline(shader.pipeline);
        for (let i = 0; i < shader.bindGroups.length; i++) {
            let dynamicOffsets: number[] = [];
            for (const buffer of shader.bindGroupsInfo[i].buffers) {
                if (buffer instanceof WEBGPUDynamicBuffer)  {
                    dynamicOffsets.push(buffer.dynamicOffset);
                }
            }
            this.activeRenderPass.setBindGroup(i, shader.bindGroups[i], dynamicOffsets);
        }
        
        for (const [name, attribute] of geometry.attributes) {
            const attributeSlot = shader.GetAttributeSlot(name);
            if (attributeSlot === undefined) continue;
            const attributeBuffer = attribute.buffer as WEBGPUBuffer;
            this.activeRenderPass.setVertexBuffer(attributeSlot, attributeBuffer.GetBuffer(), attribute.currentOffset, attribute.currentSize);
        }

        if (geometry.index) {
            const indexBuffer = geometry.index.buffer as WEBGPUBuffer;
            this.activeRenderPass.setIndexBuffer(indexBuffer.GetBuffer(), "uint32", geometry.index.currentOffset, geometry.index.currentSize);
        }
    }

    public static DrawGeometry(geometry: Geometry, shader: WEBGPUShader, instanceCount = 1, firstInstance = 0) {
        this.PrepareDraw(geometry, shader);

        if (!shader.params.topology || shader.params.topology === Topology.Triangles) {
            if (!geometry.index) {
                const positions = geometry.attributes.get("position") as VertexAttribute;
                const vertexCount = positions.GetBuffer().size / 3 / 4;
                this.activeRenderPass.draw(vertexCount, instanceCount, 0, firstInstance);
                Renderer.info.triangleCount += vertexCount * instanceCount;
            }
            else {
                const indexBuffer = geometry.index.buffer as WEBGPUBuffer;
                this.activeRenderPass.setIndexBuffer(indexBuffer.GetBuffer(), "uint32", geometry.index.currentOffset, geometry.index.currentSize);
                this.activeRenderPass.drawIndexed(indexBuffer.size / 4, instanceCount, 0, 0, firstInstance);
                Renderer.info.triangleCount += indexBuffer.size / 4 * instanceCount;
            }
        }
        else if (shader.params.topology === Topology.Lines) {
            const positions = geometry.attributes.get("position") as VertexAttribute;
            this.activeRenderPass.draw(positions.GetBuffer().size / 3 / 4, instanceCount);
            Renderer.info.triangleCount += positions.GetBuffer().size / 3 / 4 * instanceCount;
        }
    }

    public static DrawIndexed(geometry: Geometry, shader: WEBGPUShader, indexCount: number, instanceCount?: number, firstIndex?: number, baseVertex?: number, firstInstance?: number) {
        this.PrepareDraw(geometry, shader);
        this.activeRenderPass.drawIndexed(indexCount, instanceCount, firstIndex, baseVertex, firstInstance);
        Renderer.info.triangleCount += indexCount * instanceCount;
    }

    public static DrawIndirect(geometry: Geometry, shader: WEBGPUShader, indirectBuffer: WEBGPUBuffer, indirectOffset: number) {
        if (!this.activeRenderPass) throw Error("No active render pass");

        shader.Compile();

        if (!shader.pipeline) throw Error("Shader doesnt have a pipeline");

        this.activeRenderPass.setPipeline(shader.pipeline);
        for (let i = 0; i < shader.bindGroups.length; i++) {
            let dynamicOffsetsV2: number[] = [];
            for (const buffer of shader.bindGroupsInfo[i].buffers) {
                if (buffer instanceof WEBGPUDynamicBuffer)  {
                    dynamicOffsetsV2.push(buffer.dynamicOffset);
                }
            }
            this.activeRenderPass.setBindGroup(i, shader.bindGroups[i], dynamicOffsetsV2);
        }
        
        for (const [name, attribute] of geometry.attributes) {
            const attributeSlot = shader.GetAttributeSlot(name);
            if (attributeSlot === undefined) continue;
            const attributeBuffer = attribute.buffer as WEBGPUBuffer;
            this.activeRenderPass.setVertexBuffer(attributeSlot, attributeBuffer.GetBuffer());
        }

        if (!geometry.index) {
            this.activeRenderPass.drawIndirect(indirectBuffer.GetBuffer(), indirectOffset);
        }
        else {
            const indexBuffer = geometry.index.buffer as WEBGPUBuffer;
            this.activeRenderPass.setIndexBuffer(indexBuffer.GetBuffer(), "uint32");
            this.activeRenderPass.drawIndexedIndirect(indirectBuffer.GetBuffer(), indirectOffset);
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

    public static CopyBufferToBuffer(source: WEBGPUBuffer, destination: WEBGPUBuffer, sourceOffset: number, destinationOffset: number, size: number) {
        const activeCommandEncoder = WEBGPURenderer.GetActiveCommandEncoder();
        if (!activeCommandEncoder) throw Error("No active command encoder!!");

        activeCommandEncoder.copyBufferToBuffer(source.GetBuffer(), sourceOffset, destination.GetBuffer(), destinationOffset, size);
    }

    public static CopyBufferToTexture(source: BufferCopyParameters, destination: TextureCopyParameters, copySize?: number[]) {
        const activeCommandEncoder = WEBGPURenderer.GetActiveCommandEncoder();
        if (!activeCommandEncoder) throw Error("No active command encoder!!");

        const sourceParameters: GPUImageCopyBuffer = {buffer: (source.buffer as WEBGPUBuffer).GetBuffer(), offset: source.offset, bytesPerRow: source.bytesPerRow, rowsPerImage: source.rowsPerImage};
        const destinationParameters: GPUImageCopyTexture = {texture: (destination.texture as WEBGPUTexture).GetBuffer(), mipLevel: destination.mipLevel, origin: destination.origin};
        const extents = copySize ? copySize : [destination.texture.width, destination.texture.height, destination.texture.depth];

        activeCommandEncoder.copyBufferToTexture(sourceParameters, destinationParameters, extents);
    }

    // CopyTexture(Texture src, int srcElement, int srcMip, Texture dst, int dstElement, int dstMip);
    public static CopyTextureToTexture(source: WEBGPUTexture, destination: WEBGPUTexture, srcMip: number, dstMip: number, size?: number[]) {
        const activeCommandEncoder = WEBGPURenderer.GetActiveCommandEncoder();
        if (!activeCommandEncoder) throw Error("No active command encoder!!");

        const extents = size ? size : [source.width, source.height, source.depth];
        activeCommandEncoder.copyTextureToTexture({texture: source.GetBuffer(), mipLevel: srcMip}, {texture: destination.GetBuffer(), mipLevel: dstMip}, extents);
    }

    public static CopyTextureToBuffer(source: WEBGPUTexture, destination: WEBGPUBuffer, srcMip: number, size?: number[]) {
        const activeCommandEncoder = WEBGPURenderer.GetActiveCommandEncoder();
        if (!activeCommandEncoder) throw Error("No active command encoder!!");

        const extents = size ? size : [source.width, source.height, source.depth];
        // TODO: Handle format in bytesPerRow or allow param
        activeCommandEncoder.copyTextureToBuffer({texture: source.GetBuffer(), mipLevel: srcMip}, {buffer: destination.GetBuffer(), bytesPerRow: source.width * 4}, extents);
    }    

    public static CopyTextureToBufferV2(source: TextureCopyParameters, destination: BufferCopyParameters, copySize?: number[]) {
        const activeCommandEncoder = WEBGPURenderer.GetActiveCommandEncoder();
        if (!activeCommandEncoder) throw Error("No active command encoder!!");

        const sourceParameters: GPUImageCopyTexture = {texture: (source.texture as WEBGPUTexture).GetBuffer(), mipLevel: source.mipLevel, origin: source.origin};
        const destinationParameters: GPUImageCopyBuffer = {buffer: (destination.buffer as WEBGPUBuffer).GetBuffer(), offset: destination.offset, bytesPerRow: destination.bytesPerRow, rowsPerImage: destination.rowsPerImage};
        const extents = copySize ? copySize : [source.texture.width, source.texture.height, source.texture.depth];
        activeCommandEncoder.copyTextureToBuffer(sourceParameters, destinationParameters, extents);
    }    

    public static CopyTextureToTextureV2(source: WEBGPUTexture, destination: WEBGPUTexture, srcMip: number, dstMip: number, size?: number[], depth?: number) {
        const activeCommandEncoder = WEBGPURenderer.GetActiveCommandEncoder();
        if (!activeCommandEncoder) throw Error("No active command encoder!!");

        const extents = size ? size : [source.width, source.height, source.depth];
        activeCommandEncoder.copyTextureToTexture(
            { texture: source.GetBuffer(), mipLevel: srcMip, origin: {x: 0, y: 0, z: 0}}, 
            { texture: destination.GetBuffer(), mipLevel: dstMip, origin: {x: 0, y: 0, z: depth ? depth : 0} },
            extents 
        );
    }

    public static CopyTextureToTextureV3(source: TextureCopyParameters, destination: TextureCopyParameters, copySize?: number[]) {
        const activeCommandEncoder = WEBGPURenderer.GetActiveCommandEncoder();
        if (!activeCommandEncoder) throw Error("No active command encoder!!");

        const sourceParameters: GPUImageCopyTexture = {texture: (source.texture as WEBGPUTexture).GetBuffer(), mipLevel: source.mipLevel, origin: source.origin};
        const destinationParameters: GPUImageCopyTexture = {texture: (destination.texture as WEBGPUTexture).GetBuffer(), mipLevel: destination.mipLevel, origin: destination.origin};
        const extents = copySize ? copySize : [source.texture.width, source.texture.height, source.texture.depth];
        activeCommandEncoder.copyTextureToTexture(sourceParameters, destinationParameters, extents);
    }

    public static ClearBuffer(buffer: WEBGPUBuffer, offset: number, size: number) {
        const activeCommandEncoder = WEBGPURenderer.GetActiveCommandEncoder();
        if (!activeCommandEncoder) throw Error("No active command encoder!!");

        activeCommandEncoder.clearBuffer(buffer.GetBuffer(), offset, size);
    }
}