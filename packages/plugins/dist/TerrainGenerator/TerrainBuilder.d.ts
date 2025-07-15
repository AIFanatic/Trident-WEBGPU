import { Geometry } from "@trident/core";
export interface TerrainParams {
    baseScale: number;
    baseOctaves: number;
    baseHeight: number;
    mountainScale: number;
    mountainOctaves: number;
    mountainHeight: number;
    mountainSharpness: number;
    lacunarity: number;
    gain: number;
}
export declare class TerrainBuilder {
    readonly geometry: Geometry;
    readonly heights: Float32Array;
    constructor(size: number, params?: Partial<TerrainParams>);
    private fbmNoise;
    private ridgedNoise;
    private generateTerrainHeight;
}
//# sourceMappingURL=TerrainBuilder.d.ts.map