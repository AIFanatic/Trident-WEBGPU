import {
    Geometry,
    GPU
}  from "@trident/core";

export class HiZPass extends GPU.RenderPass {
    public name: string = "HiZPass";
    private shader: GPU.Shader;
    private quadGeometry: Geometry;
    
    private inputTexture: GPU.DepthTexture;
    private targetTextures: GPU.DepthTexture[] = [];

    // TODO: This should be next powerOf2 for SwapChain dims
    public depthWidth = 512;
    public depthHeight = 512;
    
    private passBuffers: GPU.Buffer[] = [];
    private currentBuffer: GPU.Buffer;

    public initialized: boolean = false;

    private blitShader: GPU.Shader;

    public async init(resources: GPU.ResourcePool) {
        this.shader = await GPU.Shader.Create({
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
                
                @group(0) @binding(0) var depthTextureInputSampler: sampler_comparison;
                @group(0) @binding(1) var depthTextureInput: texture_depth_2d;
                @group(0) @binding(2) var<storage, read> currentMip: f32;
                
                @vertex
                fn vertexMain(input: VertexInput) -> VertexOutput {
                    var output: VertexOutput;
                    output.position = vec4(input.position, 0.0, 1.0);
                    output.vUv = input.uv;
                    return output;
                }
                
                fn HZBReduce(mainTex: texture_depth_2d, inUV: vec2f, invSize: vec2f) -> f32 {
                    var depth = vec4f(0.0);
                    let uv0 = inUV + vec2f(-0.25f, -0.25f) * invSize;
                    let uv1 = inUV + vec2f(0.25f, -0.25f) * invSize;
                    let uv2 = inUV + vec2f(-0.25f, 0.25f) * invSize;
                    let uv3 = inUV + vec2f(0.25f, 0.25f) * invSize;
                
                    depth.x = textureSampleCompareLevel(mainTex, depthTextureInputSampler, uv0, currentMip);
                    depth.y = textureSampleCompareLevel(mainTex, depthTextureInputSampler, uv1, currentMip);
                    depth.z = textureSampleCompareLevel(mainTex, depthTextureInputSampler, uv2, currentMip);
                    depth.w = textureSampleCompareLevel(mainTex, depthTextureInputSampler, uv3, currentMip);
                
                    let reversed_z = false;
                    if (reversed_z) {
                        return min(min(depth.x, depth.y), min(depth.z, depth.w));
                    }
                    else {
                        return max(max(depth.x, depth.y), max(depth.z, depth.w));
                    }
                }
                
                @fragment
                fn fragmentMain(input: VertexOutput) -> @builtin(frag_depth) f32 {
                    let invSize = 1.0 / (vec2f(textureDimensions(depthTextureInput, u32(currentMip))));
                    let inUV = input.vUv;
                
                    let depth = HZBReduce(depthTextureInput, inUV, invSize);
                    return depth;
                }
            `,
            attributes: {
                position: { location: 0, size: 3, type: "vec3" },
                normal: { location: 1, size: 3, type: "vec3" },
                uv: { location: 2, size: 2, type: "vec2" }
            },
            colorOutputs: [],
            depthOutput: "depth24plus",
            uniforms: {
                depthTextureInputSampler: {group: 0, binding: 0, type: "sampler-compare"},
                depthTextureInput: {group: 0, binding: 1, type: "depthTexture"},
                currentMip: {group: 0, binding: 2, type: "storage"},
            }
        });
        
        this.quadGeometry = Geometry.Plane();
        
        

        let w = this.depthWidth;
        let h = this.depthHeight;
        let level = 0;
        while (w > 1) {
            this.targetTextures.push(GPU.DepthTexture.Create(w, h));
            const passBuffer = GPU.Buffer.Create(4 * 4, GPU.BufferType.STORAGE);
            passBuffer.SetArray(new Float32Array([level]));
            this.passBuffers.push(passBuffer);
            w /= 2;
            h /= 2;
            level++;
        }
        this.inputTexture = GPU.DepthTexture.Create(this.depthWidth, this.depthHeight, 1, "depth24plus", level);
        this.inputTexture.name = "HiZDepth"
        this.inputTexture.SetActiveMip(0);
        this.inputTexture.SetActiveMipCount(level);

        this.shader.SetSampler("depthTextureInputSampler", GPU.TextureSampler.Create({minFilter: "nearest", magFilter: "nearest", mipmapFilter: "nearest", compare: "less"}));
        this.shader.SetTexture("depthTextureInput", this.inputTexture);

        this.currentBuffer = GPU.Buffer.Create(4 * 4, GPU.BufferType.STORAGE);

        console.log("mips", level)

        this.blitShader = await GPU.Shader.Create({
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
            
            @group(0) @binding(0) var textureDepth: texture_depth_2d;
            @group(0) @binding(1) var textureSampler: sampler_comparison;
            @group(0) @binding(2) var<storage, read> mip: f32;
            
            @vertex
            fn vertexMain(input: VertexInput) -> VertexOutput {
                var output: VertexOutput;
                output.position = vec4(input.position, 0.0, 1.0);
                output.vUv = input.uv;
                return output;
            }
            
            @fragment
            fn fragmentMain(input: VertexOutput) -> @builtin(frag_depth) f32 {
                let uv = input.vUv;
                let color = textureSampleCompareLevel(textureDepth, textureSampler, uv, mip);
                return color;
            }
            `,
            colorOutputs: [],
            depthOutput: "depth24plus",
            attributes: {
                position: { location: 0, size: 3, type: "vec3" },
                normal: { location: 1, size: 3, type: "vec3" },
                uv: { location: 2, size: 2, type: "vec2" }
            },
            uniforms: {
                texture: {group: 0, binding: 0, type: "depthTexture"},
                textureSampler: {group: 0, binding: 1, type: "sampler-compare"},
                mip: {group: 0, binding: 2, type: "storage"},
            },
        });

        this.blitShader.SetSampler("textureSampler", GPU.TextureSampler.Create({minFilter: "nearest", magFilter: "nearest", mipmapFilter: "nearest", compare: "less"}));
        this.blitShader.SetValue("mip", 0);

        resources.setResource(GPU.PassParams.depthTexturePyramid, this.inputTexture);
        this.initialized = true;
    }

    public async execute(resources: GPU.ResourcePool, inputDepthTexture: GPU.DepthTexture, outputDepthTexturePyramid: string) {
        if(this.initialized === false) return;

        let currentLevel = 0;
        let currentTarget = this.targetTextures[currentLevel];

        // Copy depth to first mip of inputTexture
        // Need to use BlitDepth because webgpu doesn't support CopyTextureToTexture with unequal sizes for depth textures
        this.blitShader.SetTexture("texture", inputDepthTexture);
        GPU.RendererContext.BeginRenderPass("HiZ - First mip", [], {target: currentTarget, clear: true}, true);
        GPU.RendererContext.DrawGeometry(this.quadGeometry, this.blitShader);
        GPU.RendererContext.EndRenderPass();
        GPU.RendererContext.CopyTextureToTexture(currentTarget, this.inputTexture, 0, currentLevel);
        
        this.shader.SetBuffer("currentMip", this.currentBuffer);
        
        for (let i = 0; i < this.targetTextures.length - 1; i++) {
            let levelBuffer = this.passBuffers[currentLevel];
            currentLevel++;
            currentTarget = this.targetTextures[currentLevel];
            GPU.RendererContext.CopyBufferToBuffer(levelBuffer, this.currentBuffer);
            
            GPU.RendererContext.BeginRenderPass("HiZ - DepthPyramid", [], {target: currentTarget, clear: true}, true);
            GPU.RendererContext.DrawGeometry(this.quadGeometry, this.shader);
            GPU.RendererContext.EndRenderPass();
    
            GPU.RendererContext.CopyTextureToTexture(currentTarget, this.inputTexture, 0, currentLevel);            
        }

        resources.setResource(outputDepthTexturePyramid, this.inputTexture);
    }
}