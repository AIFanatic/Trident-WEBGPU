import { Geometry } from "../../../Geometry";
import { Renderer } from "../../Renderer";
import { RendererContext } from "../../RendererContext";
import { Shader } from "../../Shader";
import { RenderTexture, Texture, TextureFormat } from "../../Texture";

export class WEBGPUMipsGenerator {
    private static shader: Shader;
    private static geometry: Geometry;
    private static format: TextureFormat;
    private static mipSource: Texture;

    public static numMipLevels(...sizes: number[]) {
        return 1 + Math.log2(Math.max(...sizes)) | 0;
    }

    private static GetMipSource(width: number, height: number, format: TextureFormat): Texture {
        if (
            !this.mipSource ||
            this.mipSource.width < width ||
            this.mipSource.height < height ||
            this.mipSource.format !== format
        ) {
            this.mipSource = RenderTexture.Create(width, height, 1, format, 1);
            this.mipSource.name = "MipSource";
        }

        return this.mipSource;
    }

    private static GetShader(format: TextureFormat): Shader {
        if (!this.geometry) this.geometry = Geometry.Plane();

        if (!this.shader || this.format !== format) {
            this.format = format;

            this.shader = new Shader({
                code: `
                      @group(0) @binding(0) var sourceTexture: texture_2d<f32>;

                      struct VSOut {
                          @builtin(position) position: vec4f,
                      };

                      @vertex
                      fn vertexMain(@location(0) position: vec3f) -> VSOut {
                          var out: VSOut;
                          out.position = vec4f(position.xy, 0.0, 1.0);
                          return out;
                      }

                      @fragment
                      fn fragmentMain(input: VSOut) -> @location(0) vec4f {
                          let srcSize = textureDimensions(sourceTexture);
                          let dst = vec2u(input.position.xy);
                          let src = dst * 2u;

                          let maxCoord = srcSize - vec2u(1u);

                          let p00 = min(src + vec2u(0u, 0u), maxCoord);
                          let p10 = min(src + vec2u(1u, 0u), maxCoord);
                          let p01 = min(src + vec2u(0u, 1u), maxCoord);
                          let p11 = min(src + vec2u(1u, 1u), maxCoord);

                          let c00 = textureLoad(sourceTexture, vec2i(p00), 0);
                          let c10 = textureLoad(sourceTexture, vec2i(p10), 0);
                          let c01 = textureLoad(sourceTexture, vec2i(p01), 0);
                          let c11 = textureLoad(sourceTexture, vec2i(p11), 0);

                          return (c00 + c10 + c01 + c11) * 0.25;
                      }
                  `,
                colorOutputs: [{ format }],
                attributes: {
                    position: { location: 0, size: 3, type: "vec3" }
                },
                uniforms: {
                    sourceTexture: { group: 0, binding: 0, type: "texture" },
                }
            });
        }

        return this.shader;
    }

    public static generateMips(source: Texture, destination?: Texture): GPUTexture {
        if (!Renderer.device) throw Error("WEBGPU not initialized");
        if (source.dimension !== "2d") throw Error("2D mip generator requires 2D texture");

        const mipLevels = this.numMipLevels(source.width, source.height);
        const target = destination ?? RenderTexture.Create(source.width, source.height, source.depth, source.format, mipLevels);

        const shader = this.GetShader(source.format);
        const mipSource = this.GetMipSource(source.width, source.height, source.format);

        shader.SetTexture("sourceTexture", mipSource);

        if (!destination) {
            Renderer.BeginRenderFrame();
            RendererContext.CopyTextureToTextureV3(
                { texture: source, mipLevel: 0, origin: [0, 0, 0] },
                { texture: target, mipLevel: 0, origin: [0, 0, 0] },
                [source.width, source.height, 1]
            );
            Renderer.EndRenderFrame();
        }

        for (let mip = 1; mip < mipLevels; mip++) {
            const srcMip = mip - 1;

            const srcWidth = Math.max(1, target.width >> srcMip);
            const srcHeight = Math.max(1, target.height >> srcMip);

            const dstWidth = Math.max(1, target.width >> mip);
            const dstHeight = Math.max(1, target.height >> mip);

            const isInFrame = Renderer.HasActiveFrame();
            if (!isInFrame) Renderer.BeginRenderFrame();

            RendererContext.CopyTextureToTextureV3(
                { texture: target, mipLevel: srcMip, origin: [0, 0, 0] },
                { texture: mipSource, mipLevel: 0, origin: [0, 0, 0] },
                [srcWidth, srcHeight, 1]
            );

            target.SetActiveMip(mip);
            target.SetActiveMipCount(1);

            RendererContext.BeginRenderPass(`Mip_${mip}`, [{ target, clear: true }]);
            RendererContext.SetViewport(0, 0, dstWidth, dstHeight);
            RendererContext.DrawGeometry(this.geometry, shader);
            RendererContext.EndRenderPass();

            if (!isInFrame) Renderer.EndRenderFrame();
        }

        target.SetActiveMip(0);
        target.SetActiveMipCount(mipLevels);

        return target.GetBuffer();
    }
}