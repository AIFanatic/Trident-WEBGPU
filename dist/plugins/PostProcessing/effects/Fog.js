import { GPU, Mathf, Geometry, Components } from '@trident/core';

class PostProcessingFog extends GPU.RenderPass {
  params = {
    fogColor: new Mathf.Color(1, 1, 1, 1),
    // height fog controls
    fogBaseHeight: 0,
    // world Y where fog is densest
    fogHeightFalloff: 0.05,
    // how fast it thins with height (bigger = tighter band)
    fogDensity: 0.02,
    // overall density
    fogMaxDistance: 2e3
  };
  name = "PostProcessingFog";
  shader;
  quadGeometry;
  renderTarget;
  constructor() {
    super();
  }
  async init() {
    const code = `
			#include "@trident/core/resources/webgpu/shaders/deferred/Common.wgsl";

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
			@group(0) @binding(1) var texture: texture_2d<f32>;
			@group(0) @binding(2) var depthTexture: texture_depth_2d;

			@group(0) @binding(5) var skyboxTexture: texture_cube<f32>;

			struct Params {
				fogColor: vec4<f32>,
				fogBaseHeight: f32,
				fogHeightFalloff: f32,
				fogDensity: f32,
				fogMaxDistance: f32
			};
			@group(1) @binding(0) var<storage, read> params: Params;

			struct Camera {
				near: f32,
				far: f32,
				pad: vec2<f32>
			}
			@group(0) @binding(3) var<storage, read> camera: Camera;

			@group(0) @binding(4) var<storage, read> view: FrameBuffer;


			@vertex fn vertexMain(input: VertexInput) -> VertexOutput {
				var output: VertexOutput;
				output.position = vec4(input.position, 1.0);
				output.vUv = input.uv;
				return output;
			}

			fn reconstructWorldPosFromZ(
				coords: vec2<f32>,
				size: vec2<f32>,
				depth: f32,
				projInverse: mat4x4<f32>,
				viewInverse: mat4x4<f32>
			) -> vec4<f32> {
				let uv = coords.xy / size;
				let x = uv.x * 2.0 - 1.0;
				let y = (1.0 - uv.y) * 2.0 - 1.0;
				let projectedPos = vec4(x, y, depth, 1.0);
				var worldPosition = projInverse * projectedPos;
				worldPosition = vec4(worldPosition.xyz / worldPosition.w, 1.0);
				worldPosition = viewInverse * worldPosition;
				return worldPosition;
			}

			fn HeightFogAmount(cameraPos: vec3<f32>, worldPos: vec3<f32>) -> f32 {
				let dir = worldPos - cameraPos;
				let dist = length(dir);
				if (dist <= 1e-4) { return 0.0; }

				let y0 = cameraPos.y;
				let y1 = worldPos.y;

				// parameters
				let base = params.fogBaseHeight;
				let falloff = max(params.fogHeightFalloff, 1e-5);
				let density = max(params.fogDensity, 0.0);

				// integral of exp(-falloff*(y-base)) along the ray segment
				// handles when y0 ~= y1 (flat ray) gracefully
				let dy = y1 - y0;

				// average exponential term along the segment (closed form)
				// I = density * dist * exp(-(y0-base)*falloff) * (1 - exp(-dy*falloff)) / (dy*falloff)
				let exp0 = exp(-(y0 - base) * falloff);

				var heightIntegral: f32;
				if (abs(dy) < 1e-4) {
					heightIntegral = density * dist * exp0;
				} else {
					heightIntegral = density * dist * exp0 * (1.0 - exp(-dy * falloff)) / (dy * falloff);
				}

				// optional distance cap to help art-direct (and avoid over-fogging very far sky pixels)
				let distFactor = clamp(dist / max(params.fogMaxDistance, 1.0), 0.0, 1.0);

				let fog = 1.0 - exp(-heightIntegral);
				return clamp(fog * distFactor, 0.0, 1.0);
			}

			@fragment
			fn fragmentMain(input: VertexOutput) -> @location(0) vec4<f32> {
				let dims = vec2<f32>(textureDimensions(depthTexture));
				let d = textureLoad(depthTexture, vec2<i32>(input.vUv * dims), 0);

				let sceneColor = textureSample(texture, textureSampler, input.vUv);

				// reconstruct world position from depth
				let worldPos = reconstructWorldPosFromZ(
					input.position.xy,
					view.projectionOutputSize.xy,
					d,
					view.projectionInverseMatrix,
					view.viewInverseMatrix
				).xyz;

				// camera world pos is in view.viewPosition (looks like vec4)
				let camPos = view.viewPosition.xyz;

				let fogFactor = HeightFogAmount(camPos, worldPos);

				let color = mix(sceneColor.rgb, params.fogColor.rgb, fogFactor);
				return vec4<f32>(color, sceneColor.a);
			}
		`;
    this.shader = await GPU.Shader.Create({
      code,
      colorOutputs: [{ format: "rgba16float" }]
    });
    this.quadGeometry = Geometry.Plane();
    this.renderTarget = GPU.RenderTexture.Create(GPU.Renderer.width, GPU.Renderer.height, 1, "rgba16float");
    this.shader.SetSampler("textureSampler", GPU.TextureSampler.Create());
    this.initialized = true;
  }
  async preFrame(resources) {
    const FrameBuffer = resources.getResource(GPU.PassParams.FrameBuffer);
    this.shader.SetBuffer("view", FrameBuffer);
    this.shader.SetArray("camera", new Float32Array([Components.Camera.mainCamera.near, Components.Camera.mainCamera.far, 0, 0]));
    this.shader.SetArray("params", new Float32Array([...this.params.fogColor.elements, this.params.fogBaseHeight, this.params.fogHeightFalloff, this.params.fogDensity, this.params.fogMaxDistance]));
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
    GPU.RendererContext.CopyTextureToTextureV3({ texture: this.renderTarget }, { texture: LightingPassOutputTexture });
  }
}

export { PostProcessingFog };
