import { Geometry } from "../../../Geometry";
import { Vector2 } from "../../../math/Vector2";
import { Renderer } from "../../Renderer";
import { RendererContext } from "../../RendererContext";
import { Shader } from "../../Shader";
import { Texture, TextureFormat } from "../../Texture";
import { TextureSampler } from "../../TextureSampler";
import { WEBGPURenderer } from "../WEBGPURenderer";

export class WEBGPUBlit {
    private static blitShader: Shader;
    private static depthBlitShader: Shader;
    private static blitGeometry: Geometry;

    private static async Init(output: TextureFormat = Renderer.SwapChainFormat) {
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
            colorOutputs: [{ format: output }],
        });
        const textureSampler = TextureSampler.Create();
        WEBGPUBlit.blitShader.SetSampler("textureSampler", textureSampler);
        WEBGPUBlit.blitShader.SetValue("mip", 0);
    }

    private static async InitDepth(output: TextureFormat = "depth24plus") {
        WEBGPUBlit.depthBlitShader = await Shader.Create({
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

              @group(0) @binding(0) var depthTexture: texture_depth_2d;
              @group(0) @binding(1) var<storage, read> mip: f32;
              @group(0) @binding(2) var<storage, read> uv_scale: vec2<f32>;
              @group(0) @binding(3) var<storage, read> src_size: vec2<f32>;

              @vertex
              fn vertexMain(input: VertexInput) -> VertexOutput {
                  var output: VertexOutput;
                  output.position = vec4(input.position, 0.0, 1.0);
                  output.vUv = input.uv;
                  return output;
              }

              @fragment
              fn fragmentMain(input: VertexOutput) -> @builtin(frag_depth) f32 {
                  let uv = input.vUv * uv_scale;
                  let max_coord = src_size - vec2(1.0, 1.0);
                  let coord_f = clamp(uv * src_size, vec2(0.0, 0.0), max_coord);
                  let coord = vec2<i32>(coord_f);
                  return textureLoad(depthTexture, coord, i32(mip));
              }
              `,
            colorOutputs: [],
            depthOutput: output,
            depthWriteEnabled: true,
            depthCompare: "always",
        });

        WEBGPUBlit.depthBlitShader.SetValue("mip", 0);
    }

    public static async Blit(source: Texture, destination: Texture, width: number, height: number, uv_scale: Vector2) {
        if (!this.blitShader || this.blitShader.params.colorOutputs[0].format !== destination.format) await this.Init(destination.format);
        if (!this.blitGeometry) this.blitGeometry = Geometry.Plane();

        this.blitShader.SetTexture("texture", source);
        this.blitShader.SetArray("uv_scale", uv_scale.elements);

        const activeCommandEncoder = WEBGPURenderer.GetActiveCommandEncoder();
        if (!activeCommandEncoder) Renderer.BeginRenderFrame();
        RendererContext.BeginRenderPass("Blit", [{ target: destination, clear: true }]);
        RendererContext.SetViewport(0, 0, width, height)
        RendererContext.DrawGeometry(this.blitGeometry, this.blitShader);
        RendererContext.EndRenderPass();

        if (!activeCommandEncoder) Renderer.EndRenderFrame();
    }

    public static async BlitDepth(source: Texture, destination: Texture, width: number, height: number, uv_scale: Vector2, mip = 0) {
        if (!this.depthBlitShader || this.depthBlitShader.params.depthOutput !== destination.format) await this.InitDepth(destination.format);
        if (!this.blitGeometry) this.blitGeometry = Geometry.Plane();

        this.depthBlitShader.SetTexture("depthTexture", source);
        this.depthBlitShader.SetValue("mip", mip);
        this.depthBlitShader.SetArray("uv_scale", uv_scale.elements);
        this.depthBlitShader.SetArray("src_size", new Float32Array([source.width, source.height]));

        const activeCommandEncoder = WEBGPURenderer.GetActiveCommandEncoder();
        if (!activeCommandEncoder) Renderer.BeginRenderFrame();
        RendererContext.BeginRenderPass("BlitDepth", [], { target: destination, clear: true });
        RendererContext.SetViewport(0, 0, width, height);
        RendererContext.DrawGeometry(this.blitGeometry, this.depthBlitShader);
        RendererContext.EndRenderPass();

        if (!activeCommandEncoder) Renderer.EndRenderFrame();
    }
}