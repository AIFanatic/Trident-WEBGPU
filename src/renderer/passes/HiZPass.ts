import { Geometry, VertexAttribute } from "../../Geometry";
import { Camera } from "../../components/Camera";
import { Color } from "../../math/Color";
import { Buffer, BufferType } from "../Buffer";
import { RendererContext } from "../RendererContext";
import { Shader } from "../Shader";
import { DepthTexture } from "../Texture";
import { TextureSampler } from "../TextureSampler";

const vertexSize = 128 * 3;

export class HiZPass {
    private depthPyramidShader: Shader;

    private shader: Shader;
    private geometry: Geometry;
    public debugDepthTexture: DepthTexture;
    private depthShaderGeometry: Geometry;
    
    private inputTexture: DepthTexture;
    private targetTextures: DepthTexture[] = [];

    private depthWidth = 1024;
    private depthHeight = 1024;
    
    private depthLevels;

    private passBuffers: Buffer[] = [];
    private currentBuffer: Buffer;

    constructor() {
        const code = `
        struct VertexInput {
            @builtin(instance_index) instanceIndex : u32,
            @builtin(vertex_index) vertexIndex : u32,
            @location(0) position : vec3<f32>,
        };

        struct VertexOutput {
            @builtin(position) position : vec4<f32>,
            @location(0) @interpolate(flat) instance : u32,
        };

        @group(0) @binding(0) var<storage, read> viewMatrix: mat4x4<f32>;
        @group(0) @binding(1) var<storage, read> projectionMatrix: mat4x4<f32>;

        @group(0) @binding(2) var<storage, read> vertices: array<vec4<f32>>;

        struct InstanceInfo {
            meshID: u32
        };

        @group(0) @binding(3) var<storage, read> instanceInfo: array<InstanceInfo>;



        struct MeshInfo {
            modelMatrix: mat4x4<f32>,
            position: vec4<f32>,
            scale: vec4<f32>
        };

        struct ObjectInfo {
            meshID: f32,
            meshletID: f32,
            padding: vec2<f32>,
        };

        @group(0) @binding(4) var<storage, read> meshInfo: array<MeshInfo>;
        @group(0) @binding(5) var<storage, read> objectInfo: array<ObjectInfo>;

        @vertex fn vertexMain(input: VertexInput) -> VertexOutput {
            var output: VertexOutput;
            let meshID = instanceInfo[input.instanceIndex].meshID;
            // let mesh = meshInfo[meshID];
            let object = objectInfo[meshID];
            let mesh = meshInfo[u32(object.meshID)];
            let modelMatrix = mesh.modelMatrix;
            
            let vertexID = input.vertexIndex + u32(object.meshletID) * ${vertexSize};
            let position = vertices[vertexID];
            
            let modelViewMatrix = viewMatrix * modelMatrix;
            output.position = projectionMatrix * modelViewMatrix * vec4(position.xyz, 1.0);
            output.instance = meshID;

            return output;
        }
        

        fn rand(co: f32) -> f32 {
            return fract(sin((co + 1.0) * 12.9898) * 43758.5453);
        }

        @fragment fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
            let r = rand(f32(input.instance) + 12.1212);
            let g = rand(f32(input.instance) + 22.1212);
            let b = rand(f32(input.instance) + 32.1212);

            return vec4(r, g, b, 1.0);
        }
        `;

        this.depthPyramidShader = Shader.Create({
            code: code,
            colorOutputs: [],
            depthOutput: "depth24plus",
            attributes: {
                position: { location: 0, size: 3, type: "vec3" },
            },
            uniforms: {
                viewMatrix: {group: 0, binding: 0, type: "storage"},
                projectionMatrix: {group: 0, binding: 1, type: "storage"},
                vertices: {group: 0, binding: 2, type: "storage"},
                instanceInfo: {group: 0, binding: 3, type: "storage"},
                meshInfo: {group: 0, binding: 4, type: "storage"},
                objectInfo: {group: 0, binding: 5, type: "storage"},
            },
        });

        this.depthShaderGeometry = new Geometry();
        this.depthShaderGeometry.attributes.set("position", new VertexAttribute(new Float32Array(vertexSize)));

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

        @group(0) @binding(2) var<storage, read> depthTextureInputDims: vec3f;
        @group(0) @binding(3) var<storage, read> currentMip: f32;
        
        @vertex
        fn vertexMain(input: VertexInput) -> VertexOutput {
            var output: VertexOutput;
            output.position = vec4(input.position, 0.0, 1.0);
            output.vUv = input.uv;
            return output;
        }
        
        // fn min_vec4(v: vec4<f32>) -> f32 {
        //     let min_ab = min(v.x, v.y);
        //     let min_cd = min(v.z, v.w);
        //     return min(min_ab, min_cd);
        // }

        // fn max_vec4(v: vec4<f32>) -> f32 {
        //     let min_ab = min(v.x, v.y);
        //     let min_cd = min(v.z, v.w);
        //     return min(min_ab, min_cd);
        // }

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
            // let invSize = depthTextureInputDims.xy;
            let inUV = input.vUv;

            let depth = HZBReduce(depthTextureInput, inUV, invSize);
            return depth;

            // let depth = textureSampleLevel(depthTextureInput, depthTextureInputSampler, input.vUv, u32(currentMip));
            // return depth;
        }
    `
        this.shader = Shader.Create({
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
                depthTextureInputDims: {group: 0, binding: 2, type: "storage"},
                currentMip: {group: 0, binding: 3, type: "storage"},
            }
        });
        
        this.geometry = Geometry.Plane();
        
        

        let w = this.depthWidth;
        let h = this.depthHeight;
        let level = 0;
        while (w >= 1) {
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
    }

    public buildDepthPyramid(vertices: Buffer, instanceInfo: Buffer, meshInfo: Buffer, objectInfo: Buffer, drawIndirectBuffer: Buffer) {
        const mainCamera = Camera.mainCamera;

        
        // Render scene to first mip
        this.depthPyramidShader.SetMatrix4("projectionMatrix", mainCamera.projectionMatrix);
        this.depthPyramidShader.SetMatrix4("viewMatrix", mainCamera.viewMatrix);
        this.depthPyramidShader.SetBuffer("vertices", vertices);
        this.depthPyramidShader.SetBuffer("instanceInfo", instanceInfo);
        this.depthPyramidShader.SetBuffer("meshInfo", meshInfo);
        this.depthPyramidShader.SetBuffer("objectInfo", objectInfo);

        let currentLevel = 0;
        let currentTarget = this.targetTextures[currentLevel];
        
        RendererContext.BeginRenderPass("GPUDriven - DepthPyramid", [], {target: currentTarget, clear: true}, true);
        RendererContext.DrawIndirect(this.depthShaderGeometry, this.depthPyramidShader, drawIndirectBuffer);
        RendererContext.EndRenderPass();

        RendererContext.CopyTextureToTexture(currentTarget, this.inputTexture, 0, currentLevel);

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