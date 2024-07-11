import { DepthTarget, RendererContext } from "../RendererContext";
import { RenderPass, ResourcePool } from "../RenderGraph";
import { Renderer } from "../Renderer";
import { Shader } from "../Shader";
import { PassParams } from "../RenderingPipeline";
import { Geometry } from "../../Geometry";
import { TextureSampler } from "../TextureSampler";
import { DepthTexture } from "../Texture";
import { Buffer, BufferType } from "../Buffer";

export class DepthViewer extends RenderPass {
    public name: string = "DepthViewer";
    private shader: Shader;
    private quadGeometry: Geometry;
    private debugLevelBuffer: Buffer;

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
        @group(0) @binding(2) var<storage, read> debugLevel: f32;
        
        @vertex fn vertexMain(input: VertexInput) -> VertexOutput {
            var output: VertexOutput;
            output.position = vec4(input.position, 0.0, 1.0);
            output.vUv = input.uv;
            return output;
        }
        
        @fragment fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
            let uv = input.vUv;

            let shadowMap = textureSampleLevel(shadowMapTexture, textureSampler, uv, u32(debugLevel));
            
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
                debugLevel: {group: 0, binding: 2, type: "storage"},
            }
        });
        this.quadGeometry = Geometry.Plane();

        const sampler = TextureSampler.Create({minFilter: "nearest", magFilter: "nearest"});
        this.shader.SetSampler("textureSampler", sampler);

        this.debugLevelBuffer = Buffer.Create(4, BufferType.STORAGE);
        this.shader.SetBuffer("debugLevel", this.debugLevelBuffer);
    }

    public execute(resources: ResourcePool, depthTexture: DepthTexture, debugLevel: number) {
        
        // this.shader.SetTexture("albedoTexture", resources.getResource(PassParams.GBufferAlbedo));
        this.debugLevelBuffer.SetArray(new Float32Array([debugLevel]));
        this.shader.SetTexture("shadowMapTexture", depthTexture);

        RendererContext.BeginRenderPass("DepthViewer", [{clear: false}]);

        // RendererContext.SetViewport(Renderer.width - 250, 0, 250, 250);
        RendererContext.DrawGeometry(this.quadGeometry, this.shader);
        RendererContext.EndRenderPass();
    }
}