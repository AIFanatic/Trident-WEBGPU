import { Geometry } from "../../../Geometry";
import { Renderer } from "../../Renderer";
import { RendererContext } from "../../RendererContext";
import { Shader } from "../../Shader";
import { RenderTextureCube, Texture, TextureFormat } from "../../Texture";
import { TextureSampler } from "../../TextureSampler";

export class WEBGPUCubeMipsGenerator {
    private static shader: Shader;
    private static geometry: Geometry;
    private static sampler: TextureSampler;
    private static format: TextureFormat;

    public static numMipLevels(...sizes: number[]) { return 1 + Math.log2(Math.max(...sizes)) | 0 }

    public static generateMips(source: Texture, destination?: Texture): GPUTexture {
        if (!Renderer.device) throw Error("WEBGPU not initialized");
        if (source.dimension !== "cube") throw Error("Cube mip generator requires cube texture");

        if (!this.shader || this.format !== source.format) {
            this.format = source.format;
            this.geometry = Geometry.Plane();
            this.sampler = new TextureSampler();

            this.shader = new Shader({
                code: `
                  @group(0) @binding(0) var ourTexture: texture_cube<f32>;
                  @group(0) @binding(1) var ourSampler: sampler;
                  @group(0) @binding(2) var<storage, read> params: vec4f;

                  struct VSOut {
                      @builtin(position) position: vec4f,
                      @location(0) uv: vec2f,
                  };

                  @vertex
                  fn vertexMain(@location(0) position: vec3f) -> VSOut {
                      var out: VSOut;
                      out.position = vec4f(position.xy, 0.0, 1.0);
                      out.uv = position.xy * 0.5 + vec2f(0.5);
                      return out;
                  }

                  fn dirFromFaceUV(face: u32, x: f32, y: f32) -> vec3f {
                      let u = x * 2.0 - 1.0;
                      let v = y * 2.0 - 1.0;
                      switch face {
                          case 0u { return normalize(vec3( 1.0,  v, -u)); }
                          case 1u { return normalize(vec3(-1.0,  v,  u)); }
                          case 2u { return normalize(vec3( u,  1.0, -v)); }
                          case 3u { return normalize(vec3( u, -1.0,  v)); }
                          case 4u { return normalize(vec3( u,  v,  1.0)); }
                          default { return normalize(vec3(-u,  v, -1.0)); }
                      }
                  }

                  @fragment
                  fn fragmentMain(input: VSOut) -> @location(0) vec4f {
                      let dir = dirFromFaceUV(u32(params.x), input.uv.x, input.uv.y);
                      return vec4f(textureSampleLevel(ourTexture, ourSampler, dir, 0.0).rgb, 1.0);
                  }
              `,
                colorOutputs: [{ format: source.format }],
                attributes: { position: { location: 0, size: 3, type: "vec3" } },
                uniforms: {
                    ourTexture: { group: 0, binding: 0, type: "texture" },
                    ourSampler: { group: 0, binding: 1, type: "sampler" },
                    params: { group: 0, binding: 2, type: "storage" },
                }
            });

            this.shader.SetSampler("ourSampler", this.sampler);
        }

        const mipLevels = this.numMipLevels(source.width, source.height);
        const target = destination ?? RenderTextureCube.Create(source.width, source.height, 6, source.format, mipLevels);

        if (!destination) {
            Renderer.BeginRenderFrame();
            RendererContext.CopyTextureToTexture(source, target, 0, 0, [source.width, source.height, 6]);
            Renderer.EndRenderFrame();
        }

        for (let mip = 1; mip < mipLevels; mip++) {
            const srcMip = mip - 1;
            const width = Math.max(1, source.width >> mip);
            const height = Math.max(1, source.height >> mip);

            target.SetActiveMip(srcMip);
            target.SetActiveMipCount(1);
            this.shader.SetTexture("ourTexture", target);

            for (let face = 0; face < 6; face++) {
                this.shader.SetArray("params", new Float32Array([face, 0, 0, 0]));

                target.SetActiveLayer(face);
                target.SetActiveMip(mip);
                target.SetActiveMipCount(1);

                Renderer.BeginRenderFrame();
                RendererContext.BeginRenderPass(`CubeMip_${mip}_${face}`, [{ target, clear: true }]);
                RendererContext.SetViewport(0, 0, width, height);
                RendererContext.DrawGeometry(this.geometry, this.shader);
                RendererContext.EndRenderPass();
                Renderer.EndRenderFrame();
            }
        }

        return target.GetBuffer();
    }
}