import { Shader } from "../Shader";
import { Geometry } from "../../Geometry";
import { DepthTexture, RenderTexture } from "../Texture";
import { TextureSampler } from "../TextureSampler";
import { Camera } from "../../components/Camera";
import { RendererContext } from "../RendererContext";
import { RenderPass, ResourcePool } from "../RenderGraph";
import { AreaLight, DirectionalLight, Light, PointLight, SpotLight } from "../../components/Light";
import { Renderer } from "../Renderer";
import { Matrix4 } from "../../math/Matrix4";
import { EventSystem } from "../../Events";
import { Buffer, BufferType } from "../Buffer";
import { Debugger } from "../../plugins/Debugger";
import { lightsCSMProjectionMatrix } from "./ShadowPass";
import { ShaderCode } from "../ShaderCode";

enum LightType {
    SPOT_LIGHT,
    DIRECTIONAL_LIGHT,
    POINT_LIGHT,
    AREA_LIGHT
};

export class DeferredLightingPass extends RenderPass {
    public name: string = "DeferredLightingPass";
    private shader: Shader;
    private sampler: TextureSampler;
    private quadGeometry: Geometry;

    private lightsBuffer: Buffer;
    private lightsCountBuffer: Buffer;

    private outputLightingPass: RenderTexture;

    private needsUpdate: boolean = false;

    constructor(inputGBufferAlbedo: string, inputGBufferNormal: string, inputGbufferERMO: string, inputGBufferDepth: string, inputShadowPassDepth: string, outputLightingPass: string) {
        super({ inputs: [inputGBufferAlbedo, inputGBufferNormal, inputGbufferERMO, inputGBufferDepth, inputShadowPassDepth], outputs: [outputLightingPass] });

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

                shadowSamplerComp: { group: 0, binding: 10, type: "sampler-compare"},
            },
            colorOutputs: [{format: Renderer.SwapChainFormat}]
        });

        this.sampler = TextureSampler.Create({minFilter: "linear", magFilter: "linear", addressModeU: "clamp-to-edge", addressModeV: "clamp-to-edge"});
        this.shader.SetSampler("textureSampler", this.sampler);

        const shadowSampler = TextureSampler.Create({minFilter: "nearest", magFilter: "nearest", addressModeU: "clamp-to-edge", addressModeV: "clamp-to-edge"});
        this.shader.SetSampler("shadowSampler", shadowSampler);

        const shadowSamplerComp = TextureSampler.Create({minFilter: "linear", magFilter: "linear", compare: "less"});
        this.shader.SetSampler("shadowSamplerComp", shadowSamplerComp);

        this.quadGeometry = Geometry.Plane();

        this.lightsCountBuffer = Buffer.Create(1 * 4, BufferType.STORAGE);

        this.outputLightingPass = RenderTexture.Create(Renderer.width, Renderer.height);

        EventSystem.on("LightUpdated", component => {
            this.needsUpdate = true;
        })

        EventSystem.on("MainCameraUpdated", component => {
            this.needsUpdate = true;
        })
    }

    private updateLightsBuffer() {
        const scene = Camera.mainCamera.gameObject.scene;
        // TODO: Fix, GetComponents(Light)
        const lights = [...scene.GetComponents(SpotLight), ...scene.GetComponents(PointLight), ...scene.GetComponents(DirectionalLight), ...scene.GetComponents(AreaLight)];
        const lightBufferSize = 4 + 16 + (4 * 16) + 16 + 16 + 3 + 1 + 4 + 4;
        const lightBuffer = new Float32Array(Math.max(1, lights.length) * lightBufferSize); // Always ensure one light

        for (let i = 0; i < lights.length; i++) {
            const light = lights[i];
            const params1 = new Float32Array([light.intensity, light.range, 0, 0]);
            const params2 = new Float32Array(4);

            if (light instanceof DirectionalLight) {
                params2.set(light.direction.elements);
            }
            else if (light instanceof SpotLight) {
                params1.set([light.intensity, light.range, light.angle, 0]);
                params2.set(light.direction.elements);
            }

            let lightType: LightType = LightType.SPOT_LIGHT;
            if (light instanceof SpotLight) lightType = LightType.SPOT_LIGHT;
            else if (light instanceof DirectionalLight) lightType = LightType.DIRECTIONAL_LIGHT;
            else if (light instanceof PointLight) lightType = LightType.POINT_LIGHT;
            else if (light instanceof AreaLight) lightType = LightType.AREA_LIGHT;

            lightBuffer.set([
                light.transform.position.x, light.transform.position.y, light.transform.position.z, 1.0,
                ...light.camera.projectionMatrix.elements,
                ...lightsCSMProjectionMatrix[i],
                ...light.camera.viewMatrix.elements,
                ...light.camera.viewMatrix.clone().invert().elements,
                light.color.r, light.color.g, light.color.b, lightType,
                ...params1,
                ...params2
            ], i * lightBufferSize);
        }

        if (!this.lightsBuffer || this.lightsBuffer.size !== lights.length * lightBufferSize * 4) {
            console.log("HERE")
            this.lightsBuffer = Buffer.Create(lights.length * lightBufferSize * 4, BufferType.STORAGE);
            this.lightsCountBuffer = Buffer.Create(1 * 4, BufferType.STORAGE);
        }
        this.lightsBuffer.SetArray(lightBuffer);
        this.lightsCountBuffer.SetArray(new Uint32Array([lights.length]));

        this.shader.SetBuffer("lights", this.lightsBuffer);
        this.shader.SetBuffer("lightCount", this.lightsCountBuffer);
        this.needsUpdate = false;
    }

    public execute(resources: ResourcePool, inputGBufferAlbedo: RenderTexture, inputGBufferNormal: RenderTexture, inputGbufferERMO: RenderTexture, inputGBufferDepth: DepthTexture, inputShadowPassDepth: DepthTexture, outputLightingPass: string) {
        Debugger.AddFrameRenderPass("DeferredLightingPass");
        
        const camera = Camera.mainCamera;

        if (!this.lightsBuffer || !this.lightsCountBuffer || this.needsUpdate) {
            this.updateLightsBuffer();
        }

        RendererContext.BeginRenderPass("DeferredLightingPass", [{ clear: true }]);

        this.shader.SetTexture("albedoTexture", inputGBufferAlbedo);
        this.shader.SetTexture("normalTexture", inputGBufferNormal);
        this.shader.SetTexture("ermoTexture", inputGbufferERMO);
        this.shader.SetTexture("depthTexture", inputGBufferDepth);
        this.shader.SetTexture("shadowPassDepth", inputShadowPassDepth);

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

        resources.setResource(outputLightingPass, this.outputLightingPass);
    }
}