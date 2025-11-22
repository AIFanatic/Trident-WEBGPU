import { GPU, Geometry, Components } from '@trident/core';

class PostProcessingFog extends GPU.RenderPass {
  name = "PostProcessingFog";
  shader;
  quadGeometry;
  renderTarget;
  constructor() {
    super();
  }
  async init() {
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
			@group(0) @binding(2) var depthTexture: texture_depth_2d;

			struct Camera {
				near: f32,
				far: f32,
				pad: vec2<f32>
			}
			@group(0) @binding(3) var<storage, read> camera: Camera;

			@vertex fn vertexMain(input: VertexInput) -> VertexOutput {
				var output: VertexOutput;
				output.position = vec4(input.position, 0.0, 1.0);
				output.vUv = input.uv;
				return output;
			}

			fn LinearizeDepthFromNDC(ndcDepth: f32) -> f32 {
				let n = camera.near; // camera z near
				let f = camera.far; // camera z far
				let z = ndcDepth * 2.0 - 1.0;
				return (2.0 * n * f) / (f + n - z * (f - n));
			}

			@fragment fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
				let dims = vec2<f32>(textureDimensions(depthTexture));
				let d = textureLoad(depthTexture, vec2<i32>(input.vUv * dims), 0);
				let linearDepth = LinearizeDepthFromNDC(d);
				
				let c = textureSample(texture, textureSampler, input.vUv);

				let fogColor = vec3(1.0);
				let screenColor = c.rgb;
				let color = mix(screenColor, fogColor, linearDepth / 1000);
				return vec4(vec3(color), 1.0);
			}
		`;
    this.shader = await GPU.Shader.Create({
      code,
      colorOutputs: [{ format: GPU.Renderer.SwapChainFormat }],
      attributes: {
        position: { location: 0, size: 3, type: "vec3" },
        uv: { location: 1, size: 2, type: "vec2" }
      },
      uniforms: {
        textureSampler: { group: 0, binding: 0, type: "sampler" },
        texture: { group: 0, binding: 1, type: "texture" },
        depthTexture: { group: 0, binding: 2, type: "depthTexture" },
        camera: { group: 0, binding: 3, type: "storage" }
      }
    });
    this.quadGeometry = Geometry.Plane();
    this.renderTarget = GPU.RenderTexture.Create(GPU.Renderer.width, GPU.Renderer.height);
    this.shader.SetSampler("textureSampler", GPU.TextureSampler.Create());
    this.initialized = true;
  }
  async preFrame(resources) {
    this.shader.SetArray("camera", new Float32Array([Components.Camera.mainCamera.near, Components.Camera.mainCamera.far, 0, 0]));
  }
  async execute(resources) {
    if (this.initialized === false) return;
    const LightingPassOutputTexture = resources.getResource(GPU.PassParams.LightingPassOutput);
    const GBufferDepth = resources.getResource(GPU.PassParams.GBufferDepth);
    if (!LightingPassOutputTexture) return;
    this.shader.SetTexture("texture", LightingPassOutputTexture);
    this.shader.SetTexture("depthTexture", GBufferDepth);
    GPU.RendererContext.BeginRenderPass(this.name, [{ clear: false, target: this.renderTarget }], void 0, true);
    GPU.RendererContext.DrawGeometry(this.quadGeometry, this.shader);
    GPU.RendererContext.EndRenderPass();
    GPU.Texture.Blit(this.renderTarget, LightingPassOutputTexture, this.renderTarget.width, this.renderTarget.height);
  }
}

export { PostProcessingFog };
