import { Geometry, GPU } from "@trident/core";

export class SkyboxPass extends GPU.RenderPass {
    public name: string = "SkyboxPass";
    private shader: GPU.Shader;
    private quadGeometry: Geometry;
    private skyboxTexture: GPU.CubeTexture;

    public initialized = false;

    public async init() {
        this.shader = await GPU.Shader.Create({
            code: `
                struct VertexOutput {
                    @builtin(position) position: vec4<f32>,
                };

                @group(0) @binding(0) var textureSampler: sampler;

                @group(0) @binding(4) var depthTexture: texture_depth_2d;

                @group(0) @binding(6) var skyboxTexture: texture_cube<f32>;

                struct View {
                    projectionOutputSize: vec4<f32>,
                    viewPosition: vec4<f32>,
                    projectionInverseMatrix: mat4x4<f32>,
                    viewInverseMatrix: mat4x4<f32>,
                    viewMatrix: mat4x4<f32>,
                    projectionMatrix: mat4x4<f32>,
                };
                @group(0) @binding(13) var<storage, read> view: View;


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
                        (input.position.x / view.projectionOutputSize.x) * 2.0 - 1.0,
                        (input.position.y / view.projectionOutputSize.y) * 2.0 - 1.0,
                        1.0
                    );
                    let viewRay4 = view.projectionInverseMatrix * vec4(ndc, 1.0);
                    var viewRay  = normalize(viewRay4.xyz / viewRay4.w);
                    viewRay.y   *= -1.0;
                    var worldRay = normalize((view.viewInverseMatrix * vec4(viewRay, 0.0)).xyz);

                    let sky = textureSample(skyboxTexture, textureSampler, worldRay).rgb;
                    return vec4f(sky, 1.0);
                }
            `,
            uniforms: {
                textureSampler: { group: 0, binding: 0, type: "sampler" },
                depthTexture: { group: 0, binding: 4, type: "depthTexture" },

                skyboxTexture: { group: 0, binding: 6, type: "texture" },

                view: { group: 0, binding: 13, type: "storage" },
            },
            colorOutputs: [{ format: "rgba16float" }],
        });

        this.shader.SetSampler("textureSampler", new GPU.TextureSampler());

        this.quadGeometry = new Geometry();

        this.initialized = true;
    }

    public SetSkybox(texture: GPU.CubeTexture) {
        this.skyboxTexture = texture;
    }

    public preFrame(resources: GPU.ResourcePool) {
        if (!this.initialized) return;
        if (!this.skyboxTexture) return;
        this.drawCommands.length = 0;

        const inputGBufferDepth = resources.getResource(GPU.PassParams.GBufferDepth);
        const inputFrameBuffer = resources.getResource(GPU.PassParams.FrameBuffer);
        if (!inputGBufferDepth) return;

        this.shader.SetTexture("depthTexture", inputGBufferDepth);
        this.shader.SetTexture("skyboxTexture", this.skyboxTexture);
        this.shader.SetBuffer("view", inputFrameBuffer);

        this.drawCommands.push({ geometry: this.quadGeometry, shader: this.shader, instanceCount: 1, firstInstance: 0 });
    }

    public execute(resources: GPU.ResourcePool) {
        if (!this.initialized) return;
        if (this.drawCommands.length === 0) return;

        const LightingPassOutput = resources.getResource(GPU.PassParams.LightingPassOutput);
        if (!LightingPassOutput) return;

        GPU.RendererContext.BeginRenderPass(this.name, [{ target: LightingPassOutput, clear: false }], undefined, true);

        for (const draw of this.drawCommands) {
            GPU.RendererContext.Draw(draw.geometry, draw.shader, 3, draw.instanceCount, draw.firstInstance);
        }

        GPU.RendererContext.EndRenderPass();

        resources.setResource(GPU.PassParams.LightingPassOutput, LightingPassOutput);
    }
}