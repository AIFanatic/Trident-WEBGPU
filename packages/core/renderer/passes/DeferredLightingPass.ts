import { Shader } from "../Shader";
import { Geometry } from "../../Geometry";
import { CubeTexture, DepthTexture, DepthTextureArray, RenderTexture } from "../Texture";
import { TextureSampler } from "../TextureSampler";
import { Camera } from "../../components/Camera";
import { RendererContext } from "../RendererContext";
import { RenderPass, ResourcePool } from "../RenderGraph";
import { AreaLight, DirectionalLight, Light, LightEvents, PointLight, SpotLight } from "../../components/Light";
import { Renderer, RendererEvents } from "../Renderer";
import { Buffer, BufferType } from "../Buffer";
import { ShaderLoader } from "../ShaderUtils";
import { PassParams } from "../RenderingPipeline";
import { EventSystem } from "../../Events";
import { LightShadowInfo } from "./DeferredShadowMapPass";
import { DynamicBufferMemoryAllocator } from "../MemoryAllocator";

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
    private gBufferDepthClone: DepthTexture;

    public async init() {
        this.shader = await Shader.Create({
            name: this.name,
            code: await ShaderLoader.DeferredLighting,
            colorOutputs: [{format: "rgba16float", blendMode: "add"}],
            depthOutput: "depth24plus",
            depthWriteEnabled: false,
            // depthCompare: "less-equal",
            // cullMode: "back"

            depthCompare: "greater-equal",
            cullMode: "front"
        });

        this.sampler = TextureSampler.Create({
            minFilter: "linear",
            magFilter: "linear",
            mipmapFilter: "linear",
            addressModeU: "clamp-to-edge",
            addressModeV: "clamp-to-edge"
        });
        this.shader.SetSampler("textureSampler", this.sampler);

        const shadowSamplerComp = TextureSampler.Create({minFilter: "linear", magFilter: "linear", compare: "less"});
        this.shader.SetSampler("shadowSamplerComp", shadowSamplerComp);

        this.quadGeometry = new Geometry();

        this.lightsBuffer = new DynamicBufferMemoryAllocator(120 * 10000);
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
        this.gBufferDepthClone = DepthTexture.Create(Renderer.width, Renderer.height);


        EventSystem.on(LightEvents.Updated, component => {
            this.needsUpdate = true;
        })

        this.initialized = true;
    }

    private updateLightsBuffer(lights: Light[], resources: ResourcePool) {
        if (!this.needsUpdate) return;
        const scene = Camera.mainCamera.gameObject.scene;

        for (let i = 0; i < lights.length; i++) {
            const light = lights[i];
            const params1 = new Float32Array([light.intensity, (light as SpotLight).range, +light.castShadows, -1]);
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
            let cascadeSplits: Float32Array = new Float32Array(4);

            
            const lightsShadowData = resources.getResource(PassParams.ShadowPassCascadeData) as Map<string, LightShadowInfo> | undefined;
            const lightShadowData = lightsShadowData ? lightsShadowData.get(light.id) : undefined;
            if (lightShadowData !== undefined) {
                projectionMatrices = lightShadowData.projectionMatrices;
                cascadeSplits = lightShadowData.cascadeSplits;
                params1[3] = lightShadowData.shadowMapIndex;

                // console.log("HERE", light.id, lightsShadowData, params1)
            }

            const lightData = new Float32Array([
                ...light.transform.localToWorldMatrix.elements,
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

    public async preFrame(resources: ResourcePool) {
        if (!this.initialized) return;
        this.drawCommands.length = 0;
        const camera = Camera.mainCamera;
        
        const scene = camera.gameObject.scene;
        const _lights = scene.GetComponents(Light);
        let lights: Light[] = [];
        for (const light of _lights) {
            if (light.enabled === false || light.gameObject.enabled === false) continue;
            lights.push(light);
        }
        if (lights.length === 0) return;
        this.updateLightsBuffer(lights, resources);

        const inputGBufferAlbedo = resources.getResource(PassParams.GBufferAlbedo);
        const inputGBufferNormal = resources.getResource(PassParams.GBufferNormal);
        const inputGbufferERMO = resources.getResource(PassParams.GBufferERMO);
        const inputGBufferDepth = resources.getResource(PassParams.GBufferDepth);
        const inputShadowPassDepth = resources.getResource(PassParams.ShadowPassDepth) || this.dummyShadowPassDepth;
        const inputFrameBuffer = resources.getResource(PassParams.FrameBuffer);
        if (!inputGBufferAlbedo) return;

        this.shader.SetTexture("albedoTexture", inputGBufferAlbedo);
        this.shader.SetTexture("normalTexture", inputGBufferNormal);
        this.shader.SetTexture("ermoTexture", inputGbufferERMO);
        this.shader.SetTexture("depthTexture", inputGBufferDepth);
        this.shader.SetTexture("shadowPassDepth", inputShadowPassDepth);
        this.shader.SetBuffer("view", inputFrameBuffer);

        const settings = resources.getResource(PassParams.DebugSettings);
        this.shader.SetArray("settings", settings);
        
        // RendererContext.DrawGeometry(this.quadGeometry, this.shader);
        for (let i = 0; i < lights.length; i++) {
            const light = lights[i];
            if (light instanceof DirectionalLight) this.drawCommands.push({geometry: this.plane, shader: this.shader, instanceCount: 1, firstInstance: i});
            if (light instanceof PointLight) this.drawCommands.push({geometry: this.sphere, shader: this.shader, instanceCount: 1, firstInstance: i});
            if (light instanceof SpotLight) this.drawCommands.push({geometry: this.cone, shader: this.shader, instanceCount: 1, firstInstance: i});
        }
    }

    private plane = Geometry.Plane();
    private sphere = Geometry.Sphere();
    private cone = Geometry.Cone();

    public async execute(resources: ResourcePool) {
        if (!this.initialized) return;
        if (this.drawCommands.length === 0) return;

        const GBufferDepth = resources.getResource(PassParams.GBufferDepth);
        if (!GBufferDepth) return;
        if (this.gBufferDepthClone.width !== GBufferDepth.width || this.gBufferDepthClone.height !== GBufferDepth.height) {
            this.gBufferDepthClone.Destroy();
            this.gBufferDepthClone = DepthTexture.Create(GBufferDepth.width, GBufferDepth.height, GBufferDepth.depth, GBufferDepth.format);
        }
        RendererContext.CopyTextureToTextureV3({texture: GBufferDepth}, {texture: this.gBufferDepthClone});

        // RendererContext.BeginRenderPass("DeferredLightingPass", [{ target: this.outputLightingPass, clear: true }]);
        // RendererContext.EndRenderPass();
        
        RendererContext.BeginRenderPass("DeferredLightingPass", [{ target: this.outputLightingPass, clear: false }], {target: this.gBufferDepthClone, clear: false}, true);

        for (const draw of this.drawCommands) {
            RendererContext.DrawGeometry(draw.geometry, draw.shader, draw.instanceCount, draw.firstInstance);
        }

        RendererContext.EndRenderPass();

        resources.setResource(PassParams.LightingPassOutput, this.outputLightingPass);
        resources.setResource(PassParams.LightsBuffer, this.lightsBuffer);
    }
}
