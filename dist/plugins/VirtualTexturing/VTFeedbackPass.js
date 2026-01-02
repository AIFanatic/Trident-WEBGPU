import { GPU, Mathf } from '@trident/core';

function alignTo(value, alignment) {
  return Math.ceil(value / alignment) * alignment;
}
class VTFeedbackPass extends GPU.RenderPass {
  name = "VTFeedbackPass";
  shader;
  feedback_buffer;
  renderTarget;
  gBufferClone;
  renderables = [];
  modelMatrices;
  materialIDs;
  meshOffsets = /* @__PURE__ */ new Map();
  constructor(width, height) {
    super();
    this.renderTarget = GPU.RenderTexture.Create(width, height, 1, "r32uint");
    const feedbackBytesPerRow = alignTo(width * 4, 256);
    const bufferSize = feedbackBytesPerRow * height;
    this.feedback_buffer = GPU.Buffer.Create(bufferSize, GPU.BufferType.STORAGE);
    this.gBufferClone = GPU.DepthTexture.Create(width, height, 1, "depth24plus");
    this.modelMatrices = new GPU.DynamicBufferMemoryAllocatorDynamic(256, GPU.BufferType.STORAGE, 256 * 10);
    this.materialIDs = new GPU.DynamicBufferMemoryAllocatorDynamic(256, GPU.BufferType.STORAGE, 256 * 10);
  }
  async init(resources) {
    this.shader = await GPU.Shader.Create({
      code: `
            #include "@trident/core/resources/webgpu/shaders/deferred/Common.wgsl";

            @group(0) @binding(0) var<storage, read> frameBuffer: FrameBuffer;
            @group(0) @binding(1) var<storage, read> modelMatrix: mat4x4<f32>;
            @group(0) @binding(2) var<storage, read> materialID: f32;

            struct Params {
                u_VirtualSize: vec2f,
                u_PageGrid: vec2f,
                u_AtlasSize: vec2f,
                u_PageSize: vec2f,
                u_PagePadding: vec2f,
                u_MinMaxMipLevel: vec2f,
                u_BufferScreenRatio: vec2f,
            }
            @group(1) @binding(0) var<storage, read> params: Params;

            struct VertexInput {
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

                let modelViewMatrix = frameBuffer.viewMatrix * modelMatrix;

                output.position = frameBuffer.projectionMatrix * modelViewMatrix * vec4(input.position, 1.0);
                output.uv = input.uv;
                return output;
            }



            fn ComputeMipLevel(effective_size: vec2f, uv: vec2f) -> f32 {
                let dx = dpdx(uv) * effective_size;
                let dy = dpdy(uv) * effective_size;
                let texel_footprint = max(dot(dx, dx), dot(dy, dy));
                return 0.5 * log2(max(texel_footprint, 1e-8));
            }

            const MIP_MASK  = 0x1Fu;
            const PAGE_MASK = 0xFFu;

            fn PackPageData(mip: u32, page_x: u32, page_y: u32, material_id: u32) -> u32 {
                return (mip & 0x1Fu) |
                        ((page_x & 0xFFu) << 5) |
                        ((page_y & 0xFFu) << 13) |
                        ((material_id & 0x7FFu) << 21);
            }

            @fragment
            fn fragmentMain(input: VertexOutput) -> @location(0) u32 {

                let v_TexCoord = vec2(input.uv.x, input.uv.y);

                let effective_size = params.u_VirtualSize * params.u_BufferScreenRatio.x;

                let mip_level = u32(clamp(
                    ComputeMipLevel(effective_size, v_TexCoord),
                    params.u_MinMaxMipLevel.x,
                    params.u_MinMaxMipLevel.y
                ));

                let mip_scale = exp2(-f32(mip_level));
                let curr_page_grid = max(params.u_PageGrid * mip_scale, vec2(1.0));
                var page_coords = floor(v_TexCoord * curr_page_grid);
                // page_coords.y = (curr_page_grid.y - 1) - page_coords.y;
                page_coords = clamp(page_coords, vec2(0.0), curr_page_grid - 1.0);

                let packed = PackPageData(mip_level, u32(page_coords.x), u32(page_coords.y), u32(materialID));
                return packed;
            }
            `,
      colorOutputs: [{ format: "r32uint" }],
      depthOutput: "depth24plus",
      depthWriteEnabled: false,
      depthCompare: "less-equal"
    });
    this.initialized = true;
  }
  async preFrame(resources) {
    const frameBuffer = resources.getResource(GPU.PassParams.FrameBuffer);
    this.shader.SetBuffer("frameBuffer", frameBuffer);
    this.shader.SetBuffer("modelMatrix", this.modelMatrices.getBuffer());
    this.shader.SetBuffer("materialID", this.materialIDs.getBuffer());
    const gBufferDepth = resources.getResource(GPU.PassParams.GBufferDepth);
    for (const renderable of this.renderables) {
      const modelMatrixOffset = this.modelMatrices.set(renderable.id, renderable.transform.localToWorldMatrix.elements);
      const materialOffset = this.materialIDs.set(renderable.id, new Float32Array([renderable.material.materialId]));
      this.meshOffsets.set(renderable, { modelMatrixOffset, materialIDOffset: materialOffset });
    }
    GPU.Texture.BlitDepth(gBufferDepth, this.gBufferClone, this.gBufferClone.width, this.gBufferClone.height);
  }
  async execute(resources) {
    if (!this.initialized) return;
    const lightingOutput = resources.getResource(GPU.PassParams.LightingPassOutput);
    const gBufferDepth = resources.getResource(GPU.PassParams.GBufferDepth);
    if (!lightingOutput || !gBufferDepth) return;
    GPU.RendererContext.BeginRenderPass(this.name, [{ target: this.renderTarget, clear: true, color: new Mathf.Color(4294967295, 0, 0, 0) }], { target: this.gBufferClone, clear: true }, true);
    GPU.RendererContext.SetViewport(0, 0, this.renderTarget.width, this.renderTarget.height);
    GPU.RendererContext.SetScissor(0, 0, this.renderTarget.width, this.renderTarget.height);
    for (const renderable of this.renderables) {
      const offsets = this.meshOffsets.get(renderable);
      this.modelMatrices.getBuffer().dynamicOffset = offsets.modelMatrixOffset * this.modelMatrices.getStride();
      this.materialIDs.getBuffer().dynamicOffset = offsets.materialIDOffset * this.materialIDs.getStride();
      GPU.RendererContext.DrawGeometry(renderable.geometry, this.shader);
    }
    GPU.RendererContext.EndRenderPass();
    const feedbackBytesPerRow = alignTo(this.renderTarget.width * 4, 256);
    GPU.RendererContext.CopyTextureToBufferV2({ texture: this.renderTarget }, { buffer: this.feedback_buffer, bytesPerRow: feedbackBytesPerRow, rowsPerImage: this.renderTarget.height });
  }
}

export { VTFeedbackPass };
