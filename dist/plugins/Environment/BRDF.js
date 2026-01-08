import { GPU, Geometry } from '@trident/core';

class BRDF {
  brdfTexture;
  name = "BRDFLUT";
  geometry;
  brdfShader;
  res;
  constructor(res = 512) {
    this.res = res;
    this.brdfTexture = GPU.RenderTexture.Create(res, res, 1, "rg16float");
  }
  async init() {
    this.brdfShader = await GPU.Shader.Create({
      code: (
        /* wgsl */
        `
            struct VSIn {
                @location(0) position: vec3<f32>,
                @location(1) normal: vec3<f32>,
                @location(2) uv: vec2<f32>,
            };

            struct VSOut {
                @builtin(position) pos: vec4f,
                @location(0) uv: vec2f,
            };
      
            @vertex
            fn vertexMain(input: VSIn) -> VSOut {
                var o: VSOut;
                o.pos = vec4f(input.position.xy, 0.0, 1.0);
                o.uv = input.uv.xy;
                return o;
            }
      
            const PI: f32 = 3.14159265359;

            fn geometrySmith(n: vec3f, v: vec3f, l: vec3f, roughness: f32) -> f32 {
                let nDotV = max(dot(n, v), 0.0);
                let nDotL = max(dot(n, l), 0.0);
                let ggx2 = geometrySchlickGGX(nDotV, roughness);
                let ggx1 = geometrySchlickGGX(nDotL, roughness);
                return ggx1 * ggx2;
            }

            fn importanceSampleGGX(xi: vec2f, n: vec3f, roughness: f32) -> vec3f {
                let a = roughness * roughness;
              
                let phi = 2.0 * PI * xi.x;
                let cosTheta = sqrt((1.0 - xi.y) / (1.0 + (a * a - 1.0) * xi.y));
                let sinTheta = sqrt(1.0 - cosTheta * cosTheta);
              
                // from spherical coordinates to cartesian coordinates - halfway vector
                let h = vec3f(cos(phi) * sinTheta, sin(phi) * sinTheta, cosTheta);
              
                // from tangent-space H vector to world-space sample vector
                let up: vec3f = select(vec3f(1.0, 0.0, 0.0), vec3f(0.0, 0.0, 1.0), abs(n.z) < 0.999);
                let tangent = normalize(cross(up, n));
                let bitangent = cross(n, tangent);
              
                let sampleVec = tangent * h.x + bitangent * h.y + n * h.z;
                return normalize(sampleVec);
            }

            fn radicalInverseVdC(bits_in: u32) -> f32 {
                var bits = bits_in;
                bits = (bits << 16u) | (bits >> 16u);
                bits = ((bits & 0x55555555u) << 1u) | ((bits & 0xAAAAAAAAu) >> 1u);
                bits = ((bits & 0x33333333u) << 2u) | ((bits & 0xCCCCCCCCu) >> 2u);
                bits = ((bits & 0x0F0F0F0Fu) << 4u) | ((bits & 0xF0F0F0F0u) >> 4u);
                bits = ((bits & 0x00FF00FFu) << 8u) | ((bits & 0xFF00FF00u) >> 8u);
                return f32(bits) * 2.3283064365386963e-10;
            }

            fn hammersley(i: u32, n: u32) -> vec2f {
                return vec2f(f32(i) / f32(n), radicalInverseVdC(i));
            }

            fn geometrySchlickGGX(nDotV: f32, roughness: f32) -> f32 {
                let a = roughness;
                let k = (a * a) / 2.0;
              
                let nom = nDotV;
                let denom = nDotV * (1.0 - k) + k;
              
                return nom / denom;
            }
            
            fn integrateBRDF(NdotV: f32, roughness: f32) -> vec2f {
                var V: vec3f;
                V.x = sqrt(1.0 - NdotV * NdotV);
                V.y = 0.0;
                V.z = NdotV;
                
                var A: f32 = 0.0;
                var B: f32 = 0.0;
                
                let N = vec3f(0.0, 0.0, 1.0);
                
                let SAMPLE_COUNT: u32 = 1024u;
                for(var i: u32 = 0u; i < SAMPLE_COUNT; i = i + 1u) {
                    let Xi: vec2f = hammersley(i, SAMPLE_COUNT);
                    let H: vec3f = importanceSampleGGX(Xi, N, roughness);
                    let L: vec3f = normalize(2.0 * dot(V, H) * H - V);
                
                    let NdotL: f32 = max(L.z, 0.0);
                    let NdotH: f32 = max(H.z, 0.0);
                    let VdotH: f32 = max(dot(V, H), 0.0);
                
                    if(NdotL > 0.0) {
                        let G: f32 = geometrySmith(N, V, L, roughness);
                        let G_Vis: f32 = (G * VdotH) / (NdotH * NdotV);
                        let Fc: f32 = pow(1.0 - VdotH, 5.0);
                
                        A += (1.0 - Fc) * G_Vis;
                        B += Fc * G_Vis;
                    }
                }
                A /= f32(SAMPLE_COUNT);
                B /= f32(SAMPLE_COUNT);
                return vec2f(A, B);
            }
      
            @fragment
            fn fragmentMain(@location(0) uv: vec2f) -> @location(0) vec2<f32> {
              return integrateBRDF(uv.x, uv.y);
            }
          `
      ),
      colorOutputs: [{ format: this.brdfTexture.format }],
      attributes: {
        position: { location: 0, size: 3, type: "vec3" },
        normal: { location: 1, size: 3, type: "vec3" },
        uv: { location: 2, size: 2, type: "vec2" }
      },
      uniforms: {}
    });
    this.geometry = Geometry.Plane();
    GPU.Renderer.BeginRenderFrame();
    GPU.RendererContext.BeginRenderPass(this.name, [{ target: this.brdfTexture, clear: true }]);
    GPU.RendererContext.DrawGeometry(this.geometry, this.brdfShader);
    GPU.RendererContext.EndRenderPass();
    GPU.Renderer.EndRenderFrame();
  }
}

export { BRDF };
