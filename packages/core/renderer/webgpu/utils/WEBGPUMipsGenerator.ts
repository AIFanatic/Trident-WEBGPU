import { Geometry } from "../../../Geometry";
import { Renderer } from "../../Renderer";
import { RendererContext } from "../../RendererContext";
import { Shader } from "../../Shader";
import { RenderTexture, Texture, TextureFormat } from "../../Texture";
import { TextureSampler } from "../../TextureSampler";

export class WEBGPUMipsGenerator {
    private static shader: Shader;
    private static geometry: Geometry;
    private static sampler: TextureSampler;
    private static format: TextureFormat;

    public static numMipLevels(...sizes: number[]) {
        return 1 + Math.log2(Math.max(...sizes)) | 0;
    }

    public static generateMips(source: Texture, destination?: Texture): GPUTexture {
        if (!Renderer.device) throw Error("WEBGPU not initialized");
        if (source.dimension !== "2d") throw Error("2D mip generator requires 2D texture");

        if (!this.shader || this.format !== source.format) {
            this.format = source.format;
            this.geometry = Geometry.Plane();
            this.sampler = new TextureSampler();

            this.shader = new Shader({
                code: `
                    @group(0) @binding(0) var sourceTexture: texture_2d<f32>;
                    @group(0) @binding(1) var sourceSampler: sampler;

                    struct VSOut {
                        @builtin(position) position: vec4f,
                        @location(0) uv: vec2f,
                    };

                    @vertex
                    fn vertexMain(@location(0) position: vec3f) -> VSOut {
                        var out: VSOut;
                        out.position = vec4f(position.xy, 0.0, 1.0);

                        let uv = position.xy * 0.5 + vec2f(0.5);
                        out.uv = vec2f(uv.x, 1.0 - uv.y);

                        return out;
                    }

                    @fragment
                    fn fragmentMain(input: VSOut) -> @location(0) vec4f {
                        return textureSampleLevel(sourceTexture, sourceSampler, input.uv, 0.0);
                    }
                  `,
                colorOutputs: [{ format: source.format }],
                attributes: { position: { location: 0, size: 3, type: "vec3" } },
                uniforms: {
                    sourceTexture: { group: 0, binding: 0, type: "texture" },
                    sourceSampler: { group: 0, binding: 1, type: "sampler" },
                }
            });

            this.shader.SetSampler("sourceSampler", this.sampler);
        }

        const mipLevels = this.numMipLevels(source.width, source.height);
        const target = destination ?? RenderTexture.Create(source.width, source.height, source.depth, source.format, mipLevels);

        if (!destination) {
            Renderer.BeginRenderFrame();
            RendererContext.CopyTextureToTexture(source, target, 0, 0, [source.width, source.height, source.depth]);
            Renderer.EndRenderFrame();
        }

        for (let mip = 1; mip < mipLevels; mip++) {
            const srcMip = mip - 1;
            const width = Math.max(1, source.width >> mip);
            const height = Math.max(1, source.height >> mip);

            target.SetActiveMip(srcMip);
            target.SetActiveMipCount(1);
            this.shader.SetTexture("sourceTexture", target);

            target.SetActiveMip(mip);
            target.SetActiveMipCount(1);

            Renderer.BeginRenderFrame();
            RendererContext.BeginRenderPass(`Mip_${mip}`, [{ target, clear: true }]);
            RendererContext.SetViewport(0, 0, width, height);
            RendererContext.DrawGeometry(this.geometry, this.shader);
            RendererContext.EndRenderPass();
            Renderer.EndRenderFrame();
        }

        return target.GetBuffer();
    }
}