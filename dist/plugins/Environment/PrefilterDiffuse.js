import { GPU, Geometry } from '@trident/core';

class PrefilterDiffuse {
  prefilterDiffuse;
  name = "PrefilterDiffuse";
  initialized = false;
  geometry;
  irradianceShader;
  res;
  constructor(res = 64, outputFormat = "rgba16float") {
    this.res = res;
    this.prefilterDiffuse = GPU.RenderTextureCube.Create(this.res, this.res, 6, outputFormat);
    this.prefilterDiffuse.name = "PrefilterDiffuse";
  }
  async init() {
    this.irradianceShader = await GPU.Shader.Create({
      code: `
                @group(0) @binding(1) var environmentMap: texture_cube<f32>;
                @group(0) @binding(2) var environmentMapSampler: sampler;
        
                @group(0) @binding(3) var<storage, read> face: vec4<f32>;

                @group(0) @binding(4) var<storage, read> modelViewProjectionMatrix: mat4x4f;
        
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

                // @fragment
                // fn fragmentMain(@location(0) uv: vec2f) -> @location(0) vec4f {
                //     // Per-pixel normal for this output cubemap face
                //     let normal = dirFromFaceUV(u32(face.x), uv.x, uv.y);



                //     let N = normalize(normal);
                    

                //     let TWO_PI = PI * 2.0;
                //     let HALF_PI = PI * 0.5;
                    
                //     let deltaPhi = TWO_PI / 360.0;
                //     let deltaTheta = HALF_PI / 90.0;

                //     var color = vec3f(0.0);
                //     var totalWeight = 0.0;

                //     for (var phi = 0.0; phi < TWO_PI; phi += deltaPhi) {
                //         for (var theta = 0.0; theta < PI; theta += deltaTheta) {
                //             let L = vec3f(sin(theta) * cos(phi), cos(theta), sin(theta) * sin(phi)); // No up/right because it causes artifacts, just compute here

                //             let NoL = max(dot(N, L), 0.0);
                //             let weight = NoL * sin(theta);

                //             color += textureSampleLevel(environmentMap, environmentMapSampler, L, 5.0).rgb * weight;
                //             totalWeight += weight;
                //         }
                //     }

                //     return vec4f(color / totalWeight, 1.0);
                // }

                @fragment
                fn fragmentMain(@location(0) uv: vec2f) -> @location(0) vec4f {
                    // Per-pixel normal for this output cubemap face
                    let normal = dirFromFaceUV(u32(face.x), uv.x, uv.y);



                    let N = normalize(normal);

                    var up = vec3(1.0, 0.0, 0.0);

                    if (abs(N.z) < 0.999) {
                        up = vec3(0.0, 0.0, 1.0);
                    }
                    let right = normalize(cross(up, N));
                    up = cross(N, right);

                    let TWO_PI = PI * 2.0;
                    let HALF_PI = PI * 0.5;

                    let deltaPhi = TWO_PI / 128.0;
                    let deltaTheta = HALF_PI / 64.0;

                    var color = vec3f(0.0);
                    var sampleCount = 0u;

                    for (var phi = 0.0; phi < TWO_PI; phi += deltaPhi) {
                        for (var theta = 0.0; theta < HALF_PI; theta += deltaTheta) {
                            let tempVec = cos(phi) * right + sin(phi) * up;
                            let sampleVector = cos(theta) * N + sin(theta) * tempVec;
                            color += textureSampleLevel(environmentMap, environmentMapSampler, sampleVector, 5.0).rgb * cos(theta) * sin(theta);
                            sampleCount++;
                        }
                    }

                    return vec4(PI * color / f32(sampleCount), 1.0);
                }
            `,
      colorOutputs: [{ format: this.prefilterDiffuse.format }],
      attributes: { position: { location: 0, size: 3, type: "vec3" } },
      uniforms: {
        environmentMap: { group: 0, binding: 1, type: "texture" },
        environmentMapSampler: { group: 0, binding: 2, type: "sampler" },
        face: { group: 0, binding: 3, type: "storage" },
        modelViewProjectionMatrix: { group: 0, binding: 4, type: "storage" }
      }
    });
    this.geometry = Geometry.Plane();
    const environmentMapSampler = new GPU.TextureSampler({
      minFilter: "linear",
      magFilter: "linear",
      mipmapFilter: "linear",
      addressModeU: "clamp-to-edge",
      addressModeV: "clamp-to-edge"
    });
    this.irradianceShader.SetSampler("environmentMapSampler", environmentMapSampler);
    this.initialized = true;
  }
  Update(texture) {
    if (!this.initialized) return;
    this.irradianceShader.SetTexture("environmentMap", texture);
    for (let face = 0; face < 6; face++) {
      this.irradianceShader.SetArray("face", new Float32Array([face, 0, 0, 0]));
      GPU.Renderer.BeginRenderFrame();
      this.prefilterDiffuse.SetActiveLayer(face);
      GPU.RendererContext.BeginRenderPass(`${this.name}_${face}`, [{ target: this.prefilterDiffuse, clear: true }]);
      GPU.RendererContext.DrawGeometry(this.geometry, this.irradianceShader);
      GPU.RendererContext.EndRenderPass();
      GPU.Renderer.EndRenderFrame();
    }
  }
}

export { PrefilterDiffuse };
