import { Geometry } from "../Geometry";
import { Buffer, BufferType } from "../renderer/Buffer";
import { Renderer } from "../renderer/Renderer";
import { RendererContext } from "../renderer/RendererContext";
import { Shader } from "../renderer/Shader";
import { Texture } from "../renderer/Texture";
import { TextureSampler } from "../renderer/TextureSampler";

class Rect {
    public readonly x: number;
    public readonly y: number;
    public readonly w: number;
    public readonly h: number;

    constructor(x: number, y: number, w: number, h: number) {
        this.x = x;
        this.y = y;
        this.w = w;
        this.h = h;
    }
    public fits_in(outer: Rect): boolean {
        return outer.w >= this.w && outer.h >= this.h;
    }
    
    public same_size_as(other: Rect): boolean {
        return this.w == other.w && this.h == other.h;
    }
}


class Node {
    private left: Node | null;
    private right: Node | null;
    public rect: Rect | null;
    private filled: boolean;

    constructor() {
        this.left = null;
        this.right = null;
        this.rect = null;
        this.filled = false;
    }

    public insert_rect(rect: Rect): Node | null {
        if(this.left !== null && this.right !== null) return this.left.insert_rect(rect) || this.right.insert_rect(rect);
    
        if(this.filled) return null;
    
        if (!this.rect) throw Error("Rect not defined");

        if(!rect.fits_in(this.rect)) return null;
    
        if(rect.same_size_as(this.rect)) {
            this.filled = true;
            return this;
        }
    
        this.left = new Node();
        this.right = new Node();
    
        var width_diff = this.rect.w - rect.w;
        var height_diff = this.rect.h - rect.h;
    
        var me = this.rect;
    
        if(width_diff > height_diff) {
            // split literally into left and right, putting the rect on the left.
            this.left.rect = new Rect(me.x, me.y, rect.w, me.h);
            this.right.rect = new Rect(me.x + rect.w, me.y, me.w - rect.w, me.h);
        }
        else {
            // split into top and bottom, putting rect on top.
            this.left.rect = new Rect(me.x, me.y, me.w, rect.h);
            this.right.rect = new Rect(me.x, me.y + rect.h, me.w, me.h - rect.h);
        }
    
        return this.left.insert_rect(rect);
    }
}


interface AtlasRegion {
    uvOffset: [number, number]; // normalized offset in atlas
    uvSize: [number, number];   // normalized size in atlas
}

export class Atlas {
    public readonly buffer: Buffer;
    public readonly regions: AtlasRegion[] = [];
    public readonly size: number;

    public regionData: Float32Array;

    public start_node: Node;

    constructor(size: number) {
        this.size = size;
        // 4 bytes per pixel (BGRA8)
        this.buffer = Buffer.Create(size * size * 4, BufferType.STORAGE);

        this.start_node = new Node();
        this.start_node.rect = new Rect(0, 0, size, size);
    }

    public AddTexture(texture: Texture): number {
        const node = this.start_node.insert_rect(new Rect(0, 0, texture.width, texture.height));
        if (!node || !node.rect) throw Error("Failed to insert texture into atlas");

        const region: AtlasRegion = {
            uvOffset: [node.rect.x / this.size, node.rect.y / this.size],
            uvSize: [node.rect.w / this.size, node.rect.h / this.size],
        };

        // Calculate the byte offset in the linear storage buffer.
        // The atlas is assumed to be stored row by row.
        const offset = (node.rect.y * this.size + node.rect.x) * 4;

        // Copy the texture into the atlas buffer.
        Renderer.BeginRenderFrame();
        RendererContext.CopyTextureToBufferV2(
            { texture: texture, mipLevel: 0, origin: [0, 0, 0] },
            { buffer: this.buffer, offset: offset, bytesPerRow: this.size * 4 }
        );
        Renderer.EndRenderFrame();

        // Store the region and return its index.
        this.regions.push(region);

        this.UpdateRegionData();

        return this.regions.length - 1;
    }

    public AddBuffer(buffer: Buffer): number {
        function computeOptimalRect(dataSize: number): Rect {
            // Try to form a nearly square rectangle.
            const width = Math.floor(Math.sqrt(dataSize));
            const height = Math.ceil(dataSize / width);
            return new Rect(0, 0, width, height);
        }

        const node = this.start_node.insert_rect(computeOptimalRect(buffer.size * 0.5 * 0.5));
        // const node = this.start_node.insert_rect(new Rect(0, 0, 2, 2));
        if (!node || !node.rect) throw Error("Failed to insert texture into atlas");

        const region: AtlasRegion = {
            uvOffset: [node.rect.x / this.size, node.rect.y / this.size],
            uvSize: [node.rect.w / this.size, node.rect.h / this.size],
        };

        // region.uvSize[0] /= 64;
        // region.uvSize[1] /= 64;

        // Calculate the byte offset in the linear storage buffer.
        // The atlas is assumed to be stored row by row.
        const offset = (node.rect.y * this.size + node.rect.x) * 4;

        console.log(node.rect)
        console.log(region)

        // Copy the texture into the atlas buffer.
        Renderer.BeginRenderFrame();
        RendererContext.CopyBufferToBuffer(buffer, this.buffer, 0, offset, buffer.size);
        Renderer.EndRenderFrame();

        // Store the region and return its index.
        this.regions.push(region);

        this.UpdateRegionData();

        return this.regions.length - 1;
    }

    private UpdateRegionData() {
        let regionData: number[] = [];

        for (const region of this.regions) regionData.push(
            region.uvOffset[0],
            region.uvOffset[1],
            region.uvSize[0],
            region.uvSize[1],
        )
        
        this.regionData = new Float32Array(regionData);
    }
}

export class AtlasViewer {
    public name: string = "AtlasViewer";
    private shader: Shader;
    private quadGeometry: Geometry;

    private initialized = false;

    public async init() {
        const code = `
        struct VertexInput {
            @location(0) position : vec2<f32>,
            @location(1) uv : vec2<f32>,
        };

        struct VertexOutput {
            @builtin(position) position : vec4<f32>,
            @location(0) vUv : vec2<f32>,
        };

        struct AtlasRegion {
            uvOffset: vec2<f32>,
            uvSize: vec2<f32>,
        };

        @group(0) @binding(1) var<storage, read> atlasBuffer: array<f32>;
        @group(0) @binding(2) var<storage, read> atlasRegions: array<AtlasRegion>;

        @group(0) @binding(3) var<storage, read> atlasSize: f32;
        @group(0) @binding(4) var<storage, read> textureIndex: f32;

        @vertex fn vertexMain(input: VertexInput) -> VertexOutput {
            var output: VertexOutput;
            output.position = vec4(input.position, 0.0, 1.0);
            output.vUv = input.uv;
            return output;
        }

        // // Unpack a packed BGRA8 pixel stored in a u32 into a vec4<f32>
        // fn getPixel(globalUV: vec2<f32>, atlasSize: f32) -> vec4<f32> {
        //     let coord = vec2<u32>(globalUV * atlasSize);
        //     let index = coord.y * u32(atlasSize) + coord.x;
        //     let packed = atlasBuffer[index];
  
        //     // Unpack BGRA (each channel is 8 bits) and convert to normalized floats.
        //     let b = f32((packed >> 0u) & 0xFFu) / 255.0;
        //     let g = f32((packed >> 8u) & 0xFFu) / 255.0;
        //     let r = f32((packed >> 16u) & 0xFFu) / 255.0;
        //     let a = f32((packed >> 24u) & 0xFFu) / 255.0;
        //     return vec4f(r, g, b, a);
        // }

        // fn atlasSample(textureIndex: u32, uv: vec2<f32>) -> vec4<f32> {
        //     // Get the region for the selected texture.
        //     let region = atlasRegions[textureIndex];
        //     // Remap the incoming UV (0–1) to the region’s area in the atlas.
        //     let globalUV = region.uvOffset + fract(uv) * region.uvSize;

        //     return getPixel(globalUV, atlasSize);
        // }
        
        @fragment fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
            // // return atlasSample(u32(textureIndex), input.vUv);

            // let p = atlasSample(u32(textureIndex), input.vUv);
            // if (p.r > -10.0) {
            //     // return vec4f(0.0, 1.0, 0.0, 1.0);
            // }
            // return vec4f(p.rgb, 1.0);

            // Map the incoming UV [0,1] to atlas pixel coordinates.
            let coord = vec2<u32>(input.vUv * atlasSize);
            let index = coord.y * u32(atlasSize) + coord.x;
            let value = atlasBuffer[index];
            // Output the value as a grayscale color.
            return vec4f(value, value, value, 1.0);

            // let coord = vec2<u32>(input.vUv * atlasSize);
            // let index = coord.y * u32(atlasSize) + coord.x;
            // let packed = atlasBuffer[index];
  
            // // Unpack the BGRA channels from the 32-bit packed value.
            // let b = f32((packed >> 0u) & 0xFFu) / 255.0;
            // let g = f32((packed >> 8u) & 0xFFu) / 255.0;
            // let r = f32((packed >> 16u) & 0xFFu) / 255.0;
            // let a = f32((packed >> 24u) & 0xFFu) / 255.0;
            // return vec4f(r, g, b, a);
        }
        `;

        this.shader = await Shader.Create({
            code: code,
            colorOutputs: [{format: Renderer.SwapChainFormat}],
            attributes: {
                position: { location: 0, size: 3, type: "vec3" },
                uv: { location: 1, size: 2, type: "vec2" }
            },
            uniforms: {
                atlasBuffer: {group: 0, binding: 1, type: "storage"},
                atlasRegions: { group: 0, binding: 2, type: "storage" },
                atlasSize: { group: 0, binding: 3, type: "storage" },
                textureIndex: { group: 0, binding: 4, type: "storage" }
            }
        });
        this.quadGeometry = Geometry.Plane();
        this.initialized = true;
    }

    public async execute(atlas: Atlas, textureIndex: number) {
        if (!this.initialized) await this.init();

        this.shader.SetBuffer("atlasBuffer", atlas.buffer);
        this.shader.SetArray("atlasRegions", atlas.regionData);
        this.shader.SetValue("atlasSize", atlas.size);
        this.shader.SetValue("textureIndex", textureIndex);

        Renderer.BeginRenderFrame();
        RendererContext.BeginRenderPass(this.name, [{clear: false}], undefined, true);
        RendererContext.DrawGeometry(this.quadGeometry, this.shader);
        RendererContext.EndRenderPass();
        Renderer.EndRenderFrame();
    }
}