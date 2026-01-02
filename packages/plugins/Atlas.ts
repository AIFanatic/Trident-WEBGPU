import { GPU } from "@trident/core";

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
    public readonly buffer: GPU.Texture;
    public readonly regions: AtlasRegion[] = [];
    public readonly size: number;

    public regionData: Float32Array;

    public start_node: Node;

    constructor(size: number) {
        this.size = size;
        this.buffer = GPU.Texture.Create(size, size, 1, "bgra8unorm");

        this.start_node = new Node();
        this.start_node.rect = new Rect(0, 0, size, size);
    }

    public AddTexture(texture: GPU.Texture): AtlasRegion {
        const node = this.start_node.insert_rect(new Rect(0, 0, texture.width, texture.height));
        if (!node || !node.rect) throw Error("Failed to insert texture into atlas");

        const region: AtlasRegion = {
            uvOffset: [node.rect.x / this.size, node.rect.y / this.size],
            uvSize: [node.rect.w / this.size, node.rect.h / this.size],
        };

        // Copy the texture into the atlas buffer.
        GPU.Renderer.BeginRenderFrame();
        GPU.RendererContext.CopyTextureToTextureV3({texture: texture}, {texture: this.buffer, origin: [node.rect.x, node.rect.y]}, [node.rect.w, node.rect.h]);
        GPU.Renderer.EndRenderFrame();

        // Store the region and return its index.
        this.regions.push(region);

        this.UpdateRegionData();

        return region;
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