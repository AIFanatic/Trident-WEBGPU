import { Components, GPU, VertexAttribute } from '@trident/core';

class FoliageBillboardMesh extends Components.Mesh {
  static type = "@trident/plugins/FoliageBillboardMesh";
  foliageGeometry;
  foliageMaterial;
  Start() {
    if (!this.foliageGeometry) throw Error("Need foliageGeometry");
    if (!this.foliageMaterial) throw Error("Need foliageMaterail");
    this.createShader();
  }
  ExtractBillboardCenterAttribute(vertices, indices, options) {
    const vertexStride = options?.vertexStride ?? 3;
    const positionOffset = options?.positionOffset ?? 0;
    const indexStart = options?.indexStart ?? 0;
    const indexCount = options?.indexCount ?? indices.length;
    const vertexCount = vertices.length / vertexStride;
    const centers = new Float32Array(vertexCount * 3);
    if (indexCount % 6 !== 0) {
      console.warn(
        "Index count is not divisible by 6. Expected billboard planes as 2 triangles / 6 indices."
      );
    }
    for (let i = indexStart; i < indexStart + indexCount; i += 6) {
      const quadIndices = [
        indices[i + 0],
        indices[i + 1],
        indices[i + 2],
        indices[i + 3],
        indices[i + 4],
        indices[i + 5]
      ];
      const uniqueIndices = Array.from(new Set(quadIndices));
      if (uniqueIndices.length !== 4) {
        console.warn("Skipping non-quad index group:", quadIndices);
        continue;
      }
      let cx = 0;
      let cy = 0;
      let cz = 0;
      for (const vertexIndex of uniqueIndices) {
        const base = vertexIndex * vertexStride + positionOffset;
        cx += vertices[base + 0];
        cy += vertices[base + 1];
        cz += vertices[base + 2];
      }
      cx /= 4;
      cy /= 4;
      cz /= 4;
      for (const vertexIndex of uniqueIndices) {
        const outBase = vertexIndex * 3;
        centers[outBase + 0] = cx;
        centers[outBase + 1] = cy;
        centers[outBase + 2] = cz;
      }
    }
    return centers;
  }
  pendingShaderCreation;
  async createShader() {
    if (this.pendingShaderCreation) return this.pendingShaderCreation;
    this.pendingShaderCreation = (async () => {
      const gbufferFormat = GPU.RenderingPipeline.GBufferFormat;
      const vertices = this.foliageGeometry.attributes.get("position");
      const indices = this.foliageGeometry.index;
      if (!vertices || !indices) throw Error("Foliage geometry needs to have both vertices and indices");
      const leafPlaneCenters = this.ExtractBillboardCenterAttribute(vertices.array, indices.array);
      const leafPlaneCentersAttribute = new VertexAttribute(leafPlaneCenters);
      console.log(leafPlaneCenters, leafPlaneCentersAttribute);
      const shader = await GPU.Shader.Create({
        name: "PBRMaterial",
        code: `
                    #include "@trident/core/resources/webgpu/shaders/deferred/Common.wgsl";

                    @group(0) @binding(0) var<storage, read> frameBuffer: FrameBuffer;
                    @group(0) @binding(1) var<storage, read> modelMatrix: array<mat4x4<f32>>;

                    @group(0) @binding(2) var textureSampler: sampler;
                    @group(0) @binding(3) var albedoMap: texture_2d<f32>;

                    struct VertexInput {
                        @builtin(instance_index) instanceIdx : u32, 
                        @location(0) position : vec3<f32>,
                        @location(1) normal : vec3<f32>,
                        @location(2) uv : vec2<f32>,
                        @location(3) leafCenters : vec3<f32>,
                    };

                    struct VertexOutput {
                        @builtin(position) position : vec4<f32>,
                        @location(0) vPosition : vec3<f32>,
                        @location(1) vNormal : vec3<f32>,
                        @location(2) vUv : vec2<f32>,
                    };

                    @vertex
                    fn vertexMain(input: VertexInput) -> VertexOutput {
                        var output : VertexOutput;

                        output.position = frameBuffer.viewProjectionMatrix * modelMatrix[input.instanceIdx] * vec4(input.position, 1.0);
                        
                        output.vPosition = input.position;
                        output.vNormal = input.normal;
                        output.vUv = input.uv;

                        return output;
                    }

                    struct FragmentOutput {
                        @location(0) albedo : vec4f,
                        @location(1) normal : vec4f,
                        @location(2) RMO : vec4f,
                    };

                    @fragment
                    fn fragmentMain(input: VertexOutput) -> FragmentOutput {
                        var output: FragmentOutput;

                        var albedo = textureSample(albedoMap, textureSampler, input.vUv);
                        if (albedo.a < 0.5) {
                            discard;
                        }

                        output.albedo = vec4(albedo.rgb, 1.0);
                        output.normal = vec4(OctEncode(input.vNormal.xyz), 0.0, 0.0);
                        output.RMO = vec4(vec3(0.0), 0.0);

                        return output;
                    }
                `,
        colorOutputs: Array(3).fill({ format: gbufferFormat }),
        depthOutput: "depth24plus",
        cullMode: "none"
      });
      shader.SetTexture("albedoMap", this.foliageAlbedo);
      shader.SetSampler("textureSampler", new GPU.TextureSampler());
      this._shader = shader;
      return shader;
    })();
    return this.pendingShaderCreation;
  }
}

export { FoliageBillboardMesh };
