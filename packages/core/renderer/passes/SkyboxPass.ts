import { Shader } from "../Shader";
import { Geometry } from "../../Geometry";
import { CubeTexture, RenderTexture } from "../Texture";
import { TextureSampler } from "../TextureSampler";
import { Camera } from "../../components/Camera";
import { PassParams } from "../RenderingPipeline";
import { RenderPass, ResourcePool } from "../RenderGraph";
import { RendererContext } from "../RendererContext";


export class SkyboxPass extends RenderPass {
    public name: string = "SkyboxPass";
    private shader: Shader;
    private quadGeometry: Geometry;

    public initialized = false;

    public async init() {
        this.shader = await Shader.Create({
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
            colorOutputs: [{format: "rgba16float"}],
        });

        this.shader.SetSampler("textureSampler", TextureSampler.Create());

        this.quadGeometry = new Geometry();

        this.initialized = true;
    }

    public async preFrame(resources: ResourcePool) {
        if (!this.initialized) return;
        this.drawCommands.length = 0;

        const inputGBufferDepth = resources.getResource(PassParams.GBufferDepth);
        const inputSkybox = resources.getResource(PassParams.Skybox) as CubeTexture;
        const inputFrameBuffer = resources.getResource(PassParams.FrameBuffer);
        if (!inputGBufferDepth) return;
        if (!inputSkybox) return;

        this.shader.SetTexture("depthTexture", inputGBufferDepth);
        this.shader.SetTexture("skyboxTexture", inputSkybox);
        this.shader.SetBuffer("view", inputFrameBuffer);
        
        this.drawCommands.push({geometry: this.quadGeometry, shader: this.shader, instanceCount: 1, firstInstance: 0});
    }

    public async execute(resources: ResourcePool) {
        if (!this.initialized) return;
        if (this.drawCommands.length === 0) return;

        const LightingPassOutput = resources.getResource(PassParams.LightingPassOutput);
        RendererContext.BeginRenderPass(this.name, [{ target: LightingPassOutput, clear: false }], undefined, true);

        for (const draw of this.drawCommands) {
            RendererContext.Draw(draw.geometry, draw.shader, 3, draw.instanceCount, draw.firstInstance);
        }

        RendererContext.EndRenderPass();

        resources.setResource(PassParams.LightingPassOutput, LightingPassOutput);
    }
}