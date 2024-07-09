import { DepthTarget, RendererContext } from "../RendererContext";
import { RenderPass, ResourcePool } from "../RenderGraph";
import { Renderer } from "../Renderer";
import { Shader } from "../Shader";
import { PassParams } from "../RenderingPipeline";
import { Geometry } from "../../Geometry";
import { TextureSampler } from "../TextureSampler";
import { DepthTexture } from "../Texture";

export class DepthViewer extends RenderPass {
    public name: string = "DepthViewer";
    private shader: Shader;
    private quadGeometry: Geometry;

    constructor() {
        super({});

        const code = `
        struct VertexInput {
            @location(0) position : vec2<f32>,
            @location(1) uv : vec2<f32>,
        };

        struct VertexOutput {
            @builtin(position) position : vec4<f32>,
            @location(0) vUv : vec2<f32>,
        };

        @group(0) @binding(0) var textureSampler: sampler;
        @group(0) @binding(1) var shadowMapTexture: texture_depth_2d;
        
        @vertex fn vertexMain(input: VertexInput) -> VertexOutput {
            var output: VertexOutput;
            output.position = vec4(input.position, 0.0, 1.0);
            output.vUv = input.uv;
            return output;
        }
        
        @fragment fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
            let uv = input.vUv;

            let shadowMap = textureSampleLevel(shadowMapTexture, textureSampler, uv, 0);
            
            return vec4(shadowMap);
        }
        `;

        this.shader = Shader.Create({
            code: code,
            colorOutputs: [{format: Renderer.SwapChainFormat}],
            attributes: {
                position: { location: 0, size: 3, type: "vec3" },
                uv: { location: 1, size: 2, type: "vec2" }
            },
            uniforms: {
                textureSampler: {group: 0, binding: 0, type: "sampler"},
                shadowMapTexture: {group: 0, binding: 1, type: "depthTexture"},
            }
        });
        this.quadGeometry = Geometry.Plane();

        const sampler = TextureSampler.Create();
        this.shader.SetSampler("textureSampler", sampler);
    }

    public execute(resources: ResourcePool, depthTexture: DepthTexture) {
        
        // this.shader.SetTexture("albedoTexture", resources.getResource(PassParams.GBufferAlbedo));
        this.shader.SetTexture("shadowMapTexture", depthTexture);

        RendererContext.BeginRenderPass("DepthViewer", [{clear: false}]);

        // RendererContext.SetViewport(Renderer.width - 250, 0, 250, 250);
        RendererContext.DrawGeometry(this.quadGeometry, this.shader);
        RendererContext.EndRenderPass();
    }
}