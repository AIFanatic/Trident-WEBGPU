import { Shader } from "../Shader";
import { Geometry } from "../../Geometry";
import { DepthTexture } from "../Texture";
import { TextureSampler } from "../TextureSampler";
import { Camera } from "../../components/Camera";
import { RendererContext } from "../RendererContext";
import { RenderPass, ResourcePool } from "../RenderGraph";
import { PassParams } from "../RenderingPipeline";

export class OutputDepthPass extends RenderPass {
    public name: string = "OutputDepthPass";
    private shader: Shader;
    private sampler: TextureSampler;
    private quadGeometry: Geometry;

    constructor() {
        super();
        this.shader = Shader.Create(`
        struct VertexInput {
            @location(0) position : vec3<f32>,
            @location(1) normal : vec3<f32>,
        };
        
        struct VertexOutput {
            @builtin(position) position : vec4<f32>,
        };
        
        @group(0) @binding(0) var depthTexture: texture_depth_2d;
        @group(0) @binding(1) var depthSampler: sampler;
        
        @vertex
        fn vertexMain(@builtin(instance_index) instanceIdx : u32, input: VertexInput) -> VertexOutput {
            var output : VertexOutput;

            output.position = vec4(input.position, 1.0);
        
            return output;
        }
        
        @fragment
        fn fragmentMain(fragData: VertexOutput) -> @location(0) vec4<f32> {
            let uv = fragData.position.xy / vec2<f32>(textureDimensions(depthTexture));
            var color = textureSample(depthTexture, depthSampler, uv);
            return vec4(color);
        }
        `);
        // this.shader.depthTest = false;

        this.sampler = TextureSampler.Create();
        this.shader.SetSampler("depthSampler", this.sampler);
        this.quadGeometry = Geometry.Plane();
    }

    public execute(resources: ResourcePool) {
        const texture = resources.getResource(PassParams.GeometryDepthTarget) as DepthTexture;
        if (!texture) throw Error(`No texture passed to ${this.name}!`);
       
        const camera = Camera.mainCamera;
        const renderTarget = camera.renderTarget;
        const depthTarget = camera.depthTarget;
        const backgroundColor = camera.backgroundColor;

        RendererContext.BeginRenderPass("DebugDepthPass", renderTarget, depthTarget, true, true, backgroundColor);
        this.shader.SetTexture("depthTexture", texture);

        RendererContext.DrawGeometry(this.quadGeometry, this.shader);
        RendererContext.EndRenderPass();

    }
}