import { Console, Geometry, GPU } from "@trident/core";

export const BloomSettings = Console.define({
    r_bloom_enabled: { default: false, help: "Enable bloom" },
    r_bloom_threshold: { default: 1.5, help: "Threshold that activates bloom" },
    r_bloom_soft_threshold: { default: 0.5, help: "Threshold multiplier" },
    r_bloom_strength: { default: 0.25, help: "Bloom strength" },
    r_bloom_downsample_distance: { default: 2.0, help: "Downsample spread" },
    r_bloom_upsample_distance: { default: 2.0, help: "Upsample spread" },
    r_bloom_iterations: { default: 4.0, help: "Bloom quality/iterations" },
});

export class PostProcessingBloom extends GPU.RenderPass {
    public name: string = "PostProcessingBloom";
    private shader: GPU.Shader;
    private quadGeometry: Geometry;

    private renderTarget: GPU.RenderTexture;
    private currentPassBuffer: GPU.DynamicBuffer;
    private temporaryTextures: Map<string, GPU.RenderTexture> = new Map();
    private currentPassStride = 0;

    public async init() {
        const code = `
            struct VertexInput {
                @location(0) position : vec3<f32>,
                @location(1) normal : vec3<f32>,
                @location(2) uv : vec2<f32>,
            };

            struct VertexOutput {
                @builtin(position) position : vec4<f32>,
                @location(0) vUv : vec2<f32>,
            };

            @group(0) @binding(0) var textureSampler: sampler;
            @group(0) @binding(1) var mainTex: texture_2d<f32>;
            @group(0) @binding(2) var blendTarget: texture_2d<f32>;

            struct Params {
                thresholdFilter: vec4<f32>,
                downsampleDistance: f32,
                upsampleDistance: f32,
                strength: f32,
                padding: f32,
            };
            @group(1) @binding(0) var<storage, read> params: Params;
            @group(1) @binding(1) var<storage, read> currentPass: f32;

            @vertex fn vertexMain(input: VertexInput) -> VertexOutput {
                var output: VertexOutput;
                output.position = vec4(input.position, 1.0);
                output.vUv = input.uv;
                return output;
            }

            fn rcp(x: f32) -> f32 { return 1.0 / x; }
            fn brightness(c: vec3f) -> f32 { return max(c.r, max(c.g, c.b)); }

            // Kawase 4-tap with Karis luminance weighting (firefly reduction)
            fn kawase(uv: vec2f, distance: f32) -> vec3f {
                let dimensions = vec2<f32>(textureDimensions(mainTex));
                let texelSize = vec2<f32>(1.0) / dimensions;

                let offset = texelSize.xyxy * vec4f(-distance, -distance, distance, distance);

                let s1 = textureSample(mainTex, textureSampler, uv + offset.xy);
                let s2 = textureSample(mainTex, textureSampler, uv + offset.zy);
                let s3 = textureSample(mainTex, textureSampler, uv + offset.xw);
                let s4 = textureSample(mainTex, textureSampler, uv + offset.zw);

                let w1 = rcp(brightness(s1.rgb) + 1.0);
                let w2 = rcp(brightness(s2.rgb) + 1.0);
                let w3 = rcp(brightness(s3.rgb) + 1.0);
                let w4 = rcp(brightness(s4.rgb) + 1.0);

                return ( s1 * w1 + s2 * w2 + s3 * w3 + s4 * w4).rgb * rcp(w1 + w2 + w3 + w4);
            }

            fn prefilter(uv: vec2f) -> vec4f {
                let color = textureSample(mainTex, textureSampler, uv);
                let k = dot(vec3f(0.299, 0.587, 0.114), color.rgb);
                var soft = clamp(k - params.thresholdFilter.y, 0.0, params.thresholdFilter.z);
                soft = soft * soft * params.thresholdFilter.w;
                let factor = max(soft, k - params.thresholdFilter.x) / max(k, 0.00001);
                return color * factor;
            }

            @fragment fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
                let mode = u32(currentPass);
                if (mode == 0u) { return prefilter(input.vUv); }
                if (mode == 1u) { return vec4f(kawase(input.vUv, params.downsampleDistance), 1.0); }
                if (mode == 2u) { return vec4f(kawase(input.vUv, params.upsampleDistance), 1.0); }
                if (mode == 4u) {
                    // Progressive upsample: blur the smaller level and ADD the
                    // matching downsample level back in, preserving mid frequencies.
                    let lower = textureSample(blendTarget, textureSampler, input.vUv);
                    return vec4f(lower.rgb + kawase(input.vUv, params.upsampleDistance), 1.0);
                }
                let blend = textureSample(blendTarget, textureSampler, input.vUv);
                let bloom = kawase(input.vUv, params.upsampleDistance) * params.strength;
                return vec4f(blend.rgb + bloom, blend.a);
            }
        `;

        this.shader = await GPU.Shader.Create({
            code: code,
            colorOutputs: [{ format: "rgba16float" }],
        });
        this.quadGeometry = Geometry.Plane();
        this.renderTarget = GPU.RenderTexture.Create(GPU.Renderer.width, GPU.Renderer.height, 1, "rgba16float");
        this.shader.SetSampler("textureSampler", new GPU.TextureSampler());

        const passCount = 5;

        this.currentPassStride = GPU.Renderer.device.limits.minStorageBufferOffsetAlignment;
        const bufferSize = this.currentPassStride * passCount;
        const passData = new Float32Array(bufferSize / Float32Array.BYTES_PER_ELEMENT);

        for (let pass = 0; pass < passCount; pass++) {
            const floatOffset = (pass * this.currentPassStride) / Float32Array.BYTES_PER_ELEMENT;
            passData[floatOffset] = pass;
        }

        this.currentPassBuffer = new GPU.DynamicBuffer( bufferSize, GPU.BufferType.STORAGE, Float32Array.BYTES_PER_ELEMENT);
        this.currentPassBuffer.SetArray(passData);
        this.shader.SetBuffer("currentPass", this.currentPassBuffer);

        this.initialized = true;
    }

    private getTempTexture(key: string, width: number, height: number): GPU.RenderTexture {
        let texture = this.temporaryTextures.get(key);
        if (!texture) {
            texture = GPU.RenderTexture.Create(width, height, 1, "rgba16float");
            this.temporaryTextures.set(key, texture);
        }
        return texture;
    }

    private setPassParams(passIndex: number) {
        this.currentPassBuffer.dynamicOffset = passIndex * this.currentPassStride;
    }

    private drawTo(target: GPU.RenderTexture, label: string) {
        GPU.RendererContext.BeginRenderPass(label, [{ target, clear: true }], undefined, true);
        GPU.RendererContext.DrawGeometry(this.quadGeometry, this.shader);
        GPU.RendererContext.EndRenderPass();
    }

    public preFrame(_resources: GPU.ResourcePool) {
        if (!this.initialized) return;
        if (!BloomSettings.r_bloom_enabled.value) return;

        const knee = BloomSettings.r_bloom_threshold.value * BloomSettings.r_bloom_soft_threshold.value;

        this.shader.SetArray("params", new Float32Array([
            BloomSettings.r_bloom_downsample_distance.value,
            BloomSettings.r_bloom_threshold.value - knee,
            2 * knee,
            0.25 / (knee + 0.00001),

            BloomSettings.r_bloom_downsample_distance.value,
            BloomSettings.r_bloom_upsample_distance.value,
            BloomSettings.r_bloom_strength.value,
            0,
        ]));
    }

    public async execute(resources: GPU.ResourcePool) {
        if (this.initialized === false) return;
        if (!BloomSettings.r_bloom_enabled.value) return;

        const lightingTexture: GPU.Texture = resources.getResource(GPU.PassParams.LightingPassOutput);
        if (!lightingTexture) return;

        // Bind up front so the prefilter/downsample draws have a valid binding even
        // though they never sample it. The upsample and blend passes rebind it below.
        this.shader.SetTexture("blendTarget", lightingTexture);

        let width = this.renderTarget.width;
        let height = this.renderTarget.height;

        // Prefilter
        this.shader.SetTexture("mainTex", lightingTexture);
        this.setPassParams(0);
        let source = this.getTempTexture("prefilter", width, height);
        this.drawTo(source, "Bloom - Prefilter");

        // Downsample pyramid
        const levels: { texture: GPU.RenderTexture, width: number, height: number }[] = [];
        for (let i = 0; i < BloomSettings.r_bloom_iterations.value; i++) {
            width = Math.floor(width / 2);
            height = Math.floor(height / 2);
            if (width < 2 || height < 2) break;

            this.shader.SetTexture("mainTex", source);
            this.setPassParams(1);
            const target = this.getTempTexture("down-" + i, width, height);
            this.drawTo(target, "Bloom - Down " + i);
            levels.push({ texture: target, width, height });
            source = target;
        }

        // Progressive upsample: up[j] = kawase(up[j+1]) + down[j].
        // Writes to distinct "up-" textures so we never sample and render the same target.
        for (let j = levels.length - 2; j >= 0; j--) {
            const level = levels[j];
            this.shader.SetTexture("mainTex", source);
            this.shader.SetTexture("blendTarget", level.texture);
            this.setPassParams(4);
            const target = this.getTempTexture("up-" + j, level.width, level.height);
            this.drawTo(target, "Bloom - Up " + j);
            source = target;
        }

        // Blend with original
        this.shader.SetTexture("mainTex", source);
        this.shader.SetTexture("blendTarget", lightingTexture);
        this.setPassParams(3);
        this.drawTo(this.renderTarget, "Bloom - Blend");

        GPU.RendererContext.CopyTextureToTextureV3({ texture: this.renderTarget }, { texture: lightingTexture });
    }
}
