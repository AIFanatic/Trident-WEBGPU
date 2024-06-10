import { Shader } from "../Shader";
import { Geometry } from "../../Geometry";
import { DepthTexture, RenderTexture } from "../Texture";
import { TextureSampler } from "../TextureSampler";
import { Camera } from "../../components/Camera";
import { RendererContext } from "../RendererContext";
import { RenderPass, ResourcePool } from "../RenderGraph";
import { Light } from "../../components/Light";
import { Renderer } from "../Renderer";

export class LightingPass extends RenderPass {
    public name: string = "LightingPass";
    private shader: Shader;
    private sampler: TextureSampler;
    private quadGeometry: Geometry;

    constructor(inputGBufferPosition: string, inputGBufferAlbedo: string, inputGBufferNormal: string, inputGBufferDepth: string) {
        super({ inputs: [inputGBufferPosition, inputGBufferAlbedo, inputGBufferNormal, inputGBufferDepth] });

        const code = `
        @group(0) @binding(0) var textureSampler: sampler;

        @group(0) @binding(1) var positionTexture: texture_2d<f32>;
        @group(0) @binding(2) var albedoTexture: texture_2d<f32>;
        @group(0) @binding(3) var normalTexture: texture_2d<f32>;
        @group(0) @binding(4) var depthTexture: texture_depth_2d;

        struct Light {
            position: vec4<f32>,
            color: vec4<f32>,
        };

        @group(0) @binding(5) var<storage, read> lights: array<Light>;
        @group(0) @binding(6) var<storage, read> lightCount: u32;
        
        @vertex
        fn vertexMain(@location(0) position : vec3<f32>) -> @builtin(position) vec4<f32> {
            return vec4(position, 1.0);
        }
        
        @fragment
        fn fragmentMain(@builtin(position) position : vec4<f32>) -> @location(0) vec4<f32> {
            let uv = position.xy / vec2<f32>(textureDimensions(albedoTexture));
            var positionA = textureSample(positionTexture, textureSampler, uv).xyz;
            var albedo = textureSample(albedoTexture, textureSampler, uv).rgb;
            var normal = textureSample(normalTexture, textureSampler, uv).xyz;
            var depth = vec3(textureSample(depthTexture, textureSampler, uv));

            var lighting = albedo.rgb * 0.1;
            for (var i = 0u; i < lightCount; i++) {
                var lightPosition = lights[i].position.xyz;
                var lightColor = lights[i].color.rgb;
                var radius = lights[i].color.a;

                let L = lightPosition - positionA;
                let distance = length(L);
                if (distance > radius) { continue; }
                let lambert = max(dot(normal, normalize(L)), 0.0);
                lighting += vec3f(lambert * pow(1.0 - distance / radius, 2.0) * lightColor * albedo);
            }

            return vec4(lighting, 1.0);
            // return vec4(normal * 0.5 + 0.5, 1.0); // Normal visualization
            // return vec4(normal, 1.0);
            // return vec4(positionA, 1.0);
        }
        `;
        this.shader = Shader.Create({
            code: code,
            attributes: {
                position: { location: 0, size: 3, type: "vec3" },
                normal: { location: 1, size: 3, type: "vec3" }
            },
            uniforms: {
                textureSampler: { location: 0, type: "storage" },
                positionTexture: { location: 1, type: "storage" },
                albedoTexture: { location: 2, type: "storage" },
                normalTexture: { location: 3, type: "storage" },
                depthTexture: { location: 4, type: "storage" },
                
                lights: { location: 5, type: "storage" },
                lightCount: { location: 6, type: "storage" },
            },
            colorOutputs: [{format: Renderer.SwapChainFormat}]
        });

        this.sampler = TextureSampler.Create();
        this.shader.SetSampler("textureSampler", this.sampler);
        this.quadGeometry = Geometry.Plane();
    }

    public execute(resources: ResourcePool, inputGBufferPosition: RenderTexture, inputGBufferAlbedo: RenderTexture, inputGBufferNormal: RenderTexture, inputGBufferDepth: DepthTexture) {
        const camera = Camera.mainCamera;
        const renderTarget = camera.renderTarget;
        const backgroundColor = camera.backgroundColor;

        RendererContext.BeginRenderPass("LightingPass", [{ clear: true, color: backgroundColor }]);

        // TODO: Should be reactive
        this.shader.SetTexture("positionTexture", inputGBufferPosition);
        this.shader.SetTexture("albedoTexture", inputGBufferAlbedo);
        this.shader.SetTexture("normalTexture", inputGBufferNormal);
        this.shader.SetTexture("depthTexture", inputGBufferDepth);

        const lights = Camera.mainCamera.gameObject.scene.GetComponents(Light);
        const lightBuffer = new Float32Array(lights.length * (4 + 4));
        for (let i = 0; i < lights.length; i++) {
            const light = lights[i];
            lightBuffer.set([
                light.transform.position.x, light.transform.position.y, light.transform.position.z, 
                light.intensity,
                light.color.r, light.color.g, light.color.b,
                light.radius
            ], i * (4 + 4));
        }
        this.shader.SetArray("lights", lightBuffer);
        this.shader.SetArray("lightCount", new Uint32Array([lights.length]));

        RendererContext.DrawGeometry(this.quadGeometry, this.shader);
        RendererContext.EndRenderPass();
    }
}