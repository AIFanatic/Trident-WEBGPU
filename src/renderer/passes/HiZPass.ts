import { Geometry } from "../../Geometry";
import { Camera } from "../../components/Camera";
import { Color } from "../../math/Color";
import { Meshlet } from "../../plugins/meshlets/Meshlet";
import { Buffer, BufferType } from "../Buffer";
import { RendererContext } from "../RendererContext";
import { Shader } from "../Shader";
import { DepthTexture, RenderTexture } from "../Texture";
import { TextureSampler } from "../TextureSampler";

const vertexSize = Meshlet.max_triangles * 3;

export class HiZPass {
    private shader: Shader;
    private geometry: Geometry;
    public debugDepthTexture: DepthTexture;
    
    private inputTexture: DepthTexture;
    private targetTextures: DepthTexture[] = [];

    public depthWidth = 1024;
    public depthHeight = 1024;
    
    private depthLevels;

    private passBuffers: Buffer[] = [];
    private currentBuffer: Buffer;

    private initialized: boolean = false;

    private renderTarget: RenderTexture;

    constructor() {
        this.Init();
    }

    private async Init() {
        const shaderCode = `
        struct VertexInput {
            @location(0) position : vec2<f32>,
            @location(1) normal : vec3<f32>,
            @location(2) uv : vec2<f32>,
        };
        
        struct VertexOutput {
            @builtin(position) position : vec4<f32>,
            @location(0) vUv : vec2<f32>,
        };
        
        @group(0) @binding(0) var depthTextureInputSampler: sampler;
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

            depth.x = textureSampleLevel(mainTex, depthTextureInputSampler, uv0, u32(currentMip));
            depth.y = textureSampleLevel(mainTex, depthTextureInputSampler, uv1, u32(currentMip));
            depth.z = textureSampleLevel(mainTex, depthTextureInputSampler, uv2, u32(currentMip));
            depth.w = textureSampleLevel(mainTex, depthTextureInputSampler, uv3, u32(currentMip));

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
    `
        this.shader = await Shader.Create({
            code: shaderCode,
            attributes: {
                position: { location: 0, size: 3, type: "vec3" },
                normal: { location: 1, size: 3, type: "vec3" },
                uv: { location: 2, size: 2, type: "vec2" }
            },
            colorOutputs: [],
            depthOutput: "depth24plus",
            uniforms: {
                depthTextureInputSampler: {group: 0, binding: 0, type: "sampler"},
                depthTextureInput: {group: 0, binding: 1, type: "depthTexture"},
                currentMip: {group: 0, binding: 2, type: "storage"},
            }
        });
        
        this.geometry = Geometry.Plane();
        
        

        let w = this.depthWidth;
        let h = this.depthHeight;
        let level = 0;
        while (w > 1) {
            this.targetTextures.push(DepthTexture.Create(w, h));
            const passBuffer = Buffer.Create(4 * 4, BufferType.STORAGE);
            passBuffer.SetArray(new Float32Array([level]));
            this.passBuffers.push(passBuffer);
            w /= 2;
            h /= 2;
            level++;
        }
        this.depthLevels = level;
        this.inputTexture = DepthTexture.Create(this.depthWidth, this.depthHeight, 1, "depth24plus", level);
        this.inputTexture.SetActiveMip(0);
        this.inputTexture.SetActiveMipCount(level);

        const Sampler = TextureSampler.Create({magFilter: "nearest", minFilter: "nearest"});
        this.shader.SetSampler("depthTextureInputSampler", Sampler);
        this.shader.SetTexture("depthTextureInput", this.inputTexture);

        this.debugDepthTexture = this.inputTexture;

        this.currentBuffer = Buffer.Create(4 * 4, BufferType.STORAGE);

        console.log("mips", level)

        this.renderTarget = RenderTexture.Create(this.depthWidth, this.depthHeight);
        this.initialized = true;
    }

    public buildDepthPyramid(drawIndirectShader: Shader, drawIndirectGeometry: Geometry, drawIndirectBuffer: Buffer) {
        if(this.initialized === false) return;

        let currentLevel = 0;
        let currentTarget = this.targetTextures[currentLevel];
        
        // Render scene to first mip
        RendererContext.BeginRenderPass("GPUDriven - DepthPyramid", [{target: this.renderTarget, clear: true}], {target: currentTarget, clear: true}, true);
        RendererContext.DrawIndirect(drawIndirectGeometry, drawIndirectShader, drawIndirectBuffer);
        RendererContext.EndRenderPass();

        RendererContext.CopyTextureToTexture(currentTarget, this.inputTexture, 0, currentLevel);
        // RendererContext.CopyTextureToTexture(depthTexture, this.inputTexture, 0, currentLevel);

        this.shader.SetBuffer("currentMip", this.currentBuffer);
        
        for (let i = 0; i < this.targetTextures.length - 1; i++) {
            let levelBuffer = this.passBuffers[currentLevel];
            currentLevel++;
            currentTarget = this.targetTextures[currentLevel];
            RendererContext.CopyBufferToBuffer(levelBuffer, this.currentBuffer);
            
            RendererContext.BeginRenderPass("GPUDriven - DepthPyramid Build", [], {target: currentTarget, clear: true}, true);
            RendererContext.DrawGeometry(this.geometry, this.shader);
            RendererContext.EndRenderPass();
    
            RendererContext.CopyTextureToTexture(currentTarget, this.inputTexture, 0, currentLevel);            
        }
    }
}