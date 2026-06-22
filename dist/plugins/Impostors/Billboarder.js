import { Components, GPU, GameObject, Geometry, Mathf } from '@trident/core';
import { MeshBaker } from './MeshBaker.js';

class Billboarder extends Components.Mesh {
  albedoTexture;
  normalTexture;
  ermoTexture;
  originalBounds;
  async Create(meshes, resolution = 1024) {
    if (meshes.length === 0) throw Error("Billboarder.Create needs at least one mesh");
    await MeshBaker.awaitShaders(meshes);
    this.originalBounds = MeshBaker.computeBounds(meshes);
    const { radius: R, center } = this.originalBounds;
    const fmt = GPU.RenderingPipeline.GBufferFormat;
    this.albedoTexture = GPU.RenderTexture.Create(resolution, resolution, 1, fmt);
    this.normalTexture = GPU.RenderTexture.Create(resolution, resolution, 1, fmt);
    this.ermoTexture = GPU.RenderTexture.Create(resolution, resolution, 1, fmt);
    const depth = GPU.DepthTexture.Create(resolution, resolution);
    const cameraDist = R * 2;
    const camera = new GameObject().AddComponent(Components.Camera);
    camera.SetOrthographic(-R, R, -R, R, cameraDist - R, cameraDist + R);
    camera.transform.position.set(center.x, center.y, center.z + cameraDist);
    camera.transform.LookAt(center);
    camera.transform.Update();
    camera.Update();
    const modelData = new Float32Array(meshes.length * 16);
    for (let i = 0; i < meshes.length; i++) {
      modelData.set(meshes[i].transform.localToWorldMatrix.elements, i * 16);
    }
    MeshBaker.Bake(meshes, modelData, camera, {
      albedo: this.albedoTexture,
      normal: this.normalTexture,
      ermo: this.ermoTexture,
      depth
    });
    depth.Destroy();
    await this.buildRuntimeMaterial(this.albedoTexture, this.normalTexture, this.ermoTexture);
  }
  async buildRuntimeMaterial(albedoTexture, normalTexture, ermoTexture) {
    const fmt = GPU.RenderingPipeline.GBufferFormat;
    const shader = await GPU.Shader.Create({
      code: `
              #include "@trident/core/resources/webgpu/shaders/deferred/Common.wgsl";

              struct VertexInput {
                  @builtin(instance_index) instance : u32,
                  @location(0) position : vec3<f32>,
                  @location(1) normal   : vec3<f32>,
                  @location(2) uv       : vec2<f32>,
              };
              struct VertexOutput {
                  @builtin(position) position : vec4<f32>,
                  @location(0) vUv : vec2<f32>,
                  @location(1) centerWS : vec3<f32>,
              };

              @group(0) @binding(0) var<storage, read> frameBuffer    : FrameBuffer;
              @group(0) @binding(1) var<storage, read> modelMatrix    : array<mat4x4<f32>>;
              @group(0) @binding(2) var                textureSampler : sampler;
              @group(0) @binding(3) var                albedoTex      : texture_2d<f32>;
              @group(0) @binding(4) var                normalTex      : texture_2d<f32>;
              @group(0) @binding(5) var                ermoTex        : texture_2d<f32>;

              @vertex fn vertexMain(input: VertexInput) -> VertexOutput {
                  var output: VertexOutput;
                  let model = modelMatrix[input.instance];
                  output.position = frameBuffer.projectionMatrix * frameBuffer.viewMatrix * model * vec4f(input.position, 1.0);
                  output.vUv = input.uv;
                  output.centerWS    = (model * vec4<f32>(0.0, 0.0, 0.0, 1.0)).xyz;
                  return output;
              }

              struct FragmentOutput {
                  @location(0) albedo : vec4f,
                  @location(1) normal : vec4f,
                  @location(2) RMO    : vec4f,
              };

              @fragment fn fragmentMain(input: VertexOutput) -> FragmentOutput {
                  let albedo = textureSample(albedoTex, textureSampler, input.vUv);
                  if (albedo.a < 0.5) { discard; }

                let nRuntime = normalize(frameBuffer.viewPosition.xyz - input.centerWS);
                let normal = vec4<f32>(OctEncode(nRuntime), 0.0, 0.0);
                // let normalTexel = textureSampleLevel(atlasNormal, textureSampler, u, 0.0);
                // let normal = normalTexel;

                  var output: FragmentOutput;
                  output.albedo = albedo;
                  output.normal = normal;
                  output.RMO    = textureSample(ermoTex, textureSampler, input.vUv);
                  return output;
              }
          `,
      colorOutputs: [{ format: fmt }, { format: fmt }, { format: fmt }],
      depthOutput: "depth24plus",
      cullMode: "none"
    });
    shader.SetSampler("textureSampler", new GPU.TextureSampler());
    shader.SetTexture("albedoTex", albedoTexture);
    shader.SetTexture("normalTex", normalTexture);
    shader.SetTexture("ermoTex", ermoTexture);
    this.geometry = Geometry.Plane();
    this.material = new GPU.Material({ shader, isDeferred: true });
    const s = this.originalBounds.radius;
    const c = this.originalBounds.center;
    this.geometry = this.geometry.Scale(new Mathf.Vector3(s, s, s));
    this.geometry = this.geometry.ApplyOperationToVertices("+", new Mathf.Vector3().copy(c));
  }
}

export { Billboarder };
