import { RenderPass } from "./RenderPass";
import { Shader } from "../Shader";
import { Geometry } from "../../Geometry";
import { RenderCommandBuffer } from "../RenderCommandBuffer";
import { RenderTexture } from "../Texture";
import { TextureSampler } from "../TextureSampler";
import { Camera } from "../../components/Camera";

export class OutputPass implements RenderPass {
    private quadGeometry: Geometry;
    private shader: Shader;
    private sampler: TextureSampler;

    constructor() {
        this.shader = Shader.Create(`
        struct VertexInput {
            @location(0) position : vec3<f32>,
            @location(1) normal : vec3<f32>,
        };
        
        struct VertexOutput {
            @builtin(position) position : vec4<f32>,
        };
        
        @group(0) @binding(0) var ourTexture: texture_2d<f32>;
        // @group(0) @binding(1) var depthTexture: texture_2d<f32>;

        @group(0) @binding(2) var ourSampler: sampler;
        
        @vertex
        fn vertexMain1(@builtin(instance_index) instanceIdx : u32, input: VertexInput) -> VertexOutput {
            var output : VertexOutput;

            output.position = vec4(input.position, 1.0);
        
            return output;
        }
        
        @fragment
        fn fragmentMain1(fragData: VertexOutput) -> @location(0) vec4<f32> {
            let uv = fragData.position.xy / vec2<f32>(textureDimensions(ourTexture));
            var color = vec4<f32>(0.0);
        
            // Simple 3x3 kernel blur
            for (var x: i32 = -1; x <= 1; x = x + 1) {
                for (var y: i32 = -1; y <= 1; y = y + 1) {
                    color = color + textureSample(ourTexture, ourSampler, uv + vec2<f32>(f32(x), f32(y)) * 0.002);
                }
            }

            return color / 9;
        }
        `);
        this.shader.depthTest = false;

        const vertices = new Float32Array([
            -1.0,  1.0, 0.0, // Top-left
            1.0,  1.0, 0.0, // Top-right
           -1.0, -1.0, 0.0, // Bottom-left
            1.0, -1.0, 0.0  // Bottom-right
        ])

        const indices = new Uint32Array([
            0, 2, 1, // First triangle
            2, 3, 1  // Second triangle
        ]);

        this.quadGeometry = new Geometry(vertices, indices);

        this.sampler = TextureSampler.Create();
        this.shader.SetSampler("ourSampler", this.sampler);
    }

    public Execute(inputTarget: RenderTexture): RenderCommandBuffer {
        const commandBuffer = new RenderCommandBuffer("OutputPass");
        this.shader.SetTexture("ourTexture", inputTarget);

        const mainCamera = Camera.mainCamera;
        commandBuffer.SetRenderTarget(mainCamera.renderTarget, null);
        commandBuffer.ClearRenderTarget(true, true, mainCamera.clearValue);
        commandBuffer.DrawMesh(this.quadGeometry, this.shader);

        return commandBuffer;
    }
}