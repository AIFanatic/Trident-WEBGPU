import { GPU, Mathf, Components, GameObject, Geometry, PBRMaterial } from "@trident/core";
import { MeshBaker } from "./MeshBaker";

export class Billboarder extends Components.Mesh {
    public albedoTexture: GPU.RenderTexture;
    public normalTexture: GPU.RenderTexture;
    public ermoTexture: GPU.RenderTexture;
    public depthTexture: GPU.DepthTexture;

    private originalBounds: Mathf.BoundingVolume;

    public async Create(meshes: Components.Mesh[], resolution = 1024) {
        if (meshes.length === 0) throw Error("Billboarder.Create needs at least one mesh");

        await MeshBaker.awaitShaders(meshes);
        this.originalBounds = MeshBaker.computeBounds(meshes);

        const fmt = GPU.RenderingPipeline.GBufferFormat;
        this.albedoTexture = GPU.RenderTexture.Create(resolution, resolution, 1, fmt);
        this.normalTexture = GPU.RenderTexture.Create(resolution, resolution, 1, fmt);
        this.ermoTexture = GPU.RenderTexture.Create(resolution, resolution, 1, fmt);
        this.depthTexture = GPU.DepthTexture.Create(resolution, resolution);

        const { radius: R, center } = this.originalBounds;
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
            depth: this.depthTexture,
        });

        this.albedoTexture.GenerateMips();
        this.normalTexture.GenerateMips();
        this.ermoTexture.GenerateMips();

        await this.buildRuntimeMaterial(this.albedoTexture, this.normalTexture, this.ermoTexture, this.depthTexture);
    }

    private async buildRuntimeMaterial(albedoTexture: GPU.RenderTexture, normalTexture: GPU.RenderTexture, ermoTexture: GPU.RenderTexture, depthTexture: GPU.DepthTexture) {
        const { radius: R } = this.originalBounds;
        const fmt = GPU.RenderingPipeline.GBufferFormat;
        const shader = await GPU.Shader.Create({
            code: `
                  #include "@trident/core/resources/webgpu/shaders/deferred/Common.wgsl";

                  struct VertexInput {
                      @builtin(instance_index) instanceIdx : u32,
                      @location(0) position : vec3<f32>,
                      @location(1) normal   : vec3<f32>,
                      @location(2) uv       : vec2<f32>,
                  };
                  struct VertexOutput {
                      @builtin(position) position : vec4<f32>,
                      @location(0) uv : vec2<f32>,
                      @location(1) @interpolate(flat) right : vec3<f32>,
                      @location(2) @interpolate(flat) up    : vec3<f32>,
                      @location(3) @interpolate(flat) fwd   : vec3<f32>,
                  };

                  @group(0) @binding(0) var<storage, read> frameBuffer : FrameBuffer;
                  @group(0) @binding(1) var<storage, read> modelMatrix : array<mat4x4<f32>>;
                  @group(0) @binding(2) var textureSampler : sampler;
                  @group(0) @binding(3) var atlasAlbedo : texture_2d<f32>;
                  @group(0) @binding(4) var atlasNormal : texture_2d<f32>;
                  @group(0) @binding(5) var atlasERMO   : texture_2d<f32>;
                  @group(0) @binding(6) var atlasDepth  : texture_depth_2d;

                  @vertex fn vertexMain(input : VertexInput) -> VertexOutput {
                      var output : VertexOutput;

                      let model  = modelMatrix[input.instanceIdx];
                      let center = model[3].xyz;
                      let sx = length(model[0].xyz);   // scale from the basis columns
                      let sy = length(model[1].xyz);

                      let fwd = normalize(frameBuffer.viewPosition.xyz - center);   // toward camera
                      var upRef = vec3<f32>(0.0, 1.0, 0.0);
                      if (abs(fwd.y) > 0.999) { upRef = vec3<f32>(0.0, 0.0, 1.0); } // pole guard
                      let right = normalize(cross(upRef, fwd));
                      let up    = cross(fwd, right);

                      // camera-facing quad in world space (same basis as the normals), respecting transform scale
                      let worldPos = center + (right * input.position.x * sx + up * input.position.y * sy) * ${R};
                      output.position = frameBuffer.projectionMatrix * frameBuffer.viewMatrix * vec4<f32>(worldPos, 1.0);

                      output.uv    = input.uv;
                      output.right = right;
                      output.up    = up;
                      output.fwd   = fwd;
                      return output;
                  }

                  struct FragmentOutput {
                      @location(0) albedo : vec4f,
                      @location(1) normal : vec4f,
                      @location(2) RMO    : vec4f,
                  };

                  @fragment fn fragmentMain(input : VertexOutput) -> FragmentOutput {
                      let dim = vec2<f32>(textureDimensions(atlasDepth));
                      if (textureLoad(atlasDepth, vec2<i32>(input.uv * dim), 0) >= 1.0) { discard; }

                      let nTexel = textureSample(atlasNormal, textureSampler, input.uv);
                      let nBake  = OctDecode(nTexel.rg);
                      let N = normalize(input.right * nBake.x + input.up * nBake.y + input.fwd * nBake.z);

                      var output : FragmentOutput;
                      output.albedo = textureSample(atlasAlbedo, textureSampler, input.uv); // straight to GBuffer
                      output.normal = vec4f(OctEncode(N), nTexel.b, nTexel.a);
                      output.RMO    = textureSample(atlasERMO,   textureSampler, input.uv);
                      return output;
                  }
            `,
            colorOutputs: [{ format: fmt }, { format: fmt }, { format: fmt }],
            depthOutput: "depth24plus",
            cullMode: "none",
        });

        shader.SetSampler("textureSampler", new GPU.TextureSampler());
        shader.SetTexture("atlasAlbedo", albedoTexture);
        shader.SetTexture("atlasNormal", normalTexture);
        shader.SetTexture("atlasERMO", ermoTexture);
        shader.SetTexture("atlasDepth", depthTexture);

        this.geometry = Geometry.Plane();
        this.material = new GPU.ShaderMaterial({ shader, isDeferred: true });
    }
}