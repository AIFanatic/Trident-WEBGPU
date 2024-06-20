import { Shader, ShaderCode } from "../Shader";
import { Geometry } from "../../Geometry";
import { DepthTexture, RenderTexture } from "../Texture";
import { TextureSampler } from "../TextureSampler";
import { Camera } from "../../components/Camera";
import { RendererContext } from "../RendererContext";
import { RenderPass, ResourcePool } from "../RenderGraph";
import { Light } from "../../components/Light";
import { Renderer } from "../Renderer";
import { Matrix4 } from "../../math/Matrix4";

export class DeferredLightingPass extends RenderPass {
    public name: string = "DeferredLightingPass";
    private shader: Shader;
    private sampler: TextureSampler;
    private quadGeometry: Geometry;

    constructor(inputGBufferAlbedo: string, inputGBufferNormal: string, inputGbufferERMO: string, inputGBufferDepth: string, inputShadowPassDepth: string) {
        super({ inputs: [inputGBufferAlbedo, inputGBufferNormal, inputGbufferERMO, inputGBufferDepth, inputShadowPassDepth] });

        this.shader = Shader.Create({
            code: ShaderCode.DeferredLightingPBRShader,
            attributes: {
                position: { location: 0, size: 3, type: "vec3" },
                normal: { location: 1, size: 3, type: "vec3" },
                uv: { location: 2, size: 2, type: "vec2" }
            },
            uniforms: {
                textureSampler: { group: 0, binding: 0, type: "sampler" },
                albedoTexture: { group: 0, binding: 1, type: "texture" },
                normalTexture: { group: 0, binding: 2, type: "texture" },
                ermoTexture: { group: 0, binding: 3, type: "texture" },
                depthTexture: { group: 0, binding: 4, type: "depthTexture" },
                shadowPassDepth: { group: 0, binding: 5, type: "depthTexture" },
                
                lights: { group: 0, binding: 6, type: "storage" },
                lightCount: { group: 0, binding: 7, type: "storage" },

                view: { group: 0, binding: 8, type: "storage" },
                
                shadowSampler: { group: 0, binding: 9, type: "sampler"},
            },
            colorOutputs: [{format: Renderer.SwapChainFormat}]
        });

        this.sampler = TextureSampler.Create({minFilter: "linear", magFilter: "linear"});
        this.shader.SetSampler("textureSampler", this.sampler);

        const shadowSampler = TextureSampler.Create({minFilter: "nearest", magFilter: "nearest", addressModeU: "clamp-to-edge", addressModeV: "clamp-to-edge"});
        this.shader.SetSampler("shadowSampler", shadowSampler);

        this.quadGeometry = Geometry.Plane();
    }

    public execute(resources: ResourcePool, inputGBufferAlbedo: RenderTexture, inputGBufferNormal: RenderTexture, inputGbufferERMO: RenderTexture, inputGBufferDepth: DepthTexture, inputShadowPassDepth: DepthTexture) {
        const camera = Camera.mainCamera;
        const renderTarget = camera.renderTarget;
        const backgroundColor = camera.backgroundColor;

        RendererContext.BeginRenderPass("DeferredLightingPass", [{ clear: true, color: backgroundColor }]);

        this.shader.SetTexture("albedoTexture", inputGBufferAlbedo);
        this.shader.SetTexture("normalTexture", inputGBufferNormal);
        this.shader.SetTexture("ermoTexture", inputGbufferERMO);
        this.shader.SetTexture("depthTexture", inputGBufferDepth);
        this.shader.SetTexture("shadowPassDepth", inputShadowPassDepth);
        
        // TODO: Should be reactive
        const lights = Camera.mainCamera.gameObject.scene.GetComponents(Light);
        const lightBufferSize = 4 + 16 + 16 + 3 + 1;
        const lightBuffer = new Float32Array(Math.max(1, lights.length) * lightBufferSize); // Always ensure one light

        
        for (let i = 0; i < lights.length; i++) {
            const light = lights[i];
            // const temp = new Matrix4().copy(light.transform.lo)
            lightBuffer.set([
                light.transform.position.x, light.transform.position.y, light.transform.position.z, 1.0,
                ...light.camera.projectionMatrix.elements,
                ...light.camera.viewMatrix.elements,
                light.color.r, light.color.g, light.color.b,
                light.intensity
            ], i * lightBufferSize);
        }
        this.shader.SetArray("lights", lightBuffer);
        this.shader.SetArray("lightCount", new Uint32Array([lights.length]));

        const view = new Float32Array(4 + 4 + 16 + 16);
        view.set([Renderer.width, Renderer.height, 0], 0);
        view.set(camera.transform.position.elements, 4);
        // console.log(view)
        const tempMatrix = new Matrix4();
        tempMatrix.copy(camera.projectionMatrix).invert();
        view.set(tempMatrix.elements, 8);
        tempMatrix.copy(camera.viewMatrix).invert();
        view.set(tempMatrix.elements, 24);

        this.shader.SetArray("view", view);
        
        RendererContext.DrawGeometry(this.quadGeometry, this.shader);
        RendererContext.EndRenderPass();
    }
}