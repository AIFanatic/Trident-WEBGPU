import { Shader } from "../Shader";
import { Geometry } from "../../Geometry";
import { CubeTexture, DepthTextureArray, RenderTexture } from "../Texture";
import { TextureSampler } from "../TextureSampler";
import { Camera } from "../../components/Camera";
import { RendererContext } from "../RendererContext";
import { RenderPass, ResourcePool } from "../RenderGraph";
import { AreaLight, DirectionalLight, Light, LightEvents, PointLight, SpotLight } from "../../components/Light";
import { Renderer, RendererEvents } from "../Renderer";
import { Matrix4 } from "../../math/Matrix4";
import { Buffer, BufferType } from "../Buffer";
import { ShaderLoader } from "../ShaderUtils";
import { PassParams } from "../RenderingPipeline";
import { EventSystem } from "../../Events";
import { LightShadowData } from "./DeferredShadowMapPass";
import { DynamicBufferMemoryAllocator } from "../MemoryAllocator";

import { Vector4 } from "../../math";

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

    private lightsBuffer: DynamicBufferMemoryAllocator;
    private lightsCountBuffer: Buffer;

    private outputLightingPass: RenderTexture;

    private needsUpdate: boolean = true;

    public initialized = false;

    private dummyShadowPassDepth: RenderTexture;

    constructor() {
        super({
            inputs: [
                PassParams.DebugSettings,
                PassParams.GBufferAlbedo,
                PassParams.GBufferNormal,
                PassParams.GBufferERMO,
                PassParams.GBufferDepth,
                PassParams.ShadowPassDepth,
                PassParams.ShadowPassCascadeData,
            ],
            outputs: [PassParams.LightingPassOutput] });
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
                
                skyboxTexture: { group: 0, binding: 6, type: "texture" },
                skyboxIrradianceTexture: { group: 0, binding: 7, type: "texture" },
                skyboxPrefilterTexture: { group: 0, binding: 8, type: "texture" },
                skyboxBRDFLUTTexture: { group: 0, binding: 9, type: "texture" },

                brdfSampler: { group: 0, binding: 10, type: "sampler" },
                
                lights: { group: 0, binding: 11, type: "storage" },
                lightCount: { group: 0, binding: 12, type: "storage" },

                view: { group: 0, binding: 13, type: "storage" },
                
                shadowSamplerComp: { group: 0, binding: 14, type: "sampler-compare"},

                settings: {group: 0, binding: 15, type: "storage"},
            },
            colorOutputs: [{format: "rgba16float"}],
        });

        this.sampler = TextureSampler.Create({
            minFilter: "linear",
            magFilter: "linear",
            mipmapFilter: "linear",
            addressModeU: "clamp-to-edge",
            addressModeV: "clamp-to-edge"
        });
        this.shader.SetSampler("textureSampler", this.sampler);

        const brdfSampler = TextureSampler.Create({
            minFilter: "linear",
            magFilter: "linear",
            addressModeU: "repeat",
            addressModeV: "repeat"
        });
        this.shader.SetSampler("brdfSampler", brdfSampler);

        const shadowSamplerComp = TextureSampler.Create({minFilter: "linear", magFilter: "linear", compare: "less"});
        this.shader.SetSampler("shadowSamplerComp", shadowSamplerComp);

        this.quadGeometry = Geometry.Plane();

        this.lightsBuffer = new DynamicBufferMemoryAllocator(120 * 10);
        this.lightsCountBuffer = Buffer.Create(1 * 4, BufferType.STORAGE);

        this.shader.SetBuffer("lights", this.lightsBuffer.getBuffer());
        this.shader.SetBuffer("lightCount", this.lightsCountBuffer);

        this.outputLightingPass = RenderTexture.Create(Renderer.width, Renderer.height, 1, "rgba16float");

        EventSystem.on(RendererEvents.Resized, canvas => {
            this.outputLightingPass.Destroy();
            this.outputLightingPass = RenderTexture.Create(Renderer.width, Renderer.height, 1, "rgba16float");
        })

        // If there are no lights in the scene this is used instead
        this.dummyShadowPassDepth = DepthTextureArray.Create(1, 1, 1);


        EventSystem.on(LightEvents.Updated, component => {
            this.needsUpdate = true;
        })

        this.initialized = true;
    }

    private updateLightsBuffer(lights: Light[], resources: ResourcePool) {
        const scene = Camera.mainCamera.gameObject.scene;

        for (let i = 0; i < lights.length; i++) {
            const light = lights[i];
            const params1 = new Float32Array([light.intensity, light.range, +light.castShadows, -1]);
            const params2 = new Float32Array(4);

            if (light instanceof DirectionalLight) {
                params2.set(light.direction.elements);
            }
            else if (light instanceof SpotLight) {
                // params1.set([light.intensity, light.range, light.angle, 0]);
                params2.set(light.direction.elements);
                params2.set([light.angle], 3);
            }

            let lightType: LightType = LightType.SPOT_LIGHT;
            if (light instanceof SpotLight) lightType = LightType.SPOT_LIGHT;
            else if (light instanceof DirectionalLight) lightType = LightType.DIRECTIONAL_LIGHT;
            else if (light instanceof PointLight) lightType = LightType.POINT_LIGHT;
            else if (light instanceof AreaLight) lightType = LightType.AREA_LIGHT;

            let projectionMatrices: Float32Array = new Float32Array(16 * 4);
            let cascadeSplits = new Float32Array(4);

            
            const lightsShadowData = resources.getResource(PassParams.ShadowPassCascadeData) as Map<string, LightShadowData> | undefined;
            const lightShadowData = lightsShadowData ? lightsShadowData.get(light.id) : undefined;
            if (lightShadowData !== undefined) {
                projectionMatrices = lightShadowData.projectionMatrices;
                cascadeSplits = lightShadowData.cascadeSplits;
                params1[3] = lightShadowData.shadowMapIndex;

                // console.log("HERE", light.id, lightsShadowData, params1)
            }


            // position: vec4<f32>,
            // projectionMatrix: mat4x4<f32>,
            // // // Using an array of mat4x4 causes the render time to go from 3ms to 9ms for some reason
            // // csmProjectionMatrix: array<mat4x4<f32>, 4>,
            // csmProjectionMatrix0: mat4x4<f32>,
            // csmProjectionMatrix1: mat4x4<f32>,
            // csmProjectionMatrix2: mat4x4<f32>,
            // csmProjectionMatrix3: mat4x4<f32>,
            // cascadeSplits: vec4<f32>,
            // viewMatrix: mat4x4<f32>,
            // direction: vec4<f32>,
            // color: vec4<f32>,
            // params1: vec4<f32>,
            // params2: vec4<f32>,
        
            const lightData = new Float32Array([
                light.transform.position.x, light.transform.position.y, light.transform.position.z, 1.0,
                ...light.camera.projectionMatrix.elements,
                // ...lightsCSMProjectionMatrix[i].slice(0, 16 * 4),
                ...projectionMatrices,
                ...cascadeSplits,
                ...light.camera.viewMatrix.elements,
                ...light.camera.viewMatrix.clone().invert().elements,
                // ...new Vector4(0,0,1,0).applyMatrix4(light.camera.viewMatrix.clone().invert()).normalize().elements,
                light.color.r, light.color.g, light.color.b, lightType,
                ...params1,
                ...params2
            ])

            this.lightsBuffer.set(light.id, lightData);
        }

        this.lightsCountBuffer.SetArray(new Uint32Array([lights.length]));

        // Need to keep rebinding the buffer since its dynamic
        this.shader.SetBuffer("lights", this.lightsBuffer.getBuffer());
        this.needsUpdate = false;
        // console.log("Updating light buffer");
    }

    public execute(resources: ResourcePool) {
        if (!this.initialized) return;
        // if (!Camera.mainCamera) return;
        // Debugger.AddFrameRenderPass("DeferredLightingPass");
        
        const camera = Camera.mainCamera;

        
        if (this.needsUpdate) {
        }
        const scene = camera.gameObject.scene;
        const lights = [...scene.GetComponents(Light), ...scene.GetComponents(PointLight), ...scene.GetComponents(DirectionalLight), ...scene.GetComponents(SpotLight), ...scene.GetComponents(AreaLight)];
        if (lights.length === 0) return;
        this.updateLightsBuffer(lights, resources);

        const inputGBufferAlbedo = resources.getResource(PassParams.GBufferAlbedo);
        const inputGBufferNormal = resources.getResource(PassParams.GBufferNormal);
        const inputGbufferERMO = resources.getResource(PassParams.GBufferERMO);
        const inputGBufferDepth = resources.getResource(PassParams.GBufferDepth);
        const inputShadowPassDepth = resources.getResource(PassParams.ShadowPassDepth) || this.dummyShadowPassDepth;
        const inputSkybox = resources.getResource(PassParams.Skybox) as CubeTexture;
        const inputSkyboxIrradiance = resources.getResource(PassParams.SkyboxIrradiance) as CubeTexture;
        const inputSkyboxPrefilter = resources.getResource(PassParams.SkyboxPrefilter) as CubeTexture;
        const inputSkyboxBRDFLUT = resources.getResource(PassParams.SkyboxBRDFLUT) as RenderTexture;


        RendererContext.BeginRenderPass("DeferredLightingPass", [{ target: this.outputLightingPass, clear: true }], undefined, true);

        this.shader.SetTexture("albedoTexture", inputGBufferAlbedo);
        this.shader.SetTexture("normalTexture", inputGBufferNormal);
        this.shader.SetTexture("ermoTexture", inputGbufferERMO);
        this.shader.SetTexture("depthTexture", inputGBufferDepth);
        this.shader.SetTexture("shadowPassDepth", inputShadowPassDepth);

        this.shader.SetTexture("skyboxTexture", inputSkybox);
        this.shader.SetTexture("skyboxIrradianceTexture", inputSkyboxIrradiance);
        this.shader.SetTexture("skyboxPrefilterTexture", inputSkyboxPrefilter);
        this.shader.SetTexture("skyboxBRDFLUTTexture", inputSkyboxBRDFLUT);

        const view = new Float32Array(4 + 4 + 16 + 16   + 16);
        view.set([Renderer.width, Renderer.height, 0], 0);
        view.set(camera.transform.position.elements, 4);
        // console.log(view)
        const tempMatrix = new Matrix4();
        tempMatrix.copy(camera.projectionMatrix).invert();
        view.set(tempMatrix.elements, 8);
        tempMatrix.copy(camera.viewMatrix).invert();
        view.set(tempMatrix.elements, 24);
        view.set(camera.viewMatrix.elements, 40);

        this.shader.SetArray("view", view);

        const settings = resources.getResource(PassParams.DebugSettings);
        this.shader.SetArray("settings", settings);
        
        RendererContext.DrawGeometry(this.quadGeometry, this.shader);
        RendererContext.EndRenderPass();

        resources.setResource(PassParams.LightingPassOutput, this.outputLightingPass);
    }
}