import { Geometry, VertexAttribute } from "../Geometry";
import { Color } from "../math/Color";
import { Renderer } from "./Renderer";
import { Shader, Topology } from "./Shader";
import { DepthTexture, RenderTexture, Texture } from "./Texture";
import { Buffer, DynamicBuffer } from "./Buffer";
import { WEBGPUTimestampQuery } from "./webgpu/utils/WEBGPUTimestampQuery";

export interface RenderTarget {
    target?: RenderTexture;
    clear: boolean;
    color?: Color;
};

export interface DepthTarget {
    target: DepthTexture;
    clear: boolean;
};

export interface TextureCopyParameters {
    texture: Texture;
    mipLevel?: number;
    origin?: number[];
}

export interface BufferCopyParameters {
    buffer: Buffer
    offset?: number;
    bytesPerRow?: number;
    rowsPerImage?: number;
}

export class RendererContext implements RendererContext {
    private static activeRenderPass: GPURenderPassEncoder | null = null;

    public static HasActiveRenderPass(): boolean { return this.activeRenderPass instanceof GPURenderPassEncoder };

    public static BeginRenderPass(name: string, renderTargets: RenderTarget[], depthTarget?: DepthTarget, timestamp: boolean = false) {
        const activeCommandEncoder = Renderer.GetActiveCommandEncoder();
        if (!activeCommandEncoder) throw Error("No active command encoder!!");
        if (this.activeRenderPass) throw Error("There is already an active render pass");

        const renderPassDescriptor: GPURenderPassDescriptor = { colorAttachments: [], label: "RenderPassDescriptor: " + name};

        if (timestamp === true) renderPassDescriptor.timestampWrites = WEBGPUTimestampQuery.BeginRenderTimestamp(name);

        const attachments: GPURenderPassColorAttachment[] = [];
        for (const renderTarget of renderTargets) {
            attachments.push({
                view: renderTarget.target ? (renderTarget.target as Texture).GetView() : Renderer.context.getCurrentTexture().createView(),
                clearValue: renderTarget.color,
                loadOp: renderTarget.clear ? "clear" : "load",
                storeOp: 'store',                
            })
        }
        renderPassDescriptor.colorAttachments = attachments;
        
        if (depthTarget?.target) {
            renderPassDescriptor.depthStencilAttachment = {
                view: (depthTarget.target as Texture).GetView(),
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

    private static BindGeometry(shader: Shader, geometry?: Geometry) {
        if (!this.activeRenderPass) throw Error("No active render pass");

        shader.Compile();

        if (!shader.pipeline) throw Error("Shader doesnt have a pipeline");

        // Debug
        Renderer.info.drawCallsStat += 1;
        Renderer.info.drawCalls.set(this.activeRenderPass.label, shader);

        // Bind pipeline
        this.activeRenderPass.setPipeline(shader.pipeline);
        for (let i = 0; i < shader.bindGroups.length; i++) {
            let dynamicOffsets: number[] = [];
            for (const buffer of shader.bindGroupsInfo[i].buffers) {
                if (buffer instanceof DynamicBuffer)  {
                    dynamicOffsets.push(buffer.dynamicOffset);
                }
            }
            this.activeRenderPass.setBindGroup(i, shader.bindGroups[i], dynamicOffsets);
        }
        
        if (!geometry) return;

        // Bind buffers
        for (const [name, attribute] of geometry.attributes) {
            const attributeSlot = shader.GetAttributeSlot(name);
            if (attributeSlot === undefined) continue;
            const attributeBuffer = attribute.buffer as Buffer;
            this.activeRenderPass.setVertexBuffer(attributeSlot, attributeBuffer.GetBuffer(), attribute.currentOffset, attribute.currentSize);
            Renderer.info.frameVertexBuffersStat++;
        }

        if (geometry.index) {
            const indexBuffer = geometry.index.buffer as Buffer;
            this.activeRenderPass.setIndexBuffer(indexBuffer.GetBuffer(), geometry.index.format, geometry.index.currentOffset, geometry.index.currentSize);
            Renderer.info.frameIndexBufferStat++;
        }

    }

    public static DrawGeometry(geometry: Geometry, shader: Shader, instanceCount = 1, firstInstance = 0) {
        if (!shader.OnPreRender(geometry)) return;

        this.BindGeometry(shader, geometry);

        if (!shader.params.topology || shader.params.topology === Topology.Triangles) {
            if (!geometry.index) {
                const positions = geometry.attributes.get("position") as VertexAttribute;
                const vertexCount = positions.GetBuffer().size / 4 / 3;
                this.activeRenderPass.draw(vertexCount, instanceCount, 0, firstInstance);
            }
            else {
                const indexCount = geometry.index.count;
                this.activeRenderPass.drawIndexed(indexCount, instanceCount, 0, 0, firstInstance);
            }
        }
        else if (shader.params.topology === Topology.Lines) {
            const positions = geometry.attributes.get("position") as VertexAttribute;
            this.activeRenderPass.draw(positions.GetBuffer().size / 3 / 4, instanceCount, 0, firstInstance);
        }
    }

    public static DrawIndexed(geometry: Geometry, shader: Shader, indexCount: number, instanceCount?: number, firstIndex?: number, baseVertex?: number, firstInstance?: number) {
        this.BindGeometry(shader, geometry);
        this.activeRenderPass.drawIndexed(indexCount, instanceCount, firstIndex, baseVertex, firstInstance);
    }

    public static Draw(geometry: Geometry, shader: Shader, vertexCount: number, instanceCount?: number, firstVertex?: number, firstInstance?: number) {
        this.BindGeometry(shader, geometry);
        this.activeRenderPass.draw(vertexCount, instanceCount, firstVertex, firstInstance);
    }

    public static DrawVertex(shader: Shader, vertexCount: number, instanceCount?: number, firstVertex?: number, firstInstance?: number) {
        this.BindGeometry(shader);
        this.activeRenderPass.draw(vertexCount, instanceCount, firstVertex, firstInstance);
    }

    public static DrawIndirect(geometry: Geometry, shader: Shader, indirectBuffer: Buffer, indirectOffset: number = 0) {
        if (!shader.OnPreRender(geometry)) return;

        this.BindGeometry(shader, geometry);

        if (!geometry.index) {
            this.activeRenderPass.drawIndirect(indirectBuffer.GetBuffer(), indirectOffset);
        }
        else {
            this.activeRenderPass.drawIndexedIndirect(indirectBuffer.GetBuffer(), indirectOffset);
        }
    }

    public static SetViewport(x: number, y: number, width: number, height: number, minDepth: number = 0, maxDepth: number = 1) {
        if (!this.activeRenderPass) throw Error("No active render pass");
        this.activeRenderPass.setViewport(x, y, width, height, minDepth, maxDepth);
    }

    public static SetScissor(x: number, y: number, width: number, height: number) {
        if (!this.activeRenderPass) throw Error("No active render pass");
        this.activeRenderPass.setScissorRect(x, y, width, height);
    }

    public static CopyBufferToBuffer(source: Buffer, destination: Buffer, sourceOffset: number = 0, destinationOffset: number = 0, size: number | undefined = undefined) {
        const activeCommandEncoder = Renderer.GetActiveCommandEncoder();
        if (!activeCommandEncoder) throw Error("No active command encoder!!");

        activeCommandEncoder.copyBufferToBuffer(source.GetBuffer(), sourceOffset, destination.GetBuffer(), destinationOffset, size);
    }

    public static CopyBufferToTexture(source: BufferCopyParameters, destination: TextureCopyParameters, copySize?: number[]) {
        const activeCommandEncoder = Renderer.GetActiveCommandEncoder();
        if (!activeCommandEncoder) throw Error("No active command encoder!!");

        const sourceParameters: GPUImageCopyBuffer = {buffer: (source.buffer as Buffer).GetBuffer(), offset: source.offset, bytesPerRow: source.bytesPerRow, rowsPerImage: source.rowsPerImage};
        const destinationParameters: GPUImageCopyTexture = {texture: (destination.texture as Texture).GetBuffer(), mipLevel: destination.mipLevel, origin: destination.origin};
        const extents = copySize ? copySize : [destination.texture.width, destination.texture.height, destination.texture.depth];

        activeCommandEncoder.copyBufferToTexture(sourceParameters, destinationParameters, extents);
    }

    // CopyTexture(Texture src, int srcElement, int srcMip, Texture dst, int dstElement, int dstMip);
    public static CopyTextureToTexture(source: Texture, destination: Texture, srcMip: number, dstMip: number, size?: number[]) {
        const activeCommandEncoder = Renderer.GetActiveCommandEncoder();
        if (!activeCommandEncoder) throw Error("No active command encoder!!");

        const extents = size ? size : [source.width, source.height, source.depth];
        activeCommandEncoder.copyTextureToTexture({texture: source.GetBuffer(), mipLevel: srcMip}, {texture: destination.GetBuffer(), mipLevel: dstMip}, extents);
    }

    public static CopyTextureToBuffer(source: Texture, destination: Buffer, srcMip: number, size?: number[]) {
        const activeCommandEncoder = Renderer.GetActiveCommandEncoder();
        if (!activeCommandEncoder) throw Error("No active command encoder!!");

        const extents = size ? size : [source.width, source.height, source.depth];
        // TODO: Handle format in bytesPerRow or allow param
        activeCommandEncoder.copyTextureToBuffer({texture: source.GetBuffer(), mipLevel: srcMip}, {buffer: destination.GetBuffer(), bytesPerRow: source.width * 4}, extents);
    }    

    public static CopyTextureToBufferV2(source: TextureCopyParameters, destination: BufferCopyParameters, copySize?: number[]) {
        const activeCommandEncoder = Renderer.GetActiveCommandEncoder();
        if (!activeCommandEncoder) throw Error("No active command encoder!!");

        const sourceParameters: GPUImageCopyTexture = {texture: (source.texture as Texture).GetBuffer(), mipLevel: source.mipLevel, origin: source.origin};
        const destinationParameters: GPUImageCopyBuffer = {buffer: (destination.buffer as Buffer).GetBuffer(), offset: destination.offset, bytesPerRow: destination.bytesPerRow, rowsPerImage: destination.rowsPerImage};
        const extents = copySize ? copySize : [source.texture.width, source.texture.height, source.texture.depth];
        activeCommandEncoder.copyTextureToBuffer(sourceParameters, destinationParameters, extents);
    }    

    public static CopyTextureToTextureV2(source: Texture, destination: Texture, srcMip: number, dstMip: number, size?: number[], depth?: number) {
        const activeCommandEncoder = Renderer.GetActiveCommandEncoder();
        if (!activeCommandEncoder) throw Error("No active command encoder!!");

        const extents = size ? size : [source.width, source.height, source.depth];
        activeCommandEncoder.copyTextureToTexture(
            { texture: source.GetBuffer(), mipLevel: srcMip, origin: {x: 0, y: 0, z: 0}}, 
            { texture: destination.GetBuffer(), mipLevel: dstMip, origin: {x: 0, y: 0, z: depth ? depth : 0} },
            extents 
        );
    }

    public static CopyTextureToTextureV3(source: TextureCopyParameters, destination: TextureCopyParameters, copySize?: number[]) {
        const activeCommandEncoder = Renderer.GetActiveCommandEncoder();
        if (!activeCommandEncoder) throw Error("No active command encoder!!");

        const sourceParameters: GPUTexelCopyTextureInfo = {texture: (source.texture as Texture).GetBuffer(), mipLevel: source.mipLevel, origin: source.origin};
        const destinationParameters: GPUTexelCopyTextureInfo = {texture: (destination.texture as Texture).GetBuffer(), mipLevel: destination.mipLevel, origin: destination.origin};
        const extents = copySize ? copySize : [source.texture.width, source.texture.height, source.texture.depth];
        activeCommandEncoder.copyTextureToTexture(sourceParameters, destinationParameters, extents);
    }

    public static ClearBuffer(buffer: Buffer, offset: number, size: number) {
        const activeCommandEncoder = Renderer.GetActiveCommandEncoder();
        if (!activeCommandEncoder) throw Error("No active command encoder!!");

        activeCommandEncoder.clearBuffer(buffer.GetBuffer(), offset, size);
    }
}