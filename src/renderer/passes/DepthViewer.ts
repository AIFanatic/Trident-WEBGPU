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

    constructor() {
        super({});

        this.init();
    }

    protected async init() {
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
        @group(0) @binding(3) var<storage, read> debugExposure: f32;
        
        @vertex fn vertexMain(input: VertexInput) -> VertexOutput {
            var output: VertexOutput;
            output.position = vec4(input.position, 0.0, 1.0);
            output.vUv = input.uv;
            return output;
        }
        
        @fragment fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
            let uv = input.vUv;

            let shadowMap = textureSampleLevel(shadowMapTexture, textureSampler, uv, u32(debugLevel));
            
            let exposureFactor = pow(2.0, debugExposure + 5.0);
            return vec4((1 - shadowMap) * exposureFactor, vec3(0));
        }
        `;

        this.shader = await Shader.Create({
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
                debugExposure: {group: 0, binding: 3, type: "storage"},
            }
        });
        this.quadGeometry = Geometry.Plane();

        const sampler = TextureSampler.Create({magFilter: "nearest", minFilter: "nearest"});
        this.shader.SetSampler("textureSampler", sampler);

        this.initialized = true;
    }

    public execute(resources: ResourcePool, depthTexture: DepthTexture, debugLevel: number, debugExposure: number) {
        if (this.initialized === false) return;

        // this.shader.SetTexture("albedoTexture", resources.getResource(PassParams.GBufferAlbedo));
        // this.debugLevelBuffer.SetArray(new Float32Array([debugLevel]));
        this.shader.SetValue("debugLevel", debugLevel);
        this.shader.SetValue("debugExposure", debugExposure);
        this.shader.SetTexture("shadowMapTexture", depthTexture);

        RendererContext.BeginRenderPass("DepthViewer", [{clear: false}]);

        // RendererContext.SetViewport(0, 0, depthTexture.width, depthTexture.height);
        RendererContext.DrawGeometry(this.quadGeometry, this.shader);
        RendererContext.EndRenderPass();
    }
}