import { Camera } from "../../components/Camera";
import { RendererContext } from "../RendererContext";
import { RenderPass, ResourcePool } from "../RenderGraph";
import { DepthTexture, RenderTexture } from "../Texture";
import { Renderer } from "../Renderer";
import { DeferredMeshMaterial } from "../Material";
import { SceneRenderer } from "./SceneRenderer";
import { Shader } from "../Shader";
import { PassParams } from "../RenderingPipeline";
import { Geometry } from "../../Geometry";
import { TextureSampler } from "../TextureSampler";

export class DebuggerPass extends RenderPass {
    public name: string = "DebuggerPass";
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
        @group(0) @binding(1) var albedoTexture: texture_2d<f32>;
        // @group(0) @binding(2) var shadowMapTexture: texture_depth_2d;
        @group(0) @binding(2) var shadowMapTexture: texture_depth_2d_array;
        
        @vertex fn vertexMain(input: VertexInput) -> VertexOutput {
            var output: VertexOutput;
            output.position = vec4(input.position, 0.0, 1.0);
            output.vUv = input.uv;
            return output;
        }
        
        @fragment fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
            let uv = input.vUv;

            let threshold = vec2(0.5, 0.5);
            let quadrant = step(threshold, uv);
            let baseCoords = uv * 2.0 - quadrant;
        
            // let albedo = textureSample(albedoTexture, textureSampler, baseCoords) * (1.0 - quadrant.x) * quadrant.y;

            let shadowMap2 = textureSample(shadowMapTexture, textureSampler, baseCoords, 0) * quadrant.x * quadrant.y;
            let shadowMap3 = textureSample(shadowMapTexture, textureSampler, baseCoords, 1) * quadrant.x * (1.0 - quadrant.y);
            
            return vec4(pow(shadowMap2, 1000)) + vec4(pow(shadowMap3, 1000));
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
                textureSampler: {location: 0, type: "sampler"},
                albedoTexture: {location: 1, type: "texture"},
                shadowMapTexture: {location: 2, type: "depthTexture"},
            }
        });
        this.quadGeometry = Geometry.Plane();

        const sampler = TextureSampler.Create();
        this.shader.SetSampler("textureSampler", sampler);
    }

    public execute(resources: ResourcePool) {
        
        // this.shader.SetTexture("albedoTexture", resources.getResource(PassParams.GBufferAlbedo));
        this.shader.SetTexture("shadowMapTexture", resources.getResource(PassParams.ShadowPassDepth));

        RendererContext.BeginRenderPass("DebuggerPass", [{clear: false}]);

        RendererContext.SetViewport(Renderer.width - 250, 0, 250, 250);
        RendererContext.DrawGeometry(this.quadGeometry, this.shader);
        RendererContext.EndRenderPass();
    }
}