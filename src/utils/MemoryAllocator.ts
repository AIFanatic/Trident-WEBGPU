import { Buffer, BufferType } from "../renderer/Buffer";
import { WEBGPUBuffer } from "../renderer/webgpu/WEBGPUBuffer";
import { WEBGPURenderer } from "../renderer/webgpu/WEBGPURenderer";

interface MemoryBlock {
    offset: number;
    size: number;
};
export class MemoryAllocator {
    private memorySize: number;
    private availableMemorySize: number;
    private freeBlocks: MemoryBlock[] = [];
    private usedBlocks: MemoryBlock[] = [];

    constructor(memorySize: number) {
        this.memorySize = memorySize;
        this.availableMemorySize = memorySize;
        this.freeBlocks.push({offset: 0, size: memorySize});
    }

    allocate(size: number): number {
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

                this.usedBlocks.push({offset: offset, size: size});
                return offset;
            }
        }

        throw Error("Not enough space.");
    }

    free(offset: number) {
        for (let i = 0; i < this.usedBlocks.length; i++) {
            const block = this.usedBlocks[i];
            if (block.offset === offset) {
                this.usedBlocks.splice(i, 1);
                this.freeBlocks.push(block);
                // this.mergeFreeBlocks();
                return;
            }
        }

        throw new Error(`No allocated block found at offset ${offset}`);
    }
}

export class BufferMemoryAllocator {
    private allocator: MemoryAllocator;
    private buffer: Buffer;
    private links: Map<any, number>;

    private static BYTES_PER_ELEMENT = Float32Array.BYTES_PER_ELEMENT;

    constructor(size: number) {
        this.allocator = new MemoryAllocator(size);
        this.buffer = Buffer.Create(size * BufferMemoryAllocator.BYTES_PER_ELEMENT, BufferType.STORAGE);
        this.links = new Map();

        // new MemoryAllocatorViewer(this.allocator)
    }

    public has(link: any): boolean {
        return this.links.has(link);
    }

    public set(link: any, data: Float32Array): number {
        let bufferOffset = this.links.get(link);
        if (!bufferOffset) {
            bufferOffset = this.allocator.allocate(data.length);
            this.links.set(link, bufferOffset);
        }
        this.buffer.SetArray(data, bufferOffset * BufferMemoryAllocator.BYTES_PER_ELEMENT, 0, data.length);
        return bufferOffset;
    }

    public delete(link: any) {
        const bufferOffset = this.links.get(link);
        if (!bufferOffset) throw Error("Link not found");
        this.allocator.free(bufferOffset);
        this.links.delete(link);
    }

    public getBuffer(): Buffer { return this.buffer; }
    public getAllocator(): MemoryAllocator { return this.allocator; }
}

export class MemoryAllocatorViewer {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private allocator: BufferMemoryAllocator;

    private offsetData: {[key: number]: Float32Array} = {};

    private table: HTMLTableElement;
    private tbody: HTMLTableSectionElement;

    private totalScale: number = 1;

    constructor(allocator: BufferMemoryAllocator) {
        this.allocator = allocator;
        this.canvas = document.createElement("canvas");
        this.canvas.width = 512;
        this.canvas.height = 512;
        this.canvas.style.position = "absolute";
        this.canvas.style.top = "0";
        this.canvas.style.right = "0";
        this.ctx = this.canvas.getContext("2d") as CanvasRenderingContext2D;

        this.canvas.addEventListener("wheel", event => {
            let scale = event.deltaY / 10;
            scale = Math.pow(1.1, scale);
            this.totalScale += 1 - scale;
            console.log(scale, this.totalScale);
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            this.ctx.scale(scale, scale);
            this.render();
        })

        document.body.append(this.canvas);

        const allocatorBuffer = this.allocator.getBuffer();
        allocatorBuffer.SetArray = (array: ArrayBuffer, bufferOffset: number = 0, dataOffset?: number | undefined, size?: number | undefined) => {
            const buffer = allocatorBuffer as WEBGPUBuffer;
            this.offsetData[bufferOffset] = array as Float32Array;
            WEBGPURenderer.device.queue.writeBuffer(buffer.GetBuffer(), bufferOffset, array, dataOffset, size);
            this.render();
        }
    }

    private rand(co: number) {
        function fract(n) {
            return n % 1;
        }

        return fract(Math.sin((co + 1) * 12.9898) * 43758.5453);
    }

    private render() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        let x = 0;
        let y = 0;
        const blockSize = 32;
        for (let i = 0; i < this.allocator.getAllocator().usedBlocks.length; i++) {
            this.ctx.fillStyle = "red";
            const usedBlock = this.allocator.getAllocator().usedBlocks[i];
            const offsetData = this.offsetData[usedBlock.offset];
            if (!offsetData) continue;

            const colorValue = Math.abs(Math.floor(this.rand(usedBlock.offset) * 0xffffff));
            this.ctx.fillStyle = "#" + colorValue.toString(16);

            for (let j = 0; j < offsetData.length; j++) {
                if (x >= this.canvas.width) {
                    x = 0;
                    y += blockSize;
                }


                // this.ctx.fillRect(x, y, blockSize, blockSize);
                this.ctx.fillText(offsetData[j].toFixed(2), x, y);

                x += blockSize;
            }
        }
        
    }
}