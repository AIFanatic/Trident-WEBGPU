import { Buffer } from "../renderer/Buffer";
import { Texture } from "../renderer/Texture";
declare class Rect {
    readonly x: number;
    readonly y: number;
    readonly w: number;
    readonly h: number;
    constructor(x: number, y: number, w: number, h: number);
    fits_in(outer: Rect): boolean;
    same_size_as(other: Rect): boolean;
}
declare class Node {
    private left;
    private right;
    rect: Rect | null;
    private filled;
    constructor();
    insert_rect(rect: Rect): Node | null;
}
interface AtlasRegion {
    uvOffset: [number, number];
    uvSize: [number, number];
}
export declare class Atlas {
    readonly buffer: Buffer;
    readonly regions: AtlasRegion[];
    readonly size: number;
    regionData: Float32Array;
    start_node: Node;
    constructor(size: number);
    AddTexture(texture: Texture): number;
    AddBuffer(buffer: Buffer): number;
    private UpdateRegionData;
}
export declare class AtlasViewer {
    name: string;
    private shader;
    private quadGeometry;
    private initialized;
    init(): Promise<void>;
    execute(atlas: Atlas, textureIndex: number): Promise<void>;
}
export {};
//# sourceMappingURL=Atlas.d.ts.map