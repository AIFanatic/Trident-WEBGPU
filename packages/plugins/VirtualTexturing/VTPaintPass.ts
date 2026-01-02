import {
    Components,
    Geometry,
    GPU
} from "@trident/core";

export class VTPaintPass extends GPU.RenderPass {
    public name: string = "VTPaintPass";
    
    private shader: GPU.Shader;
    private geometry: Geometry;

    private renderTarget: GPU.RenderTexture;
    private atlas: GPU.Texture;
    private pageTables: GPU.Texture;

    public renderables: Components.Renderable[] = [];
    public modelMatrices: GPU.DynamicBufferMemoryAllocatorDynamic;
    private meshOffsets: Map<Components.Renderable, number> = new Map();

    constructor(atlas: GPU.Texture, pageTables: GPU.Texture) {
        super();
        this.renderTarget = GPU.RenderTexture.Create(GPU.Renderer.width, GPU.Renderer.height, 1, "rgba16float");
        this.atlas = atlas;
        this.pageTables = pageTables;
        this.modelMatrices = new GPU.DynamicBufferMemoryAllocatorDynamic(256, GPU.BufferType.STORAGE, 256 * 10);
    }

    public async init(resources: GPU.ResourcePool) {
        this.shader = await GPU.Shader.Create({
            code: `
            #include "@trident/core/resources/webgpu/shaders/deferred/Common.wgsl";

            @group(0) @binding(0) var<storage, read> frameBuffer: FrameBuffer;
            @group(0) @binding(1) var<storage, read> modelMatrix: mat4x4<f32>;

            @group(0) @binding(2) var atlas: texture_2d<f32>;
            @group(0) @binding(3) var pageTables: texture_2d<u32>;

            @group(1) @binding(0) var texSampler: sampler;
            @group(1) @binding(1) var gBufferAlbedo: texture_2d<f32>;
            @group(1) @binding(2) var gBufferNormal: texture_2d<f32>;

            struct Params {
                u_VirtualSize: vec2f,
                u_PageGrid: vec2f,
                u_AtlasSize: vec2f,
                u_PageSize: vec2f,
                u_PagePadding: vec2f,
                u_MinMaxMipLevel: vec2f,
                u_BufferScreenRatio: vec2f,
            }
            @group(2) @binding(0) var<storage, read> params: Params;

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

            @fragment
            fn fragmentMain(input: VertexOutput) -> @location(0) vec4<f32> {
                let v_TexCoord = input.uv;
                // return textureSample(gBufferAlbedo, texSampler, v_TexCoord);

                let mip_float = clamp(
                    ComputeMipLevel(params.u_VirtualSize, v_TexCoord),
                    params.u_MinMaxMipLevel.x,
                    params.u_MinMaxMipLevel.y
                );

                var mip_level = i32(mip_float);
                let max_level = i32(params.u_MinMaxMipLevel.y);

                let base_dx = dpdx(v_TexCoord);
                let base_dy = dpdy(v_TexCoord);

                var curr_page_grid = vec2(0.0);
                var entry = 0u;
                var is_resident = false;

                for (; mip_level <= max_level; mip_level++) {
                    let mip_scale = exp2(-f32(mip_level));
                    curr_page_grid = max(params.u_PageGrid * mip_scale, vec2(1.0));

                    var page_coords = floor(v_TexCoord * curr_page_grid);
                    page_coords = clamp(page_coords, vec2(0.0), curr_page_grid - 1.0);

                    // Flip Y to match coordinate systems:
                    // The page table is indexed starting from top-left (row 0)
                    // page_coords.y = (curr_page_grid.y - 1) - page_coords.y;

                    entry = textureLoad(pageTables, vec2<i32>(page_coords), mip_level).r;
                    if ((entry & 1u) != 0u) {
                        is_resident = true;
                        break; // Found a valid page
                    }
                }
                    
                if (!is_resident) {
                    return vec4(1.0, 0.0, 0.0, 1.0);
                }

                let physical_page = vec2<u32>((entry >> 1) & PAGE_MASK, (entry >> 9) & PAGE_MASK);
            
                let local_uv = fract(v_TexCoord * curr_page_grid);

                let page_origin = vec2f(physical_page) * (params.u_PageSize + params.u_PagePadding);
                let half_padding = params.u_PagePadding * 0.5;
                let sample_texel = page_origin + half_padding + local_uv * params.u_PageSize;
                let atlas_uv = sample_texel / params.u_AtlasSize;

                let dx = base_dx * curr_page_grid * (params.u_PageSize / params.u_AtlasSize);
                let dy = base_dy * curr_page_grid * (params.u_PageSize / params.u_AtlasSize);

                return textureSampleGrad(atlas, texSampler, atlas_uv, dx, dy);
            }
            `,
            colorOutputs: [ { format: "rgba16float" } ],
        });

        this.geometry = Geometry.Plane();
        this.shader.SetTexture("atlas", this.atlas);
        this.shader.SetTexture("pageTables", this.pageTables);

        this.shader.SetSampler("texSampler", GPU.TextureSampler.Create());

        this.initialized = true;
    }

    public async preFrame(resources: GPU.ResourcePool) {
        const frameBuffer = resources.getResource(GPU.PassParams.FrameBuffer);
        const gBufferAlbedo = resources.getResource(GPU.PassParams.GBufferAlbedo);
        const gBufferNormal = resources.getResource(GPU.PassParams.GBufferNormal);

        for (const renderable of this.renderables) {
            const modelMatrixOffset = this.modelMatrices.set(renderable.id, renderable.transform.localToWorldMatrix.elements);
            this.meshOffsets.set(renderable, modelMatrixOffset);
        }

        this.shader.SetBuffer("frameBuffer", frameBuffer);
        this.shader.SetBuffer("modelMatrix", this.modelMatrices.getBuffer()); // Set here because the buffer is dynamic
        this.shader.SetTexture("gBufferAlbedo", gBufferAlbedo);
        this.shader.SetTexture("gBufferNormal", gBufferNormal);
    }

    public async execute(resources: GPU.ResourcePool) {
        if (!this.initialized) return;

        const lightingOutput = resources.getResource(GPU.PassParams.LightingPassOutput);

        if (!lightingOutput) return;

        GPU.RendererContext.BeginRenderPass(this.name, [{target: this.renderTarget, clear: true}], undefined, true);
        GPU.RendererContext.SetViewport(0, 0, lightingOutput.width, lightingOutput.height);
        GPU.RendererContext.SetScissor(0, 0, lightingOutput.width, lightingOutput.height);
        
        for (const renderable of this.renderables) {
            this.modelMatrices.getBuffer().dynamicOffset = this.meshOffsets.get(renderable) * this.modelMatrices.getStride();
            GPU.RendererContext.DrawGeometry(renderable.geometry, this.shader);
        }
        GPU.RendererContext.EndRenderPass();

        GPU.RendererContext.CopyTextureToTextureV3({texture: this.renderTarget}, {texture: lightingOutput});
    }
}