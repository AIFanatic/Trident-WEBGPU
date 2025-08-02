import { Geometry, IndexAttribute, VertexAttribute } from "@trident/core";
import { SimplexNoise } from "@trident/plugins";
;
const TerrainParamsDefaults = {
    baseScale: 0.005,
    baseOctaves: 6,
    baseHeight: 20,
    mountainScale: 0.001,
    mountainOctaves: 4,
    mountainHeight: 1,
    mountainSharpness: 3.0,
    lacunarity: 2.0,
    gain: 0.5,
};
export class TerrainBuilder {
    geometry;
    heights;
    constructor(size, params) {
        const n = new SimplexNoise(1337);
        const _params = Object.assign({}, TerrainParamsDefaults, params);
        const vertices = [];
        const uvs = [];
        const TERRAIN_SIZE = size;
        const TERRAIN_STRIDE = TERRAIN_SIZE + 1;
        const heights = new Float32Array(TERRAIN_STRIDE ** 2);
        const hmIndex = (x, y) => x * TERRAIN_STRIDE + y;
        for (let x = 0; x < TERRAIN_SIZE; x++) {
            for (let z = 0; z < TERRAIN_SIZE; z++) {
                const height = this.generateTerrainHeight(x, z, n, _params);
                vertices.push(x, height, z);
                uvs.push(x / (TERRAIN_SIZE - 1), z / (TERRAIN_SIZE - 1));
                const index = hmIndex(x, z);
                heights[index] = height;
            }
        }
        const indices = [];
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
    fbmNoise(x, z, simplex, octaves, lacunarity, gain) {
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
    ridgedNoise(x, z, simplex, octaves, lacunarity, gain) {
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
    generateTerrainHeight(x, z, simplex, params) {
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
