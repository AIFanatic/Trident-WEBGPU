import { GPU, Geometry } from '@trident/core';

class TextureToCubemap {
  cubemapTexture;
  name = "TextureToCubemap";
  geometry;
  shader;
  constructor(res, format = "rgba16float") {
    this.cubemapTexture = GPU.RenderTextureCube.Create(res, res, 6, format);
  }
  async init() {
    this.shader = await GPU.Shader.Create({
      code: (
        /* wgsl */
        `
            @group(0) @binding(1) var hdrTexture: texture_2d<f32>;
            @group(0) @binding(2) var hdrSampler: sampler;
      
            @group(0) @binding(3) var<storage, read> face: vec4<f32>;
      
            struct VSOut { @builtin(position) pos: vec4f, @location(0) uv: vec2f };
      
            @vertex
            fn vertexMain(@location(0) position: vec3f) -> VSOut {
                var o: VSOut;
                o.pos = vec4f(position.xy, 0.0, 1.0);
                o.uv  = position.xy; // [-1,1]
                return o;
            }
      
            fn dirFromFaceUV(face: u32, x: f32, y: f32) -> vec3f {
                let u = x; let v = y;
                switch face {
                    case 0u { return normalize(vec3(-1.0,  v,  u)); } // -X
                    case 1u { return normalize(vec3( 1.0,  v, -u)); } // +X
                    case 2u { return normalize(vec3( -u,  1.0, v)); } // +Y
                    case 3u { return normalize(vec3( -u, -1.0, -v)); } // -Y
                    case 4u { return normalize(vec3(-u,  v, -1.0)); } // +Z
                    default { return normalize(vec3( u,  v,  1.0)); } // -Z
                }
            }
      
            const invAtan = vec2f(0.15915494309189535, 0.3183098861837907);
      
            fn sampleSphericalMap(v: vec3f) -> vec2f {
                var st = vec2f(atan2(v.z, v.x), asin(v.y));
                st *= invAtan;
                st += 0.5;
                return st;
            }

            const PI = 3.14159265358979323846;
            const INV_PI = 0.31830988618379067154;
            fn sampleSkyViewLUT(v: vec3f) -> vec2f {
                let azimuth = atan2(v.z, v.x) * 0.5 * INV_PI + 0.5;
                let elev    = asin(v.y);
                let signElev = select(-1.0, 1.0, elev >= 0.0);
                let t = sqrt(abs(elev) / (0.5 * PI));
                let lutV = 0.5 * (signElev * t + 1.0);
                return vec2(azimuth, lutV);
            }
      
            @fragment
            fn fragmentMain(@location(0) uv: vec2f) -> @location(0) vec4f {
                let dir = dirFromFaceUV(u32(face.x), uv.x, uv.y) * -1;
                // let st  = sampleSphericalMap(dir);
                let st  = sampleSkyViewLUT(dir);
                let col = textureSample(hdrTexture, hdrSampler, st).rgb;
                return vec4f(col, 1.0);
            }
          `
      ),
      colorOutputs: [{ format: this.cubemapTexture.format }],
      attributes: { position: { location: 0, size: 3, type: "vec3" } },
      uniforms: {
        hdrTexture: { group: 0, binding: 1, type: "texture" },
        hdrSampler: { group: 0, binding: 2, type: "sampler" },
        face: { group: 0, binding: 3, type: "storage" }
      }
    });
    this.geometry = Geometry.Plane();
    const hdrSampler = GPU.TextureSampler.Create({
      minFilter: "linear",
      magFilter: "linear",
      mipmapFilter: "linear",
      addressModeU: "repeat",
      addressModeV: "clamp-to-edge"
    });
    this.shader.SetSampler("hdrSampler", hdrSampler);
  }
  Update(texture) {
    this.shader.SetTexture("hdrTexture", texture);
    for (let face = 0; face < 6; face++) {
      this.shader.SetArray("face", new Float32Array([face, 0, 0, 0]));
      GPU.Renderer.BeginRenderFrame();
      this.cubemapTexture.SetActiveLayer(face);
      GPU.RendererContext.BeginRenderPass(`EquirectToCubeFace_${face}`, [{ target: this.cubemapTexture, clear: true }]);
      GPU.RendererContext.DrawGeometry(this.geometry, this.shader);
      GPU.RendererContext.EndRenderPass();
      GPU.Renderer.EndRenderFrame();
    }
  }
}

export { TextureToCubemap };
