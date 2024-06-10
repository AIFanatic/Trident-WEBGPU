import { Shader } from "../Shader";
import { Geometry } from "../../Geometry";
import { DepthTexture, RenderTexture } from "../Texture";
import { TextureSampler } from "../TextureSampler";
import { Camera } from "../../components/Camera";
import { RendererContext } from "../RendererContext";
import { RenderPass, ResourcePool } from "../RenderGraph";
import { Renderer } from "../Renderer";

export class GBufferDebugger extends RenderPass {
    public name: string = "OutputPass";
    private shader: Shader;
    private sampler: TextureSampler;
    private quadGeometry: Geometry;

    constructor(inputGBufferPosition: string, inputGBufferAlbedo: string, inputGBufferNormal: string, inputGBufferDepth: string) {
        super({inputs: [inputGBufferPosition, inputGBufferAlbedo, inputGBufferNormal, inputGBufferDepth]});

        const code = `
        @group(0) @binding(0) var textureSampler: sampler;

        @group(0) @binding(1) var positionTexture: texture_2d<f32>;
        @group(0) @binding(2) var albedoTexture: texture_2d<f32>;
        @group(0) @binding(3) var normalTexture: texture_2d<f32>;
        @group(0) @binding(4) var depthTexture: texture_depth_2d;
        
        @vertex
        fn vertexMain(@location(0) position : vec3<f32>) -> @builtin(position) vec4<f32> {
            return vec4(position, 1.0);
        }
        
        @fragment
        fn fragmentMain(@builtin(position) position : vec4<f32>) -> @location(0) vec4<f32> {
            let uv = position.xy / vec2<f32>(textureDimensions(albedoTexture));
            var positionA = textureSample(positionTexture, textureSampler, uv);
            var albedo = textureSample(albedoTexture, textureSampler, uv);
            var normal = textureSample(normalTexture, textureSampler, uv);
            var depth = textureSample(depthTexture, textureSampler, uv);

            if (uv.x > 0.0 && uv.y > 0.0 && uv.x < 0.5 && uv.y < 0.5) {
                return vec4(depth);
            }
            else if (uv.x > 0.5 && uv.y > 0.0 && uv.x < 1.0 && uv.y < 0.5) {
                return albedo;
            }
            else if (uv.x > 0.0 && uv.y > 0.5 && uv.x < 0.5 && uv.y < 1.0) {
                return normal;
            }
            return positionA;
        }
        `;
        this.shader = Shader.Create({
            code: code,
            attributes: {
                position: {location: 0, size: 3, type: "vec3"},
                normal: {location: 1, size: 3, type: "vec3"}
            },
            uniforms: {
                textureSampler: {location: 0, type: "storage"},
                positionTexture: {location: 1, type: "storage"},
                albedoTexture: {location: 2, type: "storage"},
                normalTexture: {location: 3, type: "storage"},
                depthTexture: {location: 4, type: "storage"},
            },
            targets: 1
        });
        // this.shader.depthTest = false;


        this.sampler = TextureSampler.Create();
        this.shader.SetSampler("textureSampler", this.sampler);
        this.quadGeometry = Geometry.Plane();
    }

    public execute(resources: ResourcePool, inputGBufferPosition: RenderTexture, inputGBufferAlbedo: RenderTexture, inputGBufferNormal: RenderTexture, inputGBufferDepth: DepthTexture) {
        const camera = Camera.mainCamera;
        const renderTarget = camera.renderTarget;
        const depthTarget = camera.depthTarget;
        const backgroundColor = camera.backgroundColor;

        RendererContext.BeginRenderPass("DebugOutputPass",
            [{target: renderTarget, clear: true, color: backgroundColor}],
            {target: depthTarget, clear: true}
        );

        this.shader.SetTexture("positionTexture", inputGBufferPosition);
        this.shader.SetTexture("albedoTexture", inputGBufferAlbedo);
        this.shader.SetTexture("normalTexture", inputGBufferNormal);
        this.shader.SetTexture("depthTexture", inputGBufferDepth);

        RendererContext.DrawGeometry(this.quadGeometry, this.shader);
        RendererContext.EndRenderPass();
    }
}






export class Pass {
    public name: string = "OutputPass";
    private shader: Shader;
    private sampler: TextureSampler;
    private quadGeometry: Geometry;

    constructor() {
        const code = `
        @group(0) @binding(0) var texture: texture_2d<f32>;
        @group(0) @binding(1) var textureSampler: sampler;
        
        @vertex
        fn vertexMain(@location(0) position : vec3<f32>) -> @builtin(position) vec4<f32> {
            return vec4(position, 1.0);
        }
        
        @fragment
        fn fragmentMain(@builtin(position) position : vec4<f32>) -> @location(0) vec4<f32> {
            let uv = position.xy / vec2<f32>(textureDimensions(texture));
            var color = textureSample(texture, textureSampler, uv);
            return color;
        }
        `;
        
        this.sampler = TextureSampler.Create();
        this.shader.SetSampler("textureSampler", this.sampler);
        this.quadGeometry = Geometry.Plane();
    }

    public execute(inputRenderTarget: RenderTexture, output1: string) {
        RendererContext.BeginRenderPass("DebugOutputPass",
            [{target: inputRenderTarget, clear: true}],
        );

        this.shader.SetTexture("texture", inputRenderTarget);

        RendererContext.DrawGeometry(this.quadGeometry, this.shader);
        RendererContext.EndRenderPass();
    }
}