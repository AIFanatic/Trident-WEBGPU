import { GPU, Geometry } from '@trident/core';

class Irradiance {
  irradianceTexture;
  name = "Irradiance";
  initialized = false;
  geometry;
  irradianceShader;
  res;
  constructor(res = 32, outputFormat = "rgba16float") {
    this.res = res;
    this.irradianceTexture = GPU.RenderTextureCube.Create(this.res, this.res, 6, outputFormat);
    this.irradianceTexture.name = "Irradiance";
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
        
                @fragment
                fn fragmentMain(@location(0) uv: vec2f) -> @location(0) vec4f {
                    // Per-pixel normal for this output cubemap face
                    let normal = dirFromFaceUV(u32(face.x), uv.x, uv.y);
            
                    var irradiance = vec3<f32>(0.0);

                    var up = vec3<f32>(0.0, 1.0, 0.0);
                    let tangent = normalize(cross(up, normal));
                    let bitangent = normalize(cross(normal, tangent));

                    let sampleCount = 32u;
                    let invSampleCount = 1.0 / f32(sampleCount);

                    for (var i = 0u; i < sampleCount; i++) {
                        for (var j = 0u; j < sampleCount; j++) {
                            let u1 = (f32(i) + 0.5) * invSampleCount;
                            let u2 = (f32(j) + 0.5) * invSampleCount;

                            let cosTheta = sqrt(u1);
                            let sinTheta = sqrt(1.0 - u1);
                            let phi = 2.0 * PI * u2;

                            let cosPhi = cos(phi);
                            let sinPhi = sin(phi);

                            let sampleVec = vec3<f32>(
                                sinTheta * cosPhi,
                                sinTheta * sinPhi,
                                cosTheta
                            );

                            let worldSample = sampleVec.x * tangent +
                                            sampleVec.y * bitangent +
                                            sampleVec.z * normal;

                            let sampleColor = textureSample(environmentMap, environmentMapSampler, worldSample);
                            irradiance += sampleColor.rgb * cosTheta;
                        }
                    }

                    irradiance = irradiance * PI * invSampleCount * invSampleCount;

                    return vec4<f32>(irradiance, 1.0);
                }
            `,
      colorOutputs: [{ format: this.irradianceTexture.format }],
      attributes: { position: { location: 0, size: 3, type: "vec3" } },
      uniforms: {
        environmentMap: { group: 0, binding: 1, type: "texture" },
        environmentMapSampler: { group: 0, binding: 2, type: "sampler" },
        face: { group: 0, binding: 3, type: "storage" },
        modelViewProjectionMatrix: { group: 0, binding: 4, type: "storage" }
      }
    });
    this.geometry = Geometry.Plane();
    const environmentMapSampler = GPU.TextureSampler.Create({
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
      this.irradianceTexture.SetActiveLayer(face);
      GPU.RendererContext.BeginRenderPass(`${this.name}_${face}`, [{ target: this.irradianceTexture, clear: true }]);
      GPU.RendererContext.DrawGeometry(this.geometry, this.irradianceShader);
      GPU.RendererContext.EndRenderPass();
      GPU.Renderer.EndRenderFrame();
    }
  }
}

export { Irradiance };
