import { WEBGPURenderer } from "../renderer/webgpu/WEBGPURenderer";
export class WEBGPUInspector {
    static textures = [];
    static canvas;
    // Call after renderer is setup
    static Load() {
        this.canvas = document.createElement("canvas");
        document.body.appendChild(this.canvas);
        const device = WEBGPURenderer.device;
        const oldMethod = device.createTexture.bind(device);
        WEBGPURenderer.device.createTexture = (descriptor) => {
            const t = oldMethod(descriptor);
            this.textures.push(t);
            this.ShowTextures();
            return t;
        };
    }
    static async readTextureData(device, texture, width, height, bytesPerPixel) {
        // Create a buffer for the pixel data
        const bufferDescriptor = {
            size: width * height * bytesPerPixel,
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
            mappedAtCreation: false
        };
        const buffer = device.createBuffer(bufferDescriptor);
        // Copy texture to the buffer
        const commandEncoder = device.createCommandEncoder();
        const copySize = {
            width: width,
            height: height,
            depthOrArrayLayers: 1
        };
        commandEncoder.copyTextureToBuffer({ texture: texture }, { buffer: buffer, bytesPerRow: width * bytesPerPixel }, copySize);
        // Submit the command to the GPU
        const commands = commandEncoder.finish();
        device.queue.submit([commands]);
        // Map the buffer and read the data
        await buffer.mapAsync(GPUMapMode.READ);
        const arrayBuffer = buffer.getMappedRange();
        const data = new Uint8Array(arrayBuffer);
        // Process the pixel data
        console.log("Pixel data:", data);
        // Clean up
        buffer.unmap();
    }
    static ShowTextures() {
        console.log("CALLED", this.textures);
        for (const texture of this.textures) {
            const bytesPerPixel = texture.format === "depth24plus" ? 1 : 4;
            this.readTextureData(WEBGPURenderer.device, texture, texture.width, texture.height, bytesPerPixel);
        }
        throw Error("HERE");
    }
}
