import { Geometry, GPU } from "@trident/core";

export class DebugTextureViewer extends GPU.RenderPass {
    public name: string = "DebugTextureViewer";
    private quadGeometry: Geometry;
    private shaderCube: GPU.Shader;
    private shader2D: GPU.Shader;

    private texture: GPU.Texture;

    constructor(texture: GPU.Texture) {
        super({});
        this.texture = texture;
        console.log(texture.dimension)
    }

    public async init() {
        this.shaderCube = await GPU.Shader.Create({
            code: `
            struct VertexInput {
                @location(0) position : vec2<f32>,
                @location(1) uv : vec2<f32>,
            };
    
            struct VertexOutput {
                @builtin(position) position : vec4<f32>,
                @location(0) uv : vec2<f32>,
            };
    
            @group(0) @binding(0) var textureSampler: sampler;
            @group(0) @binding(1) var texture: texture_cube<f32>;
    
            @vertex fn vertexMain(input: VertexInput) -> VertexOutput {
                var output: VertexOutput;
                output.position = vec4(input.position, 0.0, 1.0);
                output.uv = input.uv;
                return output;
            }
            
            fn dir_from_face_uv(face: i32, uv: vec2<f32>) -> vec3<f32> {
                let u =  2.0 * uv.x - 1.0;      // -> [-1, 1]
                let v =  1.0 - 2.0 * uv.y;      // flip Y so top of atlas is +v
                switch (face) {
                  case 0: { return normalize(vec3<f32>( 1.0,  v,  -u)); } // +X
                  case 1: { return normalize(vec3<f32>(-1.0,  v,   u)); } // -X
                  case 2: { return normalize(vec3<f32>(  u,  1.0, -v)); } // +Y
                  case 3: { return normalize(vec3<f32>(  u, -1.0,  v)); } // -Y
                  case 4: { return normalize(vec3<f32>(  u,  v,  1.0)); } // +Z
                  default:{ return normalize(vec3<f32>( -u,  v, -1.0)); } // -Z
                }
            }

            @fragment fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
                // 3*2 atlas partition
                let grid    = vec2<f32>(3.0, 2.0);
                let uvGrid  = input.uv * grid;
                let tile    = vec2<i32>(floor(uvGrid));     // which cell
                let localUV = fract(uvGrid);                // 0..1 in cell
              
                // guard (outside [0,1] or outside our 3x2 area)
                if (any(tile < vec2<i32>(0)) ||
                    any(tile > vec2<i32>(2,1))) {
                  return vec4<f32>(0.0, 0.0, 0.0, 1.0);
                }
              
                // map tile -> face index per layout above
                var face: i32;
                if (tile.y == 0) {
                  face = select(select(0, 1, tile.x == 1), 2, tile.x == 2); // [0,1,2]
                } else {
                  face = select(select(3, 4, tile.x == 1), 5, tile.x == 2); // [3,4,5]
                }
              
                let dir = dir_from_face_uv(face, localUV);
                let rgb = textureSampleLevel(texture, textureSampler, dir, 0.0).rgb;
                return vec4<f32>(rgb, 1.0);
            }
            `,
            colorOutputs: [{format: "rgba16float"}],
            attributes: {
                position: { location: 0, size: 3, type: "vec3" },
                uv: { location: 1, size: 2, type: "vec2" }
            },
            uniforms: {
                textureSampler: {group: 0, binding: 0, type: "sampler"},
                texture: {group: 0, binding: 1, type: "texture"},
            }
        });

        this.shader2D = await GPU.Shader.Create({
            code: `
            struct VertexInput {
                @location(0) position : vec2<f32>,
                @location(1) uv : vec2<f32>,
            };
    
            struct VertexOutput {
                @builtin(position) position : vec4<f32>,
                @location(0) uv : vec2<f32>,
            };
    
            @group(0) @binding(0) var textureSampler: sampler;
            @group(0) @binding(1) var texture: texture_2d<f32>;
    
            @vertex fn vertexMain(input: VertexInput) -> VertexOutput {
                var output: VertexOutput;
                output.position = vec4(input.position, 0.0, 1.0);
                output.uv = input.uv;
                return output;
            }
            
            @fragment fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
                return textureSampleLevel(texture, textureSampler, input.uv, 0.0);
            }
            `,
            colorOutputs: [{format: "rgba16float"}],
            attributes: {
                position: { location: 0, size: 3, type: "vec3" },
                uv: { location: 1, size: 2, type: "vec2" }
            },
            uniforms: {
                textureSampler: {group: 0, binding: 0, type: "sampler"},
                texture: {group: 0, binding: 1, type: "texture"},
            }
        });

        this.quadGeometry = Geometry.Plane();

        const sampler = GPU.TextureSampler.Create();
        this.shaderCube.SetSampler("textureSampler", sampler);
        this.shaderCube.SetTexture("texture", this.texture);

        this.shader2D.SetSampler("textureSampler", sampler);
        this.shader2D.SetTexture("texture", this.texture);

        this.initialized = true;
    }

    public async execute(resources: GPU.ResourcePool) {
        if (!this.initialized) await this.init();

        const lightingOutput = resources.getResource(GPU.PassParams.LightingPassOutput);

        const shader = this.texture.dimension === "cube" ? this.shaderCube : this.shader2D;
        GPU.RendererContext.BeginRenderPass(this.name, [{target: lightingOutput, clear: true}], undefined, true);
        GPU.RendererContext.DrawGeometry(this.quadGeometry, shader);
        GPU.RendererContext.EndRenderPass();
    }
}