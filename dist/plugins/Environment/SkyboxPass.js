import { GPU, Geometry } from '@trident/core';

class SkyboxPass extends GPU.RenderPass {
  name = "SkyboxPass";
  shader;
  quadGeometry;
  skyboxTexture;
  sunValues = new Float32Array(8);
  initialized = false;
  async init() {
    this.shader = await GPU.Shader.Create({
      code: `
                #include "@trident/core/resources/webgpu/shaders/deferred/Common.wgsl";

                struct VertexOutput {
                    @builtin(position) position: vec4<f32>,
                };

                @group(0) @binding(0) var textureSampler: sampler;
                @group(0) @binding(1) var depthTexture: texture_depth_2d;
                @group(0) @binding(2) var skyboxTexture: texture_cube<f32>;
                @group(0) @binding(3) var<storage, read> frameBuffer: FrameBuffer;

                const PI = 3.14159265358979323846;

                struct Sun {
                    direction: vec4<f32>,   // xyz = world dir towards sun, w = intensity
                    color: vec4<f32>,
                };
                @group(0) @binding(4) var<storage, read> sun: Sun;

                // Full-screen triangle (covers screen with 3 verts)
                const p = array<vec2f, 3>(
                    vec2f(-1.0, -1.0),
                    vec2f( 3.0, -1.0),
                    vec2f(-1.0,  3.0)
                );

                @vertex
                fn vertexMain(@builtin(vertex_index) vertexIndex : u32) -> VertexOutput {
                    var output: VertexOutput;
                    output.position = vec4(p[vertexIndex], 0.0, 1.0);
                    return output;
                }

                @fragment
                fn fragmentMain(input: VertexOutput) -> @location(0) vec4<f32> {
                    let pix   = vec2<i32>(floor(input.position.xy));

                    let depth = textureLoad(depthTexture, pix, 0);
                    
                    if (depth <= 0.9999999) {
                        discard;
                    }

                    // Build NDC + view/world rays (same as before)
                    let ndc = vec3<f32>(
                        (input.position.x / frameBuffer.projectionOutputSize.x) * 2.0 - 1.0,
                        (input.position.y / frameBuffer.projectionOutputSize.y) * 2.0 - 1.0,
                        1.0
                    );
                    let viewRay4 = frameBuffer.projectionInverseMatrix * vec4(ndc, 1.0);
                    var viewRay  = normalize(viewRay4.xyz / viewRay4.w);
                    viewRay.y   *= -1.0;
                    var worldRay = normalize((frameBuffer.viewInverseMatrix * vec4(viewRay, 0.0)).xyz);

                    let sky = textureSample(skyboxTexture, textureSampler, worldRay).rgb;

                    const sunAngularRadius = 0.265 * PI / 180.0;
                    let cosTheta = dot(worldRay, sun.direction.xyz);
                    let aa = max(fwidth(cosTheta), 1e-7);
                    let disk = smoothstep(cos(sunAngularRadius) - aa, cos(sunAngularRadius) + aa, cosTheta);

                    let halo = pow(max(cosTheta, 0.0), 2000.0) * 0.3;
                    return vec4f(sky + (disk + halo) * sun.color.rgb * sun.direction.w, 1.0);

                    // return vec4f(sky + disk * sun.color.rgb * sun.direction.w, 1.0);
                }
            `,
      colorOutputs: [{ format: "rgba16float" }]
    });
    this.shader.SetSampler("textureSampler", new GPU.TextureSampler());
    this.quadGeometry = new Geometry();
    this.sunValues.set([0, 0, 0, 1], 0);
    this.sunValues.set([1, 1, 1, 1], 4);
    this.initialized = true;
  }
  SetSkybox(texture) {
    this.skyboxTexture = texture;
  }
  SetSun(direction, intensity) {
    this.sunValues.set([direction.x, direction.y, direction.z, intensity], 0);
    this.sunValues.set([1, 1, 1, 1], 4);
  }
  preFrame(resources) {
    if (!this.initialized) return;
    if (!this.skyboxTexture) return;
    this.drawCommands.length = 0;
    const inputGBufferDepth = resources.getResource(GPU.PassParams.GBufferDepth);
    const inputFrameBuffer = resources.getResource(GPU.PassParams.FrameBuffer);
    if (!inputGBufferDepth) return;
    this.shader.SetTexture("depthTexture", inputGBufferDepth);
    this.shader.SetTexture("skyboxTexture", this.skyboxTexture);
    this.shader.SetBuffer("frameBuffer", inputFrameBuffer);
    this.shader.SetArray("sun", this.sunValues);
    this.drawCommands.push({ geometry: this.quadGeometry, shader: this.shader, instanceCount: 1, firstInstance: 0 });
  }
  execute(resources) {
    if (!this.initialized) return;
    if (this.drawCommands.length === 0) return;
    const LightingPassOutput = resources.getResource(GPU.PassParams.LightingPassOutput);
    if (!LightingPassOutput) return;
    GPU.RendererContext.BeginRenderPass(this.name, [{ target: LightingPassOutput, clear: false }], void 0, true);
    for (const draw of this.drawCommands) {
      GPU.RendererContext.Draw(draw.geometry, draw.shader, 3, draw.instanceCount, draw.firstInstance);
    }
    GPU.RendererContext.EndRenderPass();
    resources.setResource(GPU.PassParams.LightingPassOutput, LightingPassOutput);
  }
  Destroy() {
    this.skyboxTexture = void 0;
    this.initialized = false;
    super.Destroy();
  }
}

export { SkyboxPass };
