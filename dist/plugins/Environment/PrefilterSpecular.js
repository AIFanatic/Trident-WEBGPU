import { GPU, Geometry } from '@trident/core';

class PrefilterSpecular {
  prefilterSpecular;
  name = "PrefilterSpecular";
  initialized = false;
  geometry;
  prefilterShader;
  res;
  roughnessLevels;
  constructor(res = 512, roughnessLevels = 5, outputFormat = "rgba16float") {
    this.res = res;
    this.roughnessLevels = roughnessLevels;
    this.prefilterSpecular = GPU.RenderTextureCube.Create(this.res, this.res, 6, outputFormat, roughnessLevels);
    this.prefilterSpecular.name = "PrefilterSpecular";
  }
  async init() {
    this.prefilterShader = await GPU.Shader.Create({
      code: `
                @group(0) @binding(1) var environmentMap: texture_cube<f32>;
                @group(0) @binding(2) var environmentSampler: sampler;
        
                @group(0) @binding(3) var<storage, read> face: vec4<f32>;
                @group(0) @binding(4) var<storage, read> roughness: vec4<f32>;
        
                struct VSOut {
                    @builtin(position) pos: vec4f,
                    @location(0) uv: vec2f,
                };
        
                @vertex
                fn vertexMain(@location(0) position: vec3f) -> VSOut {
                    var o: VSOut;
                    o.pos = vec4f(position.xy, 0.0, 1.0);
                    o.uv  = position.xy;        // [-1,1] quad coords
                    return o;
                }
        
                // Map face + NDC uv -> direction
                fn dirFromFaceUV(face: u32, x: f32, y: f32) -> vec3f {
                    let u = x; let v = y;
                    switch face {
                    case 0u { return normalize(vec3( 1.0,  v, -u)); } // +X
                    case 1u { return normalize(vec3(-1.0,  v,  u)); } // -X
                    case 2u { return normalize(vec3( u,  1.0, -v)); } // +Y
                    case 3u { return normalize(vec3( u, -1.0,  v)); } // -Y
                    case 4u { return normalize(vec3( u,  v,  1.0)); } // +Z
                    default { return normalize(vec3(-u,  v, -1.0)); } // -Z
                    }
                }
        
                const PI = 3.14159265359;
        
                // http://holger.dammertz.org/stuff/notes_HammersleyOnHemisphere.html
                // efficient VanDerCorpus calculation.
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

                // Based omn http://byteblacksmith.com/improvements-to-the-canonical-one-liner-glsl-rand-for-opengl-es-2-0/
                fn random(co: vec2f) -> f32
                {
                    let a = 12.9898;
                    let b = 78.233;
                    let c = 43758.5453;
                    let dt= dot(co.xy ,vec2(a,b));
                    let sn= dt % 3.14;
                    return fract(sin(sn) * c);
                }

                // Based on http://blog.selfshadow.com/publications/s2013-shading-course/karis/s2013_pbs_epic_slides.pdf
                fn importanceSample_GGX(Xi: vec2f, roughness: f32, normal: vec3f) -> vec3f 
                {
                    // Maps a 2D point to a hemisphere with spread based on roughness
                    let alpha: f32 = roughness * roughness;
                    // let phi: f32 = 2.0 * PI * Xi.x + random(normal.xz) * 0.1;
                    let phi: f32 = 2.0 * PI * Xi.x;
                    let cosTheta: f32 = sqrt((1.0 - Xi.y) / (1.0 + (alpha * alpha - 1.0) * Xi.y));
                    let sinTheta: f32 = sqrt(1.0 - cosTheta * cosTheta);
                    let H: vec3f = vec3f(sinTheta * cos(phi), sinTheta * sin(phi), cosTheta);

                    // Tangent space
                    let up: vec3f = select(vec3f(1.0, 0.0, 0.0), vec3f(0.0, 0.0, 1.0), abs(normal.z) < 0.999);
                    let tangentX: vec3f = normalize(cross(up, normal));
                    let tangentY: vec3f = cross(normal, tangentX);

                    // Convert to world Space
                    return tangentX * H.x + tangentY * H.y + normal * H.z;
                }

                fn D_GGX(dotNH: f32, roughness: f32) -> f32
                {
                    let alpha = roughness * roughness;
                    let alpha2 = alpha * alpha;
                    let denom = dotNH * dotNH * (alpha2 - 1.0) + 1.0;
                    return (alpha2)/(PI * denom*denom); 
                }

                @fragment
                fn fragmentMain(@location(0) uv: vec2f) -> @location(0) vec4f {
                    // Per-pixel normal for this output cubemap face
                    let n = dirFromFaceUV(u32(face.x), uv.x, uv.y);

                    let numSamples = 32u;

                    let R = n;
                    let N = R;
                    let V = R;
                    var color = vec3f(0.0);
                    var totalWeight = 0.0;
                    let envMapDim = f32(textureDimensions(environmentMap).x);
                    for(var i = 0u; i < numSamples; i++) {
                        let Xi = hammersley(i, numSamples);
                        let H = importanceSample_GGX(Xi, roughness.x, N);
                        let L = 2.0 * dot(V, H) * H - V;
                        let dotNL = clamp(dot(N, L), 0.0, 1.0);
                        if(dotNL > 0.0) {
                            // Filtering based on https://placeholderart.wordpress.com/2015/07/28/implementation-notes-runtime-environment-map-filtering-for-image-based-lighting/

                            let dotNH = clamp(dot(N, H), 0.0, 1.0);
                            let dotVH = clamp(dot(V, H), 0.0, 1.0);

                            // Probability Distribution Function
                            let pdf = D_GGX(dotNH, roughness.x) * dotNH / (4.0 * dotVH) + 0.0001;
                            // Slid angle of current smple
                            let omegaS = 1.0 / (f32(numSamples) * pdf);
                            // Solid angle of 1 pixel across all cube faces
                            let omegaP = 4.0 * PI / (6.0 * envMapDim * envMapDim);
                            // Biased (+1.0) mip level for better result
                            var mipLevel = 0.0;
                            if (roughness.x == 0.0) {
                                mipLevel = 0.0;
                            }
                            else {
                                mipLevel = max(0.5 * log2(omegaS / omegaP) + 1.0, 0.0f);
                            }
                            color += textureSampleLevel(environmentMap, environmentSampler, L, mipLevel).rgb * dotNL;
                            totalWeight += dotNL;

                        }
                    }
                    return vec4f((color / totalWeight), 1.0);
                }
            `,
      colorOutputs: [{ format: this.prefilterSpecular.format }],
      attributes: { position: { location: 0, size: 3, type: "vec3" } },
      uniforms: {
        environmentMap: { group: 0, binding: 1, type: "texture" },
        environmentSampler: { group: 0, binding: 2, type: "sampler" },
        face: { group: 0, binding: 3, type: "storage" },
        roughness: { group: 0, binding: 4, type: "storage" }
      }
    });
    this.geometry = Geometry.Plane();
    const environmentSampler = new GPU.TextureSampler({
      minFilter: "linear",
      magFilter: "linear",
      mipmapFilter: "linear",
      addressModeU: "clamp-to-edge",
      addressModeV: "clamp-to-edge"
    });
    this.prefilterShader.SetSampler("environmentSampler", environmentSampler);
    this.initialized = true;
  }
  Update(texture) {
    if (!this.initialized) return;
    this.prefilterShader.SetTexture("environmentMap", texture);
    for (let mip = 0; mip < this.roughnessLevels; mip += 1) {
      const width = this.prefilterSpecular.width >> mip;
      const height = this.prefilterSpecular.height >> mip;
      const roughness = mip / (this.roughnessLevels - 1);
      this.prefilterShader.SetArray("roughness", new Float32Array([roughness, 0, 0, 0]));
      for (let face = 0; face < 6; face++) {
        this.prefilterShader.SetArray("face", new Float32Array([face, 0, 0, 0]));
        GPU.Renderer.BeginRenderFrame();
        this.prefilterSpecular.SetActiveLayer(face);
        this.prefilterSpecular.SetActiveMip(mip);
        this.prefilterSpecular.SetActiveMipCount(1);
        GPU.RendererContext.BeginRenderPass(`Prefilter_${mip}_${face}`, [{ target: this.prefilterSpecular, clear: true }]);
        GPU.RendererContext.SetViewport(0, 0, width, height, 0, 1);
        GPU.RendererContext.DrawGeometry(this.geometry, this.prefilterShader);
        GPU.RendererContext.EndRenderPass();
        GPU.Renderer.EndRenderFrame();
      }
    }
    this.prefilterSpecular.SetActiveMip(0);
    this.prefilterSpecular.SetActiveMipCount(this.roughnessLevels);
  }
}

export { PrefilterSpecular };
