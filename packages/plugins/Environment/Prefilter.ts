import { GPU, Geometry, Mathf } from "@trident/core";

export class Prefilter {
    public prefilterTexture: GPU.RenderTextureCube;
    
    private name = "Prefilter";
    private initialized = false;
    
    private geometry: Geometry;
    private prefilterShader: GPU.Shader;
    
    private res: number;
    private roughnessLevels: number;

    constructor(res: number = 256, roughnessLevels: number = 5, outputFormat: GPU.TextureFormat = "rgba16float") {
        this.res = res;
        this.roughnessLevels = roughnessLevels;
        this.prefilterTexture = GPU.RenderTextureCube.Create(this.res, this.res, 6, outputFormat, roughnessLevels);
        this.prefilterTexture.name = "Prefilter"
    }

    public async init() {
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

                fn distributionGGX(n: vec3f, h: vec3f, roughness: f32) -> f32 {
                    let a = roughness * roughness;
                    let a2 = a * a;
                    let nDotH = max(dot(n, h), 0.0);
                    let nDotH2 = nDotH * nDotH;
                    var denom = (nDotH2 * (a2 - 1.0) + 1.0);
                    denom = PI * denom * denom;
                    return a2 / denom;
                }

                @fragment
                fn fragmentMain(@location(0) uv: vec2f) -> @location(0) vec4f {
                    // Per-pixel normal for this output cubemap face
                    let n = dirFromFaceUV(u32(face.x), uv.x, uv.y);
            
                    // Make the simplifying assumption that V equals R equals the normal
                    let r = n;
                    let v = r;
                    
                    let SAMPLE_COUNT: u32 = 1024u;
                    var prefilteredColor = vec3f(0.0, 0.0, 0.0);
                    var totalWeight = 0.0;
                    let dim = textureDimensions(environmentMap);
                    let resolution = f32(dim.x);
                    
                    for (var i: u32 = 0u; i < SAMPLE_COUNT; i = i + 1u) {
                        // Generates a sample vector that's biased towards the preferred alignment
                        // direction (importance sampling).
                        let xi = hammersley(i, SAMPLE_COUNT);
                        let h = importanceSampleGGX(xi, n, roughness.x);
                        let l = normalize(2.0 * dot(v, h) * h - v);
                    
                        let nDotL = max(dot(n, l), 0.0);
                    
                        if(nDotL > 0.0) {
                            // sample from the environment's mip level based on roughness/pdf
                            let d = distributionGGX(n, h, roughness.x);
                            let nDotH = max(dot(n, h), 0.0);
                            let hDotV = max(dot(h, v), 0.0);
                            let pdf = d * nDotH / (4.0 * hDotV) + 0.0001;
                        
                            let saTexel = 4.0 * PI / (6.0 * resolution * resolution);
                            let saSample = 1.0 / (f32(SAMPLE_COUNT) * pdf + 0.0001);
                        
                            let mipLevel = select(0.5 * log2(saSample / saTexel), 0.0, roughness.x == 0.0);
                        
                            prefilteredColor += textureSampleLevel(environmentMap, environmentSampler, l, mipLevel).rgb * nDotL;
                            totalWeight += nDotL;
                        }
                    }
                    
                    prefilteredColor = prefilteredColor / totalWeight;
                    return vec4f(prefilteredColor, 1.0);
                }
            `,
            colorOutputs: [{ format: this.prefilterTexture.format }],
            attributes: { position: { location: 0, size: 3, type: "vec3" } },
            uniforms: {
                environmentMap: { group: 0, binding: 1, type: "texture" },
                environmentSampler: { group: 0, binding: 2, type: "sampler" },
                face: { group: 0, binding: 3, type: "storage" },
                roughness: { group: 0, binding: 4, type: "storage" },
            }
        });

        this.geometry = Geometry.Plane();

        const environmentSampler = GPU.TextureSampler.Create({
            minFilter: "linear",
            magFilter: "linear",
            mipmapFilter: "linear",
            addressModeU: "clamp-to-edge",
            addressModeV: "clamp-to-edge",
        });

        this.prefilterShader.SetSampler("environmentSampler", environmentSampler);

        this.initialized = true;
    }

    public Update(texture: GPU.RenderTextureCube) {
        if (!this.initialized) return;

        this.prefilterShader.SetTexture("environmentMap", texture);

        for (let mip = 0; mip < this.roughnessLevels; mip += 1) {
            const width = this.prefilterTexture.width >> mip;
            const height = this.prefilterTexture.height >> mip;

            const roughness = mip / (this.roughnessLevels - 1);
            this.prefilterShader.SetArray("roughness", new Float32Array([roughness, 0, 0, 0]));

            for (let face = 0; face < 6; face++) {
                this.prefilterShader.SetArray("face", new Float32Array([face, 0, 0, 0]));

                GPU.Renderer.BeginRenderFrame();
                this.prefilterTexture.SetActiveLayer(face); // select array slice
                this.prefilterTexture.SetActiveMip(mip);
                this.prefilterTexture.SetActiveMipCount(1);
                GPU.RendererContext.BeginRenderPass(`Prefilter_${mip}_${face}`, [{ target: this.prefilterTexture, clear: true }]);
                GPU.RendererContext.SetViewport(0, 0, width, height, 0, 1)
                GPU.RendererContext.DrawGeometry(this.geometry, this.prefilterShader);
                GPU.RendererContext.EndRenderPass();
                GPU.Renderer.EndRenderFrame();
            }
        }

        this.prefilterTexture.SetActiveMip(0);
        this.prefilterTexture.SetActiveMipCount(this.roughnessLevels);
    }
}
