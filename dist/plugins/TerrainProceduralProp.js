import { Components, GPU } from '@trident/core';

class TerrainProceduralProp extends Components.Component {
  terrain;
  propPlacementCompute;
  instanceCounts;
  AddProps() {
  }
  async Load() {
    if (this.propPlacementCompute) return;
    this.propPlacementCompute = await GPU.ShaderCompute.Create({
      code: `
            @group(0) @binding(0) var terrainTexture: texture_2d<f32>; // For heights
            @group(0) @binding(1) var materialIdMap: texture_2d<f32>; // For material ids
            
            @group(0) @binding(2) var terrainSampler: sampler;

            struct InstanceCounts {
                DIRT: atomic<u32>,
            };
            @group(1) @binding(0) var<storage, read_write> instanceCounts: InstanceCounts;
            @group(1) @binding(1) var<storage, read_write> DIRT_MATRICES: array<mat4x4<f32>>;

            const LAYER_OCEAN     = vec4f(0.02, 0.10, 0.22, 0.0);
            const LAYER_BEACH     = vec4f(0.63, 0.56, 0.47, 1.0);
            const LAYER_DESERT    = vec4f(0.80, 0.75, 0.55, 2.0);  // temperate + subtropical desert
            const LAYER_GRASSLAND = vec4f(0.53, 0.67, 0.33, 3.0);  // bright green
            const LAYER_FOREST    = vec4f(0.40, 0.58, 0.35, 4.0);  // shrubland/taiga/deciduous/seasonal
            const LAYER_RAINFOREST= vec4f(0.20, 0.47, 0.33, 5.0);  // temperate + tropical rain forest
            const LAYER_ROCK      = vec4f(0.45, 0.45, 0.45, 6.0);  // scorched + bare
            const LAYER_TUNDRA    = vec4f(0.73, 0.73, 0.67, 7.0);
            const LAYER_SNOW      = vec4f(1.00, 1.00, 1.00, 8.0);
            
            fn hash(p: vec2f) -> f32 {
                return fract(sin(dot(p, vec2(11.9898, 78.233))) * 43758.5453);
            }
            fn blueNoise(U: vec2f) -> f32 {
                let v =  hash( U + vec2(-1, 0) )
                        + hash( U + vec2( 1, 0) )
                        + hash( U + vec2( 0, 1) )
                        + hash( U + vec2( 0,-1) ); 
                return  hash(U) - v/4.  + .5;
            }

            @compute @workgroup_size(8, 8, 1)
            fn main(@builtin(global_invocation_id) grid: vec3<u32>) {
                let dims = textureDimensions(terrainTexture);

                if (grid.x >= dims.x || grid.y >= dims.y) {
                    return;
                }
                    
                let terrain = textureLoad(terrainTexture, vec2<i32>(grid.xy), 0);
                let materialId = textureLoad(materialIdMap, vec2<i32>(grid.xy), 0) * 255.0;

                let terrainSize = vec3f(3000.0, 2000.0, 3000.0);
                let uv = vec2f(grid.xy) / vec2f(dims);
                let terrainCoord = (uv - 0.5) * terrainSize.x;
                let n = hash(terrainCoord);

                if (u32(materialId.x) == u32(LAYER_GRASSLAND.w) && n > 0.991) {
                    let writeIndex = atomicAdd(&instanceCounts.DIRT, 1u);
    
                    DIRT_MATRICES[writeIndex] = mat4x4<f32>(1,0,0,0, 0,1,0,0, 0,0,1,0, terrainCoord.x, terrain.x * 2000.0 - 1000.0, terrainCoord.y, 1);
                }
            }
          `,
      computeEntrypoint: "main"
    });
    this.propPlacementCompute.SetSampler("terrainSampler", new GPU.TextureSampler());
    this.instanceCounts = new GPU.Buffer(1 * 4, GPU.BufferType.INDIRECT);
    this.instanceCounts.SetArray(new Uint32Array([0]));
    this.propPlacementCompute.SetBuffer("instanceCounts", this.instanceCounts);
  }
  async Generate(terrainTexture, materialIdMap) {
    if (!this.terrain) throw Error("No terrain assigned");
    if (this.terrain.terrainData.paintPropData.length === 0) throw Error("No props");
    await this.Load();
    this.instanceCounts.SetArray(new Uint32Array([0]));
    this.propPlacementCompute.SetTexture("terrainTexture", terrainTexture);
    this.propPlacementCompute.SetTexture("materialIdMap", materialIdMap);
    const ilg = this.terrain.terrainData.paintPropData[0].instancedLODGroup;
    ilg.ReserveInstances(5e4);
    this.propPlacementCompute.SetBuffer("DIRT_MATRICES", ilg.matricesBuffer);
    GPU.Renderer.BeginRenderFrame();
    GPU.ComputeContext.BeginComputePass("TerrainProceduralProp");
    GPU.ComputeContext.Dispatch(this.propPlacementCompute, Math.ceil(terrainTexture.width / 8), Math.ceil(terrainTexture.height / 8), 1);
    GPU.ComputeContext.EndComputePass();
    GPU.Renderer.EndRenderFrame();
    const arr = await this.instanceCounts.GetData();
    const actualCount = new Uint32Array(arr)[0];
    ilg._instanceCount = actualCount;
    console.log("placed:", actualCount);
  }
}

export { TerrainProceduralProp };
