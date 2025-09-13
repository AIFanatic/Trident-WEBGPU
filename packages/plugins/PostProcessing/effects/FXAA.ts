import {
	Geometry,
	Mathf,
	GPU
} from "@trident/core";

export class PostProcessingFXAA extends GPU.RenderPass {
	public name: string = "PostProcessingFXAA";
	private shader: GPU.Shader;
	private quadGeometry: Geometry;

	private renderTarget: GPU.RenderTexture;

	constructor() {
		super({
			inputs: [
				GPU.PassParams.LightingPassOutput,
			]
		});
	}

	public async init() {
		const code = `
			struct VertexInput {
				@location(0) position : vec2<f32>,
				@location(1) uv : vec2<f32>,
			};

			struct VertexOutput {
				@builtin(position) position : vec4<f32>,
				@location(0) vUv : vec2<f32>,
			};

			@group(0) @binding(0) var textureSampler: sampler;
			@group(0) @binding(1) var texture: texture_2d<f32>;
			@group(0) @binding(2) var<storage, read> resolutionInv: vec2<f32>;

			@vertex fn vertexMain(input: VertexInput) -> VertexOutput {
				var output: VertexOutput;
				output.position = vec4(input.position, 0.0, 1.0);
				output.vUv = input.uv;
				return output;
			}

			const FXAA_REDUCE_MIN: f32 = (1.0 / 128.0);
			const FXAA_REDUCE_MUL: f32 = (1.0 / 8.0);
			const FXAA_SPAN_MAX: f32 = 8.0;

			// optimized version for mobile, where dependent
			// texture reads can be a bottleneck
			fn fxaa(tex: texture_2d<f32>, fragCoord: vec2f, resolution: vec2f, v_rgbNW: vec2f, v_rgbNE: vec2f, v_rgbSW: vec2f, v_rgbSE: vec2f, v_rgbM: vec2f) -> vec4f {
				var color: vec4f = vec4f(0);
				let inverseVP: vec2f = vec2(1.0 / resolution.x, 1.0 / resolution.y);
				let rgbNW: vec3f     = textureSample(tex, textureSampler, v_rgbNW).xyz;
				let rgbNE: vec3f     = textureSample(tex, textureSampler, v_rgbNE).xyz;
				let rgbSW: vec3f     = textureSample(tex, textureSampler, v_rgbSW).xyz;
				let rgbSE: vec3f     = textureSample(tex, textureSampler, v_rgbSE).xyz;
				let texColor: vec4f  = textureSample(tex, textureSampler, v_rgbM);
				let rgbM: vec3f      = texColor.xyz;
				let luma: vec3f      = vec3(0.299, 0.587, 0.114);
				let lumaNW: f32    = dot(rgbNW, luma);
				let lumaNE: f32    = dot(rgbNE, luma);
				let lumaSW: f32    = dot(rgbSW, luma);
				let lumaSE: f32    = dot(rgbSE, luma);
				let lumaM: f32     = dot(rgbM, luma);
				let lumaMin: f32   = min(lumaM, min(min(lumaNW, lumaNE), min(lumaSW, lumaSE)));
				let lumaMax: f32   = max(lumaM, max(max(lumaNW, lumaNE), max(lumaSW, lumaSE)));

				var dir: vec2f = vec2f(0);
				dir.x = -((lumaNW + lumaNE) - (lumaSW + lumaSE));
				dir.y = ((lumaNW + lumaSW) - (lumaNE + lumaSE));

				let dirReduce: f32 = max((lumaNW + lumaNE + lumaSW + lumaSE) * (0.25 * FXAA_REDUCE_MUL), FXAA_REDUCE_MIN);

				let rcpDirMin: f32 = 1.0 / (min(abs(dir.x), abs(dir.y)) + dirReduce);
				dir = min(vec2(FXAA_SPAN_MAX, FXAA_SPAN_MAX), max(vec2(-FXAA_SPAN_MAX, -FXAA_SPAN_MAX), dir * rcpDirMin)) * inverseVP;

				let rgbA: vec3f = 0.5 * (textureSample(tex, textureSampler, fragCoord * inverseVP + dir * (1.0 / 3.0 - 0.5)).xyz + textureSample(tex, textureSampler, fragCoord * inverseVP + dir * (2.0 / 3.0 - 0.5)).xyz);
				let rgbB: vec3f = rgbA * 0.5 + 0.25 * (textureSample(tex, textureSampler, fragCoord * inverseVP + dir * -0.5).xyz + textureSample(tex, textureSampler, fragCoord * inverseVP + dir * 0.5).xyz);

				let lumaB = dot(rgbB, luma);
				if((lumaB < lumaMin) || (lumaB > lumaMax)) {
					color = vec4(rgbA, texColor.a);
				}
				else {
					color = vec4(rgbB, texColor.a);
				}
				return color;
			}

			@fragment fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
				let resolution: vec2f = vec2f(textureDimensions(texture, 0));
				let fragCoord: vec2f  = input.vUv * resolution;

				let inverseVP: vec2f = 1.0 / resolution.xy;
				let v_rgbNW: vec2f   = (fragCoord + vec2(-1.0, -1.0)) * inverseVP;
				let v_rgbNE: vec2f   = (fragCoord + vec2(1.0, -1.0)) * inverseVP;
				let v_rgbSW: vec2f   = (fragCoord + vec2(-1.0, 1.0)) * inverseVP;
				let v_rgbSE: vec2f   = (fragCoord + vec2(1.0, 1.0)) * inverseVP;
				let v_rgbM: vec2f    = vec2(fragCoord * inverseVP);

				return fxaa(texture, fragCoord, resolution, v_rgbNW, v_rgbNE, v_rgbSW, v_rgbSE, v_rgbM);
			}
		`;

		this.shader = await GPU.Shader.Create({
			code: code,
			colorOutputs: [{ format: GPU.Renderer.SwapChainFormat }],
			attributes: {
				position: { location: 0, size: 3, type: "vec3" },
				uv: { location: 1, size: 2, type: "vec2" }
			},
			uniforms: {
				textureSampler: { group: 0, binding: 0, type: "sampler" },
				texture: { group: 0, binding: 1, type: "texture" },
				resolutionInv: { group: 0, binding: 2, type: "uniform" },
			}
		});
		this.quadGeometry = Geometry.Plane();

		this.renderTarget = GPU.RenderTexture.Create(GPU.Renderer.width, GPU.Renderer.height);

		this.shader.SetSampler("textureSampler", GPU.TextureSampler.Create());
		this.shader.SetVector2("resolutionInv", new Mathf.Vector2(1 / GPU.Renderer.width, 1 / GPU.Renderer.height));


		this.initialized = true;
	}

	public execute(resources: GPU.ResourcePool) {
		if (this.initialized === false) return;

		const LightingPassOutputTexture: GPU.Texture = resources.getResource(GPU.PassParams.LightingPassOutput);
		if (!LightingPassOutputTexture) return;

		this.shader.SetTexture("texture", LightingPassOutputTexture);

		GPU.RendererContext.BeginRenderPass(this.name, [{ clear: false, target: this.renderTarget }], undefined, true);
		GPU.RendererContext.DrawGeometry(this.quadGeometry, this.shader);
		GPU.RendererContext.EndRenderPass();

		GPU.Texture.Blit(this.renderTarget, LightingPassOutputTexture, this.renderTarget.width, this.renderTarget.height);
	}
}