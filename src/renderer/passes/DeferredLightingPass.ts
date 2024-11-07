import { Shader } from "../Shader";
import { Geometry } from "../../Geometry";
import { DepthTexture, RenderTexture } from "../Texture";
import { TextureSampler } from "../TextureSampler";
import { Camera } from "../../components/Camera";
import { RendererContext } from "../RendererContext";
import { RenderPass, ResourcePool } from "../RenderGraph";
import { AreaLight, DirectionalLight, Light, LightEvents, PointLight, SpotLight } from "../../components/Light";
import { Renderer } from "../Renderer";
import { Matrix4 } from "../../math/Matrix4";
import { Buffer, BufferType } from "../Buffer";
import { Debugger } from "../../plugins/Debugger";
// import { lightsCSMProjectionMatrix } from "./ShadowPass";
import { ShaderLoader } from "../ShaderUtils";
import { PassParams } from "../RenderingPipeline";
import { EventSystem } from "../../Events";

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

    public initialized = false;

    // constructor(inputGBufferAlbedo: string, inputGBufferNormal: string, inputGbufferERMO: string, inputGBufferDepth: string, inputShadowPassDepth: string, outputLightingPass: string) {
    constructor() {
        super({
            inputs: [
                PassParams.DebugSettings,
                PassParams.GBufferAlbedo,
                PassParams.GBufferNormal,
                PassParams.GBufferERMO,
                PassParams.GBufferDepth,
            ],
            outputs: [PassParams.LightingPassOutput] });
        this.init();
    }

    public async init() {
        this.shader = await Shader.Create({
            code: await ShaderLoader.DeferredLighting,
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

                settings: {group: 0, binding: 11, type: "storage"},
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

        EventSystem.on(LightEvents.Updated, component => {
            this.needsUpdate = true;
        })

        this.initialized = true;
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
                ...new Array(16 * 4).fill(0), // ...lightsCSMProjectionMatrix[i],
                ...light.camera.viewMatrix.elements,
                ...light.camera.viewMatrix.clone().invert().elements,
                light.color.r, light.color.g, light.color.b, lightType,
                ...params1,
                ...params2
            ], i * lightBufferSize);
        }


        const lightsLength = Math.max(lights.length, 1);
        if (!this.lightsBuffer || this.lightsBuffer.size !== lightsLength * lightBufferSize * 4) {
            this.lightsBuffer = Buffer.Create(lightsLength * lightBufferSize * 4, BufferType.STORAGE);
            this.lightsCountBuffer = Buffer.Create(1 * 4, BufferType.STORAGE);
        }
        this.lightsBuffer.SetArray(lightBuffer);
        this.lightsCountBuffer.SetArray(new Uint32Array([lights.length]));

        this.shader.SetBuffer("lights", this.lightsBuffer);
        this.shader.SetBuffer("lightCount", this.lightsCountBuffer);
        this.needsUpdate = false;
        console.log("Updating light buffer");
    }

    public execute(resources: ResourcePool) {
        if (!this.initialized) return;
        // Debugger.AddFrameRenderPass("DeferredLightingPass");
        
        // console.log(inputGBufferAlbedo)
        const camera = Camera.mainCamera;

        if (!this.lightsBuffer || !this.lightsCountBuffer || this.needsUpdate) {
            this.updateLightsBuffer();
        }

        const inputGBufferAlbedo = resources.getResource(PassParams.GBufferAlbedo);
        const inputGBufferNormal = resources.getResource(PassParams.GBufferNormal);
        const inputGbufferERMO = resources.getResource(PassParams.GBufferERMO);
        const inputGBufferDepth = resources.getResource(PassParams.GBufferDepth);
        const inputShadowPassDepth = resources.getResource(PassParams.GBufferDepth);

        RendererContext.BeginRenderPass("DeferredLightingPass", [{ target: this.outputLightingPass, clear: true }], undefined, true);

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

        const settings = resources.getResource(PassParams.DebugSettings);
        this.shader.SetArray("settings", settings);
        
        RendererContext.DrawGeometry(this.quadGeometry, this.shader);
        RendererContext.EndRenderPass();

        resources.setResource(PassParams.LightingPassOutput, this.outputLightingPass);
    }
}