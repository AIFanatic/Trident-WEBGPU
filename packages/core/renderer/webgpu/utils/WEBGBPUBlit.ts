import { Geometry } from "../../../Geometry";
import { Vector2 } from "../../../math/Vector2";
import { Renderer } from "../../Renderer";
import { RendererContext } from "../../RendererContext";
import { Shader } from "../../Shader";
import { ShaderLoader } from "../../ShaderUtils";
import { Texture } from "../../Texture";
import { TextureSampler } from "../../TextureSampler";
import { WEBGPURenderer } from "../WEBGPURenderer";

const i = setInterval(async () => {
    if (Renderer.type === "webgpu") {
        WEBGPUBlit.blitShader = await Shader.Create({
            code: `
            struct VertexInput {
                @location(0) position : vec2<f32>,
                @location(1) normal : vec3<f32>,
                @location(2) uv : vec2<f32>,
            };
            
            struct VertexOutput {
                @builtin(position) position : vec4<f32>,
                @location(0) vUv : vec2<f32>,
            };
            
            @group(0) @binding(0) var texture: texture_2d<f32>;
            @group(0) @binding(1) var textureSampler: sampler;
            @group(0) @binding(2) var<storage, read> mip: f32;
            @group(0) @binding(3) var<storage, read> uv_scale: vec2<f32>;
            
            @vertex
            fn vertexMain(input: VertexInput) -> VertexOutput {
                var output: VertexOutput;
                output.position = vec4(input.position, 0.0, 1.0);
                output.vUv = input.uv;
                return output;
            }
            
            @fragment
            fn fragmentMain(input: VertexOutput) -> @location(0) vec4<f32> {
                let uv = input.vUv;
                var color = textureSampleLevel(texture, textureSampler, uv * uv_scale, mip);
            
                return color;
            }
            `,
            colorOutputs: [{format: Renderer.SwapChainFormat}],
            attributes: {
                position: { location: 0, size: 3, type: "vec3" },
                normal: { location: 1, size: 3, type: "vec3" },
                uv: { location: 2, size: 2, type: "vec2" }
            },
            uniforms: {
                texture: {group: 0, binding: 0, type: "texture"},
                textureSampler: {group: 0, binding: 1, type: "sampler"},
                mip: {group: 0, binding: 2, type: "storage"},
                uv_scale: {group: 0, binding: 3, type: "storage"},
            },
        });
        const textureSampler = TextureSampler.Create();
        WEBGPUBlit.blitShader.SetSampler("textureSampler", textureSampler);
        WEBGPUBlit.blitShader.SetValue("mip", 0);
        clearInterval(i);
    }
}, 100);

export class WEBGPUBlit {
    public static blitShader: Shader;
    private static blitGeometry: Geometry;

    public static Blit(source: Texture, destination: Texture, width: number, height: number, uv_scale: Vector2) {
        if (!this.blitShader) throw Error("Blit shader not created");
        if (!this.blitGeometry) this.blitGeometry = Geometry.Plane();

        this.blitShader.SetTexture("texture", source);
        this.blitShader.SetArray("uv_scale", uv_scale.elements);

        const activeCommandEncoder = WEBGPURenderer.GetActiveCommandEncoder();
        if (!activeCommandEncoder) Renderer.BeginRenderFrame();
        RendererContext.BeginRenderPass("Blit", [{target: destination, clear: true}]);
        RendererContext.SetViewport(0, 0, width, height)
        RendererContext.DrawGeometry(this.blitGeometry, this.blitShader);
        RendererContext.EndRenderPass();

        if (!activeCommandEncoder) Renderer.EndRenderFrame();
    }
}