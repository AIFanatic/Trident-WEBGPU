import { Renderer } from '../Renderer.js';
import { Topology } from '../Shader.js';
import { WEBGPUDynamicBuffer } from './WEBGPUBuffer.js';
import { WEBGPURenderer } from './WEBGPURenderer.js';
import { WEBGPUTimestampQuery } from './WEBGPUTimestampQuery.js';

class WEBGPURendererContext {
  static activeRenderPass = null;
  static BeginRenderPass(name, renderTargets, depthTarget, timestamp) {
    const activeCommandEncoder = WEBGPURenderer.GetActiveCommandEncoder();
    if (!activeCommandEncoder) throw Error("No active command encoder!!");
    if (this.activeRenderPass) throw Error("There is already an active render pass");
    const renderPassDescriptor = { colorAttachments: [], label: "RenderPassDescriptor: " + name };
    if (timestamp === true) renderPassDescriptor.timestampWrites = WEBGPUTimestampQuery.BeginRenderTimestamp(name);
    const attachments = [];
    for (const renderTarget of renderTargets) {
      attachments.push({
        view: renderTarget.target ? renderTarget.target.GetView() : WEBGPURenderer.context.getCurrentTexture().createView(),
        clearValue: renderTarget.color,
        loadOp: renderTarget.clear ? "clear" : "load",
        storeOp: "store"
      });
    }
    renderPassDescriptor.colorAttachments = attachments;
    if (depthTarget?.target) {
      renderPassDescriptor.depthStencilAttachment = {
        view: depthTarget.target.GetView(),
        depthClearValue: 1,
        depthLoadOp: depthTarget.clear ? "clear" : "load",
        depthStoreOp: "store"
      };
    }
    this.activeRenderPass = activeCommandEncoder.beginRenderPass(renderPassDescriptor);
    this.activeRenderPass.label = "RenderPass: " + name;
  }
  static EndRenderPass() {
    if (!this.activeRenderPass) throw Error("No active render pass");
    this.activeRenderPass.end();
    this.activeRenderPass = null;
    WEBGPUTimestampQuery.EndRenderTimestamp();
  }
  static PrepareDraw(geometry, shader) {
    if (!this.activeRenderPass) throw Error("No active render pass");
    if (!shader.OnPreRender()) return;
    shader.Compile();
    if (!shader.pipeline) throw Error("Shader doesnt have a pipeline");
    Renderer.info.drawCallsStat += 1;
    this.activeRenderPass.setPipeline(shader.pipeline);
    for (let i = 0; i < shader.bindGroups.length; i++) {
      let dynamicOffsets = [];
      for (const buffer of shader.bindGroupsInfo[i].buffers) {
        if (buffer instanceof WEBGPUDynamicBuffer) {
          dynamicOffsets.push(buffer.dynamicOffset);
        }
      }
      this.activeRenderPass.setBindGroup(i, shader.bindGroups[i], dynamicOffsets);
    }
    for (const [name, attribute] of geometry.attributes) {
      const attributeSlot = shader.GetAttributeSlot(name);
      if (attributeSlot === void 0) continue;
      const attributeBuffer = attribute.buffer;
      this.activeRenderPass.setVertexBuffer(attributeSlot, attributeBuffer.GetBuffer(), attribute.currentOffset, attribute.currentSize);
    }
    if (geometry.index) {
      const indexBuffer = geometry.index.buffer;
      this.activeRenderPass.setIndexBuffer(indexBuffer.GetBuffer(), "uint32", geometry.index.currentOffset, geometry.index.currentSize);
    }
  }
  static DrawGeometry(geometry, shader, instanceCount = 1, firstInstance = 0) {
    this.PrepareDraw(geometry, shader);
    if (!shader.params.topology || shader.params.topology === Topology.Triangles) {
      if (!geometry.index) {
        const positions = geometry.attributes.get("position");
        const vertexCount = positions.GetBuffer().size / 4 / 4;
        this.activeRenderPass.draw(vertexCount, instanceCount, 0, firstInstance);
        Renderer.info.triangleCount += vertexCount * instanceCount;
      } else {
        const indexBuffer = geometry.index.buffer;
        this.activeRenderPass.setIndexBuffer(indexBuffer.GetBuffer(), "uint32", geometry.index.currentOffset, geometry.index.currentSize);
        this.activeRenderPass.drawIndexed(indexBuffer.size / 4, instanceCount, 0, 0, firstInstance);
        Renderer.info.triangleCount += indexBuffer.size / 4 * instanceCount;
      }
    } else if (shader.params.topology === Topology.Lines) {
      const positions = geometry.attributes.get("position");
      this.activeRenderPass.draw(positions.GetBuffer().size / 3 / 4, instanceCount, 0, firstInstance);
      Renderer.info.triangleCount += positions.GetBuffer().size / 3 / 4 * instanceCount;
    }
  }
  static DrawIndexed(geometry, shader, indexCount, instanceCount, firstIndex, baseVertex, firstInstance) {
    this.PrepareDraw(geometry, shader);
    this.activeRenderPass.drawIndexed(indexCount, instanceCount, firstIndex, baseVertex, firstInstance);
    Renderer.info.triangleCount += indexCount * instanceCount;
  }
  static DrawIndirect(geometry, shader, indirectBuffer, indirectOffset) {
    if (!this.activeRenderPass) throw Error("No active render pass");
    shader.Compile();
    if (!shader.pipeline) throw Error("Shader doesnt have a pipeline");
    this.activeRenderPass.setPipeline(shader.pipeline);
    for (let i = 0; i < shader.bindGroups.length; i++) {
      let dynamicOffsetsV2 = [];
      for (const buffer of shader.bindGroupsInfo[i].buffers) {
        if (buffer instanceof WEBGPUDynamicBuffer) {
          dynamicOffsetsV2.push(buffer.dynamicOffset);
        }
      }
      this.activeRenderPass.setBindGroup(i, shader.bindGroups[i], dynamicOffsetsV2);
    }
    for (const [name, attribute] of geometry.attributes) {
      const attributeSlot = shader.GetAttributeSlot(name);
      if (attributeSlot === void 0) continue;
      const attributeBuffer = attribute.buffer;
      this.activeRenderPass.setVertexBuffer(attributeSlot, attributeBuffer.GetBuffer());
    }
    if (!geometry.index) {
      this.activeRenderPass.drawIndirect(indirectBuffer.GetBuffer(), indirectOffset);
    } else {
      const indexBuffer = geometry.index.buffer;
      this.activeRenderPass.setIndexBuffer(indexBuffer.GetBuffer(), "uint32");
      this.activeRenderPass.drawIndexedIndirect(indirectBuffer.GetBuffer(), indirectOffset);
    }
  }
  static SetViewport(x, y, width, height, minDepth, maxDepth) {
    if (!this.activeRenderPass) throw Error("No active render pass");
    this.activeRenderPass.setViewport(x, y, width, height, minDepth, maxDepth);
  }
  static SetScissor(x, y, width, height) {
    if (!this.activeRenderPass) throw Error("No active render pass");
    this.activeRenderPass.setScissorRect(x, y, width, height);
  }
  static CopyBufferToBuffer(source, destination, sourceOffset, destinationOffset, size) {
    const activeCommandEncoder = WEBGPURenderer.GetActiveCommandEncoder();
    if (!activeCommandEncoder) throw Error("No active command encoder!!");
    activeCommandEncoder.copyBufferToBuffer(source.GetBuffer(), sourceOffset, destination.GetBuffer(), destinationOffset, size);
  }
  static CopyBufferToTexture(source, destination, copySize) {
    const activeCommandEncoder = WEBGPURenderer.GetActiveCommandEncoder();
    if (!activeCommandEncoder) throw Error("No active command encoder!!");
    const sourceParameters = { buffer: source.buffer.GetBuffer(), offset: source.offset, bytesPerRow: source.bytesPerRow, rowsPerImage: source.rowsPerImage };
    const destinationParameters = { texture: destination.texture.GetBuffer(), mipLevel: destination.mipLevel, origin: destination.origin };
    const extents = copySize ? copySize : [destination.texture.width, destination.texture.height, destination.texture.depth];
    activeCommandEncoder.copyBufferToTexture(sourceParameters, destinationParameters, extents);
  }
  // CopyTexture(Texture src, int srcElement, int srcMip, Texture dst, int dstElement, int dstMip);
  static CopyTextureToTexture(source, destination, srcMip, dstMip, size) {
    const activeCommandEncoder = WEBGPURenderer.GetActiveCommandEncoder();
    if (!activeCommandEncoder) throw Error("No active command encoder!!");
    const extents = size ? size : [source.width, source.height, source.depth];
    activeCommandEncoder.copyTextureToTexture({ texture: source.GetBuffer(), mipLevel: srcMip }, { texture: destination.GetBuffer(), mipLevel: dstMip }, extents);
  }
  static CopyTextureToBuffer(source, destination, srcMip, size) {
    const activeCommandEncoder = WEBGPURenderer.GetActiveCommandEncoder();
    if (!activeCommandEncoder) throw Error("No active command encoder!!");
    const extents = size ? size : [source.width, source.height, source.depth];
    activeCommandEncoder.copyTextureToBuffer({ texture: source.GetBuffer(), mipLevel: srcMip }, { buffer: destination.GetBuffer(), bytesPerRow: source.width * 4 }, extents);
  }
  static CopyTextureToBufferV2(source, destination, copySize) {
    const activeCommandEncoder = WEBGPURenderer.GetActiveCommandEncoder();
    if (!activeCommandEncoder) throw Error("No active command encoder!!");
    const sourceParameters = { texture: source.texture.GetBuffer(), mipLevel: source.mipLevel, origin: source.origin };
    const destinationParameters = { buffer: destination.buffer.GetBuffer(), offset: destination.offset, bytesPerRow: destination.bytesPerRow, rowsPerImage: destination.rowsPerImage };
    const extents = copySize ? copySize : [source.texture.width, source.texture.height, source.texture.depth];
    activeCommandEncoder.copyTextureToBuffer(sourceParameters, destinationParameters, extents);
  }
  static CopyTextureToTextureV2(source, destination, srcMip, dstMip, size, depth) {
    const activeCommandEncoder = WEBGPURenderer.GetActiveCommandEncoder();
    if (!activeCommandEncoder) throw Error("No active command encoder!!");
    const extents = size ? size : [source.width, source.height, source.depth];
    activeCommandEncoder.copyTextureToTexture(
      { texture: source.GetBuffer(), mipLevel: srcMip, origin: { x: 0, y: 0, z: 0 } },
      { texture: destination.GetBuffer(), mipLevel: dstMip, origin: { x: 0, y: 0, z: depth ? depth : 0 } },
      extents
    );
  }
  static CopyTextureToTextureV3(source, destination, copySize) {
    const activeCommandEncoder = WEBGPURenderer.GetActiveCommandEncoder();
    if (!activeCommandEncoder) throw Error("No active command encoder!!");
    const sourceParameters = { texture: source.texture.GetBuffer(), mipLevel: source.mipLevel, origin: source.origin };
    const destinationParameters = { texture: destination.texture.GetBuffer(), mipLevel: destination.mipLevel, origin: destination.origin };
    const extents = copySize ? copySize : [source.texture.width, source.texture.height, source.texture.depth];
    activeCommandEncoder.copyTextureToTexture(sourceParameters, destinationParameters, extents);
  }
  static ClearBuffer(buffer, offset, size) {
    const activeCommandEncoder = WEBGPURenderer.GetActiveCommandEncoder();
    if (!activeCommandEncoder) throw Error("No active command encoder!!");
    activeCommandEncoder.clearBuffer(buffer.GetBuffer(), offset, size);
  }
}

export { WEBGPURendererContext };
