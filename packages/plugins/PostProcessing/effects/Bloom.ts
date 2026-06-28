import { Geometry, GPU } from "@trident/core";

export class PostProcessingBloom extends GPU.RenderPass {
    public params = {
        threshold: 0.4,
        softThreshold: 0.25,
        strength: 1.0,
        downsampleDistance: 5.0,
        upsampleDistance: 0.5,
        iterations: 4,
    }
    public name: string = "PostProcessingBloom";
    private shader: GPU.Shader;
    private quadGeometry: Geometry;

    private renderTarget: GPU.RenderTexture;
    private currentPassBuffer: GPU.DynamicBuffer;
    private scratchTextures: GPU.RenderTexture[] = [];
    private temporaryTextures: Map<string, GPU.RenderTexture> = new Map();

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
                texelSize: vec2<f32>,
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
                let offset = params.texelSize.xyxy * vec4f(-distance, -distance, distance, distance);
                let s1 = textureSample(mainTex, textureSampler, uv + offset.xy);
                let s2 = textureSample(mainTex, textureSampler, uv + offset.zy);
                let s3 = textureSample(mainTex, textureSampler, uv + offset.xw);
                let s4 = textureSample(mainTex, textureSampler, uv + offset.zw);
                let w1 = rcp(brightness(s1.rgb) + 1.0);
                let w2 = rcp(brightness(s2.rgb) + 1.0);
                let w3 = rcp(brightness(s3.rgb) + 1.0);
                let w4 = rcp(brightness(s4.rgb) + 1.0);
                return (s1 * w1 + s2 * w2 + s3 * w3 + s4 * w4).rgb * rcp(w1 + w2 + w3 + w4);
            }

            fn prefilter(uv: vec2f) -> vec4f {
                let color = textureSample(mainTex, textureSampler, uv);
                let k = dot(vec3f(0.299, 0.587, 0.114), color.rgb);
                var soft = clamp(k - params.thresholdFilter.y, 0.0, params.thresholdFilter.z);   // ← was filter.y / filter.z
                soft = soft * soft * params.thresholdFilter.w;                                    // ← was filter.w
                let factor = max(soft, k - params.thresholdFilter.x) / max(k, 0.00001);           // ← was filter.x
                return color * factor;
            }

            @fragment fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
                  let mode = u32(currentPass);
                if (mode == 0u) { return prefilter(input.vUv); }
                if (mode == 1u) { return vec4f(kawase(input.vUv, params.downsampleDistance), 1.0); }
                if (mode == 2u) { return vec4f(kawase(input.vUv, params.upsampleDistance), 1.0); }
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
        const minUniformBufferOffsetAlignment = 256;
        this.currentPassBuffer = new GPU.DynamicBuffer(minUniformBufferOffsetAlignment * 4 * 4, GPU.BufferType.STORAGE, 1 * 4);
        this.currentPassBuffer.SetArray(
            new Float32Array(
                new Array().concat(
                    ...new Float32Array(minUniformBufferOffsetAlignment).fill(0),
                    ...new Float32Array(minUniformBufferOffsetAlignment).fill(1),
                    ...new Float32Array(minUniformBufferOffsetAlignment).fill(2),
                    ...new Float32Array(minUniformBufferOffsetAlignment).fill(3),
                )
            )
        );
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

    private setPassParams(passIndex: number, sourceWidth: number, sourceHeight: number) {
        const minUniformBufferOffsetAlignment = 256;
        this.currentPassBuffer.dynamicOffset = passIndex * 4 * minUniformBufferOffsetAlignment;

        const knee = this.params.threshold * this.params.softThreshold;
        this.shader.SetArray("params", new Float32Array([
            this.params.threshold, this.params.threshold - knee, 2 * knee, 0.25 / (knee + 0.00001),
            this.params.downsampleDistance,
            this.params.upsampleDistance,
            this.params.strength,
            0,
            1 / sourceWidth, 1 / sourceHeight, 0, 0
        ]));
    }

    private drawTo(target: GPU.RenderTexture, label: string) {
        GPU.RendererContext.BeginRenderPass(label, [{ target, clear: true }], undefined, true);
        GPU.RendererContext.DrawGeometry(this.quadGeometry, this.shader);
        GPU.RendererContext.EndRenderPass();
    }

    public async execute(resources: GPU.ResourcePool) {
        if (this.initialized === false) return;

        const lightingTexture: GPU.Texture = resources.getResource(GPU.PassParams.LightingPassOutput);
        if (!lightingTexture) return;

        this.shader.SetTexture("blendTarget", lightingTexture);

        const baseWidth = lightingTexture.width;
        const baseHeight = lightingTexture.height;

        let width = this.renderTarget.width;
        let height = this.renderTarget.height;

        // Prefilter
        this.shader.SetTexture("mainTex", lightingTexture);
        this.setPassParams(0, baseWidth, baseHeight);
        let source = this.scratchTextures[0] = this.getTempTexture("prefilter", width, height);
        this.drawTo(source, "Bloom - Prefilter");

        // Downsample pyramid
        let i = 0;
        for (i = 0; i < this.params.iterations; i++) {
            width = Math.floor(width / 2);
            height = Math.floor(height / 2);
            if (width < 2 || height < 2) break;

            this.shader.SetTexture("mainTex", source);
            this.setPassParams(1, baseWidth, baseHeight);
            const target = this.getTempTexture("down-" + i, width, height);
            this.scratchTextures[i + 1] = target;
            this.drawTo(target, "Bloom - Down " + i);
            source = target;
        }

        // Upsample pyramid
        for (let j = i - 1; j > 0; j--) {
            this.shader.SetTexture("mainTex", source);
            this.setPassParams(2, baseWidth, baseHeight);
            const target = this.scratchTextures[j];
            this.drawTo(target, "Bloom - Up " + j);
            source = target;
        }

        // Blend with original
        this.shader.SetTexture("mainTex", source);
        this.setPassParams(3, baseWidth, baseHeight);
        this.drawTo(this.renderTarget, "Bloom - Blend");

        GPU.RendererContext.CopyTextureToTextureV3({ texture: this.renderTarget }, { texture: lightingTexture });
    }
}