import {
    Geometry,
    GPU
} from "@trident/core";

import { Blit } from "@trident/plugins/Blit";

export class BilateralFilter extends GPU.RenderPass {
    private shader: GPU.Shader;
    private geometry: Geometry;

    private inputTexture: GPU.Texture;
    private renderTarget: GPU.RenderTexture;

    private blurDir: GPU.Buffer;
    private blurDirHorizontal: GPU.Buffer;
    private blurDirVertical: GPU.Buffer;

    private _filterSize: number = 12;
    private _blurDepthThreshold: number = 0.05;
    private _blurNormalThreshold: number = 0.25;

    public get filterSize(): number { return this._filterSize; }
    public get blurDepthThreshold(): number { return this._blurDepthThreshold; }
    public get blurNormalThreshold(): number { return this._blurNormalThreshold; }

    public set filterSize(value: number) { this.shader.SetValue("filterSize", value); }
    public set blurDepthThreshold(value: number) { this.shader.SetValue("blurDepthThreshold", value); }
    public set blurNormalThreshold(value: number) { this.shader.SetValue("blurNormalThreshold", value); }

    public async init(resources: GPU.ResourcePool) {
        this.shader = await GPU.Shader.Create({
            code: `
            @group(0) @binding(0) var tex: texture_2d<f32>;
            @group(0) @binding(1) var texSampler: sampler;

            @group(0) @binding(2) var depthTex: texture_depth_2d;
            @group(0) @binding(3) var depthSampler: sampler_comparison;

            @group(0) @binding(4) var normalTex: texture_2d<f32>;
            @group(0) @binding(5) var normalSampler: sampler;

            @group(0) @binding(6) var<storage, read> blurDir: vec4<f32>;

            @group(0) @binding(7) var<storage, read> filterSize: f32;
            @group(0) @binding(8) var<storage, read> blurDepthThreshold: f32;
            @group(0) @binding(9) var<storage, read> blurNormalThreshold: f32;

            struct VertexInput {
                @builtin(instance_index) instanceIdx : u32, 
                @location(0) position : vec3<f32>,
                @location(1) normal : vec3<f32>,
                @location(2) uv : vec2<f32>,
            };
            
            struct VertexOutput {
                @builtin(position) position : vec4<f32>,
                @location(0) uv : vec2<f32>,
            };

            @vertex
            fn vertexMain(input: VertexInput) -> VertexOutput {
                var output : VertexOutput;
                output.position = vec4(input.position, 1.0);
                output.uv = input.uv;
                return output;
            }

            @fragment
            fn fragmentMain(input: VertexOutput) -> @location(0) vec4<f32> {
                var color: vec3f = textureSampleLevel(tex, texSampler, input.uv, 0.).rgb;
                // var depth: f32 = textureSampleCompare(depthTex, depthSampler, input.uv, 0);

                let texSize = textureDimensions(depthTex);
                let coords = vec2<i32>(input.uv * vec2<f32>(texSize));
                let depth: f32 = textureLoad(depthTex, coords, 0);
            
                if (depth >= 1e6 || depth <= 0.) {
                    return vec4f(color, 1.);
                }
            
                var normal: vec3f = textureSampleLevel(normalTex, normalSampler, input.uv, 0.).rgb;
            
                let filterSizeI32: i32 = i32(filterSize);
                var sigma: f32 =  f32(filterSize);
                var two_sigma2: f32 = 2.0 * sigma * sigma;
            
                var sigmaDepth: f32 = blurDepthThreshold;
                var two_sigmaDepth2: f32 = 2.0 * sigmaDepth * sigmaDepth;
            
                var sigmaNormal: f32 = blurNormalThreshold;
                var two_sigmaNormal2: f32 = 2.0 * sigmaNormal * sigmaNormal;
            
                var sum: vec3f =  vec3f(0.);
                var wsum: f32 = 0.;

                // let sigma_space = 2.0;
            
                for (var x: i32 = -filterSizeI32; x <= filterSizeI32; x++) {
                    var coords = vec2f(f32(x));
                    var sampleColor: vec3f = textureSampleLevel(tex, texSampler, input.uv + coords * blurDir.xy, 0.).rgb;
                    let sampleCoords = vec2<i32>(input.uv * vec2<f32>(texSize)) + vec2<i32>(x, 0);
                    let sampleDepth: f32 = textureLoad(depthTex, sampleCoords, 0);
                    // // Ground depth:
                    // let ref_value = input.position.z / input.position.w;
                    // let depth_raw: f32 = textureSampleCompare(DEPTH_TEXTURE, depth_texture_sampler, input.SCREEN_UV, ref_value);
                    var sampleNormal: vec3f = textureSampleLevel(normalTex, normalSampler, input.uv + coords * blurDir.xy, 0.).rgb;
            
                    var r: f32 = dot(coords, coords);
                    var w: f32 = exp(-r / two_sigma2);
            
                    var depthDelta: f32 = abs(sampleDepth - depth);
                    var wd: f32 = step(depthDelta, blurDepthThreshold);
            
                    var normalDelta: vec3f = abs(sampleNormal - normal);
                    var wn: f32 = step(normalDelta.x + normalDelta.y + normalDelta.z, blurNormalThreshold);
            
                    sum += sampleColor * w * wd * wn;
                    wsum += w * wd * wn;
                }
                
                return vec4f(sum / wsum, 1.);
            }
            `,
            colorOutputs: [
                { format: "rgba16float" },
            ],
            attributes: {
                position: { location: 0, size: 3, type: "vec3" },
                normal: { location: 1, size: 3, type: "vec3" },
                uv: { location: 2, size: 2, type: "vec2" }
            },
            uniforms: {
                tex: { group: 0, binding: 0, type: "texture" },
                texSampler: { group: 0, binding: 1, type: "sampler" },
                
                depthTex: { group: 0, binding: 2, type: "depthTexture" },
                depthSampler: { group: 0, binding: 3, type: "sampler-compare" },

                normalTex: { group: 0, binding: 4, type: "texture" },
                normalSampler: { group: 0, binding: 5, type: "sampler" },

                blurDir: { group: 0, binding: 6, type: "storage" },
                
                filterSize: { group: 0, binding: 7, type: "storage" },
                blurDepthThreshold: { group: 0, binding: 8, type: "storage" },
                blurNormalThreshold: { group: 0, binding: 9, type: "storage" },
            },
        });

        this.shader.SetSampler("texSampler", GPU.TextureSampler.Create());
        this.shader.SetSampler("depthSampler", GPU.TextureSampler.Create({minFilter: "nearest", magFilter: "nearest", mipmapFilter: "nearest", compare: "less"}));
        this.shader.SetSampler("normalSampler", GPU.TextureSampler.Create());

        this.blurDir = GPU.Buffer.Create(4 * 4, GPU.BufferType.STORAGE);
        this.blurDirHorizontal = GPU.Buffer.Create(4 * 4, GPU.BufferType.STORAGE);
        this.blurDirVertical = GPU.Buffer.Create(4 * 4, GPU.BufferType.STORAGE);

        this.shader.SetBuffer("blurDir", this.blurDir);

        this.shader.SetValue("filterSize", this.filterSize);
        this.shader.SetValue("blurDepthThreshold", this.blurDepthThreshold);
        this.shader.SetValue("blurNormalThreshold", this.blurNormalThreshold);

        this.geometry = Geometry.Plane();
        this.initialized = true;
    }

    private rendererWidth: number;
    private rendererHeight: number;
    public Process(texture: GPU.Texture, depthTex: GPU.DepthTexture, normalTex: GPU.Texture): GPU.RenderTexture {
        if (this.initialized === false) {
            throw Error("Not initialized")
        };

        const rendererWidth = Math.max(GPU.Renderer.width, 1);
        const rendererHeight = Math.max(GPU.Renderer.height, 1);

        if (!this.renderTarget || this.rendererWidth !== rendererWidth || this.rendererHeight !== rendererHeight) {
            this.inputTexture = GPU.Texture.Create(texture.width, texture.height, texture.depth, "rgba16float");
            this.renderTarget = GPU.RenderTexture.Create(texture.width, texture.height, texture.depth, "rgba16float");

            this.shader.SetTexture("tex", this.inputTexture);

            this.blurDirHorizontal.SetArray(new Float32Array([1 / rendererWidth, 0, 0, 0]));
            this.blurDirVertical.SetArray(new Float32Array([0, 1 / rendererHeight, 0, 0]));

            this.rendererWidth = rendererWidth;
            this.rendererHeight = rendererHeight;
        }

        this.shader.SetTexture("depthTex", depthTex);
        this.shader.SetTexture("normalTex", normalTex);

        GPU.RendererContext.CopyTextureToTextureV3({texture: texture}, {texture: this.inputTexture});

        GPU.RendererContext.CopyBufferToBuffer(this.blurDirHorizontal, this.blurDir);
        GPU.RendererContext.BeginRenderPass("BilateralFilter - H", [{target: this.renderTarget, clear: true}], undefined, true);
        GPU.RendererContext.DrawGeometry(this.geometry, this.shader);
        GPU.RendererContext.EndRenderPass();

        GPU.RendererContext.CopyTextureToTextureV3({texture: this.renderTarget}, {texture: this.inputTexture});

        GPU.RendererContext.CopyBufferToBuffer(this.blurDirVertical, this.blurDir);
        GPU.RendererContext.BeginRenderPass("BilateralFilter - V", [{target: this.renderTarget, clear: false}], undefined, true);
        GPU.RendererContext.DrawGeometry(this.geometry, this.shader);
        GPU.RendererContext.EndRenderPass();

        return this.renderTarget;
    }
}