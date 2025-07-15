import { Geometry, IndexAttribute, VertexAttribute } from "@trident/core";
import { SimplexNoise } from "@trident/plugins";

export interface TerrainParams {
    baseScale: number;         // Scale for base terrain (controls size of hills)
    baseOctaves: number;       // Number of octaves for base terrain
    baseHeight: number;        // Maximum height of base terrain
    mountainScale: number;     // Scale for mountain terrain (controls size of mountains)
    mountainOctaves: number    // Number of octaves for mountains
    mountainHeight: number     // Maximum height of mountains
    mountainSharpness: number; // Controls how sharp the mountains are
    lacunarity: number;        // Frequency multiplier per octave
    gain: number;              // Amplitude multiplier per octave
};

const TerrainParamsDefaults: TerrainParams = {
    baseScale: 0.005,
    baseOctaves: 6,
    baseHeight: 20,
    mountainScale: 0.001,
    mountainOctaves: 4,
    mountainHeight: 1,
    mountainSharpness: 3.0,
    lacunarity: 2.0,
    gain: 0.5,
}

export class TerrainBuilder {
    public readonly geometry: Geometry;
    public readonly heights: Float32Array;

    constructor(size: number, params?: Partial<TerrainParams>) {
        const n = new SimplexNoise(1337);
        const _params = Object.assign({}, TerrainParamsDefaults, params);

        const vertices: number[] = [];
        const uvs: number[] = [];
        const TERRAIN_SIZE = size;
        const TERRAIN_STRIDE = TERRAIN_SIZE + 1;
        const heights = new Float32Array(TERRAIN_STRIDE ** 2);

        const hmIndex = (x: number, y: number) => x * TERRAIN_STRIDE + y;

        for (let x = 0; x < TERRAIN_SIZE; x++) {
            for (let z = 0; z < TERRAIN_SIZE; z++) {
                const height = this.generateTerrainHeight(x, z, n, _params);
                vertices.push(x, height, z);
                uvs.push(x / (TERRAIN_SIZE - 1), z / (TERRAIN_SIZE - 1));
                const index = hmIndex(x, z);
                heights[index] = height;
            }
        }

        const indices: number[] = [];
        for (let z = 0; z < TERRAIN_SIZE - 1; z++) {
            for (let x = 0; x < TERRAIN_SIZE - 1; x++) {
                const topLeft = z * TERRAIN_SIZE + x;
                const topRight = topLeft + 1;
                const bottomLeft = (z + 1) * TERRAIN_SIZE + x;
                const bottomRight = bottomLeft + 1;

                // indices.push(topLeft, bottomLeft, topRight);
                // indices.push(topRight, bottomLeft, bottomRight);

                indices.push(topLeft, topRight, bottomLeft);
                indices.push(topRight, bottomRight, bottomLeft);
            }
        }

        let geometry = new Geometry();
        geometry.attributes.set("position", new VertexAttribute(new Float32Array(vertices)));
        geometry.attributes.set("uv", new VertexAttribute(new Float32Array(uvs)));
        geometry.index = new IndexAttribute(new Uint32Array(indices));
        // geometry = geometry.Center();
        geometry.ComputeNormals();

        this.geometry = geometry;
        this.heights = heights;
    }

    private fbmNoise(x: number, z: number, simplex: SimplexNoise, octaves: number, lacunarity: number, gain: number): number {
        let total = 0;
        let frequency = 1;
        let amplitude = 1;
        let maxValue = 0;

        for (let i = 0; i < octaves; i++) {
            total += simplex.noise2D(x * frequency, z * frequency) * amplitude;
            maxValue += amplitude;

            amplitude *= gain;
            frequency *= lacunarity;
        }

        return total / maxValue; // Normalize to [-1, 1]
    }

    private ridgedNoise(x: number, z: number, simplex: SimplexNoise, octaves: number, lacunarity: number, gain: number): number {
        let total = 0;
        let frequency = 1;
        let amplitude = 0.5;
        let weight = 1.0;
        let maxValue = 0;

        for (let i = 0; i < octaves; i++) {
            let signal = simplex.noise2D(x * frequency, z * frequency);
            signal = Math.abs(signal);
            signal = 1.0 - signal;
            signal *= signal;
            signal *= weight;
            weight = signal * gain;

            total += signal * amplitude;
            maxValue += amplitude;

            frequency *= lacunarity;
            amplitude *= gain;
        }

        return total / maxValue; // Normalize to [0, 1]
    }

    private generateTerrainHeight(x: number, z: number, simplex: SimplexNoise, params: any): number {
        // Base terrain (smooth hills and valleys)
        const baseTerrain = this.fbmNoise(x * params.baseScale, z * params.baseScale, simplex, params.baseOctaves, params.lacunarity, params.gain);

        // Mountain terrain (ridged noise)
        const mountainTerrain = this.ridgedNoise(x * params.mountainScale, z * params.mountainScale, simplex, params.mountainOctaves, params.lacunarity, params.gain);

        // Control the influence of mountains
        const mountainMask = Math.pow(mountainTerrain, params.mountainSharpness); // Adjust sharpness

        // Blend base terrain and mountains
        const terrainHeight = baseTerrain * params.baseHeight * (1 - mountainMask) + mountainTerrain * params.mountainHeight * mountainMask;

        return terrainHeight;
    }
}