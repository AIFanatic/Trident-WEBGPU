import { BufferType, Buffer } from './Buffer.js';
import { Renderer } from './Renderer.js';
import { RendererContext } from './RendererContext.js';

class MemoryAllocator {
  memorySize;
  availableMemorySize;
  freeBlocks = [];
  usedBlocks = [];
  constructor(memorySize) {
    this.memorySize = memorySize;
    this.availableMemorySize = memorySize;
    this.freeBlocks.push({ offset: 0, size: memorySize });
  }
  allocate(size) {
    for (let i = 0; i < this.freeBlocks.length; i++) {
      const block = this.freeBlocks[i];
      if (block.size >= size) {
        const offset = block.offset;
        block.offset += size;
        block.size -= size;
        this.availableMemorySize -= size;
        if (block.size === 0) {
          this.freeBlocks.splice(i, 1);
        }
        this.usedBlocks.push({ offset, size });
        return offset;
      }
    }
    throw Error("Not enough space.");
  }
  mergeFreeBlocks() {
    this.freeBlocks.sort((a, b) => a.offset - b.offset);
    for (let i = 0; i < this.freeBlocks.length - 1; ) {
      const currentBlock = this.freeBlocks[i];
      const nextBlock = this.freeBlocks[i + 1];
      if (currentBlock.offset + currentBlock.size === nextBlock.offset) {
        currentBlock.size += nextBlock.size;
        this.freeBlocks.splice(i + 1, 1);
      } else {
        i++;
      }
    }
  }
  free(offset) {
    for (let i = 0; i < this.usedBlocks.length; i++) {
      const block = this.usedBlocks[i];
      if (block.offset === offset) {
        this.usedBlocks.splice(i, 1);
        this.freeBlocks.push(block);
        this.mergeFreeBlocks();
        this.availableMemorySize += block.size;
        return;
      }
    }
    throw new Error(`No allocated block found at offset ${offset}`);
  }
}
class BufferMemoryAllocator {
  allocator;
  buffer;
  links;
  static BYTES_PER_ELEMENT = Float32Array.BYTES_PER_ELEMENT;
  bufferType;
  constructor(size, bufferType = BufferType.STORAGE) {
    this.allocator = new MemoryAllocator(size);
    this.buffer = Buffer.Create(size * BufferMemoryAllocator.BYTES_PER_ELEMENT, bufferType);
    this.links = /* @__PURE__ */ new Map();
    this.bufferType = bufferType;
  }
  has(link) {
    return this.links.has(link);
  }
  set(link, data) {
    let bufferOffset = this.links.get(link);
    if (bufferOffset === void 0) {
      bufferOffset = this.allocator.allocate(data.length);
      this.links.set(link, bufferOffset);
    }
    this.buffer.SetArray(data, bufferOffset * BufferMemoryAllocator.BYTES_PER_ELEMENT, 0, data.length);
    return bufferOffset;
  }
  delete(link) {
    const bufferOffset = this.links.get(link);
    if (bufferOffset === void 0) throw Error("Link not found");
    this.allocator.free(bufferOffset);
    this.links.delete(link);
  }
  getBuffer() {
    return this.buffer;
  }
  getAllocator() {
    return this.allocator;
  }
}
class DynamicBufferMemoryAllocator extends BufferMemoryAllocator {
  incrementAmount;
  constructor(size, incrementAmount, bufferType = BufferType.STORAGE) {
    super(size, bufferType);
    this.incrementAmount = incrementAmount ? incrementAmount : size;
  }
  set(link, data) {
    let bufferOffset = this.links.get(link);
    if (bufferOffset === void 0) {
      if (this.allocator.availableMemorySize - data.length < 0) {
        const o = this.allocator.memorySize;
        const incrementAmount = this.incrementAmount > data.length ? this.incrementAmount : data.length;
        const oldMemorySize = this.allocator.memorySize - this.allocator.availableMemorySize;
        this.allocator.memorySize += incrementAmount;
        this.allocator.availableMemorySize += incrementAmount;
        this.allocator.freeBlocks.push({ offset: oldMemorySize, size: incrementAmount });
        console.log(`Incrementing DynamicBuffer from ${o} to ${this.allocator.memorySize}`);
        const buffer = Buffer.Create(this.allocator.memorySize * BufferMemoryAllocator.BYTES_PER_ELEMENT, BufferType.STORAGE);
        const hasActiveFrame = Renderer.HasActiveFrame();
        if (!hasActiveFrame) Renderer.BeginRenderFrame();
        RendererContext.CopyBufferToBuffer(this.buffer, buffer);
        if (!hasActiveFrame) Renderer.EndRenderFrame();
        const oldBuffer = this.buffer;
        Renderer.OnFrameCompleted().then(() => {
          oldBuffer.Destroy();
        });
        this.buffer = buffer;
      }
      bufferOffset = this.allocator.allocate(data.length);
      this.links.set(link, bufferOffset);
    }
    this.buffer.SetArray(data, bufferOffset * BufferMemoryAllocator.BYTES_PER_ELEMENT, 0, data.length);
    return bufferOffset;
  }
  delete(link) {
    const bufferOffset = this.links.get(link);
    if (bufferOffset === void 0) throw Error("Link not found");
    this.allocator.free(bufferOffset);
    this.links.delete(link);
  }
}

export { BufferMemoryAllocator, DynamicBufferMemoryAllocator, MemoryAllocator };
