import { Camera } from "../../components/Camera";
import { RendererContext } from "../RendererContext";
import { RenderPass, ResourcePool } from "../RenderGraph";
import { PassParams } from "../RenderingPipeline";
import { AreaLight, DirectionalLight, Light, PointLight, SpotLight } from "../../components/Light";
import { Renderable } from "../../components/Renderable";
import { SkinnedMesh } from "../../components/SkinnedMesh";
import { Shader } from "../Shader";

import { Buffer, BufferType, DynamicBuffer } from "../Buffer";
import { Matrix4 } from "../../math/Matrix4";
import { EventSystemLocal } from "../../Events";
import { TransformEvents } from "../../components/Transform";
import { Vector3 } from "../../math/Vector3";
import { DepthTextureArray } from "../Texture";
import { Console, ConsoleVarConfigs } from "../../Console";

interface LightShadowInfoBase {
    numCascades: number;
    projectionMatrices: Float32Array;
    cascadeSplits: Float32Array;
    cascadeViewports: PreparedShadowViewport[];
}

export interface LightShadowInfo extends LightShadowInfoBase {
    shadowMapIndex: number;
    lightOffset: number;
};

interface PreparedShadowViewport {
    x: number;
    y: number;
    width: number;
    height: number;
}

interface Cascade {
    splitDepth: number;
    viewProjMatrix: Matrix4;
}

type InstancedRenderable = Renderable & {
    matricesBuffer: Buffer;
    instanceCount: number;
    geometry?: any;
};

const isInstancedRenderable = (renderable: Renderable): renderable is InstancedRenderable => {
    return (renderable as any).matricesBuffer !== undefined && (renderable as any).instanceCount !== undefined;
};

export const ShadowMapSettings = Console.define({
    r_shadows_width: { default: 2048, help: "Shadow map width" },
    r_shadows_height: { default: 2048, help: "Shadow map height" },
    r_shadows_enabled: { default: true, help: "Enable Shadows" },
    r_shadows_pcfResolution: { default: 3, help: "Shadows Percentage-Closer Filtering, the higher the value the softer the shadows." },
    r_shadows_maxShadowDistance: { default: 2000, help: "Maximum distance to show shadows" },
    r_shadows_csm_roundToPixelSizeValue: { default: true, help: "Round CSM to nearest pixel, helps with shimmering CSM's" },
    r_shadows_csm_blendThresholdValue: { default: 0.3, help: "How much percentage to blend between cascades" },
    r_shadows_csm_numOfCascades: { default: 4, help: "How many cascades, to use" },
    r_shadows_csm_splitType: { default: "practical" as "uniform" | "log" | "practical", help: "Type of split between cascades (uniform | log | practical)" },
    r_shadows_csm_splitTypePracticalLambda: { default: 0.9, help: "When using splitType practical how much to blend between uniform and log types" },
} satisfies ConsoleVarConfigs);

export class DeferredShadowMapPass extends RenderPass {
    public name: string = "DeferredShadowMapPass";

    private drawInstancedShadowShader: Shader;
    private drawShadowShader: Shader;
    private drawSkinnedMeshShadowShader: Shader;

    private modelMatrices: DynamicBuffer;

    private lightProjectionMatrices: DynamicBuffer;
    private cascadeIndexBuffer: DynamicBuffer;

    private lightShadowData: Map<string, LightShadowInfo> = new Map();

    private shadowOutput: DepthTextureArray;

    private skinnedBoneMatricesBuffer: Buffer;

    private preparedRenderables: Renderable[] = [];
    private preparedInstancedMeshes: InstancedRenderable[] = [];


    // TODO: Clean this, csmSplits here to be used by debugger plugin
    public csmSplits: number[] = [0, 0, 0, 0];

    public async init(resources: ResourcePool) {
        const code = `
        struct VertexInput {
            @builtin(instance_index) instanceIdx : u32, 
            @location(0) position : vec3<f32>,
        };
        
        struct VertexOutput {
            @builtin(position) position : vec4<f32>,
        };
        
        @group(0) @binding(0) var<storage, read> projectionMatrix: array<mat4x4<f32>, 4>;
        @group(0) @binding(1) var<storage, read> cascadeIndex: u32;
        
        @group(1) @binding(0) var<storage, read> modelMatrix: array<mat4x4<f32>>;

        @vertex
        fn vertexMain(input: VertexInput) -> @builtin(position) vec4<f32> {
            var output : VertexOutput;

            let modelMatrixInstance = modelMatrix[input.instanceIdx];
            let lightProjectionViewMatrix = projectionMatrix[cascadeIndex];
        
            return lightProjectionViewMatrix * modelMatrixInstance * vec4(input.position, 1.0);
        }
        
        @fragment
        fn fragmentMain() -> @location(0) vec4<f32> {
            return vec4(1.0);
        }
        `;
        this.drawShadowShader = await Shader.Create({
            code: code,
            colorOutputs: [],
            depthOutput: "depth24plus",
            cullMode: "front",
        })

        this.drawInstancedShadowShader = await Shader.Create({
            code: code,
            colorOutputs: [],
            depthOutput: "depth24plus",
            cullMode: "front",
        });

        this.drawSkinnedMeshShadowShader = await Shader.Create({
            code: `
            struct VertexInput {
                @builtin(instance_index) instanceIdx : u32, 
                @location(0) position : vec3<f32>,
                @location(1) joints: vec4<u32>,
                @location(2) weights: vec4<f32>,
            };
            
            struct VertexOutput {
                @builtin(position) position : vec4<f32>,
            };
            
            @group(0) @binding(0) var<storage, read> projectionMatrix: array<mat4x4<f32>, 4>;
            @group(0) @binding(1) var<storage, read> cascadeIndex: u32;
            
            @group(1) @binding(0) var<storage, read> modelMatrix: array<mat4x4<f32>>;
            @group(1) @binding(1) var<storage, read> boneMatrices: array<mat4x4<f32>>;
    
            @vertex
            fn vertexMain(input: VertexInput) -> @builtin(position) vec4<f32> {
                var output : VertexOutput;

                let skinMatrix: mat4x4<f32> = 
                boneMatrices[input.joints[0]] * input.weights[0] +
                boneMatrices[input.joints[1]] * input.weights[1] +
                boneMatrices[input.joints[2]] * input.weights[2] +
                boneMatrices[input.joints[3]] * input.weights[3];
            
                let finalPosition = skinMatrix * vec4(input.position, 1.0);
    
                let modelMatrixInstance = modelMatrix[input.instanceIdx];
                let lightProjectionViewMatrix = projectionMatrix[cascadeIndex];
            
                return lightProjectionViewMatrix * modelMatrixInstance * finalPosition;
            }
            
            @fragment
            fn fragmentMain() -> @location(0) vec4<f32> {
                return vec4(1.0);
            }
            `,
            colorOutputs: [],
            depthOutput: "depth24plus",
            cullMode: "front",
        });

        // 100 matrices 6.4Kb
        this.skinnedBoneMatricesBuffer = Buffer.Create(16 * 100 * 4, BufferType.STORAGE);
        this.drawSkinnedMeshShadowShader.SetBuffer("boneMatrices", this.skinnedBoneMatricesBuffer);

        this.shadowOutput = DepthTextureArray.Create(ShadowMapSettings.r_shadows_width.value, ShadowMapSettings.r_shadows_height.value, 1);

        this.initialized = true;
    }

    public frustumData: { corners: Vector3[], lightMatrix: Matrix4, cameraMatrix: Matrix4, frustumCenters: Vector3[] };

    private getCornersForCascade(camera: Camera, cascadeNear: number, cascadeFar: number): Vector3[] {
        const projectionMatrix = new Matrix4().perspectiveZO(camera.fov * (Math.PI / 180), camera.aspect, cascadeNear, cascadeFar);

        let frustumCorners: Vector3[] = [
            new Vector3(-1.0, 1.0, 0.0),
            new Vector3(1.0, 1.0, 0.0),
            new Vector3(1.0, -1.0, 0.0),
            new Vector3(-1.0, -1.0, 0.0),
            new Vector3(-1.0, 1.0, 1.0),
            new Vector3(1.0, 1.0, 1.0),
            new Vector3(1.0, -1.0, 1.0),
            new Vector3(-1.0, -1.0, 1.0),
        ];

        const invViewProj = projectionMatrix.clone().mul(camera.viewMatrix).invert();
        for (let i = 0; i < 8; i++) frustumCorners[i].applyMatrix4(invViewProj);

        return frustumCorners;
    }

    private uniformSplit(numOfCascades: number, near: number, far: number, target: number[]) {
        for (let i = 1; i < numOfCascades; i++) target.push((near + (far - near) * i / numOfCascades) / far);
        target.push(1);
    }

    private logarithmicSplit(numOfCascades: number, near: number, far: number, target: number[]) {
        for (let i = 1; i < numOfCascades; i++) target.push((near * (far / near) ** (i / numOfCascades)) / far);
        target.push(1);
    }

    private practicalSplit(numOfCascades: number, near: number, far: number, lambda: number, target: number[]) {
        const lerp = (x: number, y: number, t: number) => (1 - t) * x + t * y;

        const _uniformArray = [];
        const _logArray = [];
        this.logarithmicSplit(numOfCascades, near, far, _logArray);
        this.uniformSplit(numOfCascades, near, far, _uniformArray);

        for (let i = 1; i < numOfCascades; i++) target.push(lerp(_uniformArray[i - 1], _logArray[i - 1], lambda));
        target.push(1);
    }

    private getCascadeSplits(cascadeCount: number, near: number, far: number): number[] {
        let CASCADE_DISTANCES: number[] = [];
        if (ShadowMapSettings.r_shadows_csm_splitType.value === "uniform") this.uniformSplit(cascadeCount, near, far, CASCADE_DISTANCES);
        if (ShadowMapSettings.r_shadows_csm_splitType.value === "log") this.logarithmicSplit(cascadeCount, near, far, CASCADE_DISTANCES);
        if (ShadowMapSettings.r_shadows_csm_splitType.value === "practical") this.practicalSplit(cascadeCount, near, far, ShadowMapSettings.r_shadows_csm_splitTypePracticalLambda.value, CASCADE_DISTANCES);
        for (let i = 0; i < cascadeCount; i++) CASCADE_DISTANCES[i] *= far; // TODO: Shouldn't have to do this

        return CASCADE_DISTANCES;
    }

    private getCascadeProjectionMatrices(cascadeSplits: number[], camera: Camera, cascadeCount: number, light: Light): Matrix4[] {
        let cascadeProjectionMatrices: Matrix4[] = [];

        this.frustumData = { corners: [], lightMatrix: new Matrix4(), cameraMatrix: new Matrix4(), frustumCenters: [] };

        for (let i = 0; i < cascadeCount; i++) {

            const cascadeNear = i === 0 ? camera.near : cascadeSplits[i - 1];
            const cascadeFar = cascadeSplits[i];
            const frustumCorners = this.getCornersForCascade(camera, cascadeNear, cascadeFar);
            const frustumCenter = new Vector3(0, 0, 0);

            // Compute center of frustum corners
            for (let i = 0; i < frustumCorners.length; i++) {
                frustumCenter.add(frustumCorners[i]);
            }
            frustumCenter.mul(1 / frustumCorners.length);

            let radius = 0;
            for (let i = 0; i < 8; i++) radius = Math.max(radius, frustumCorners[i].clone().sub(frustumCenter).length());
            radius = Math.round(radius * 100) / 100; // 0.1 world unit precision

            const lightDirection = light.transform.position.clone().mul(-1).normalize();

            const up = Math.abs(lightDirection.dot(new Vector3(0, 1, 0))) > 0.99 ? new Vector3(0, 0, 1) : new Vector3(0, 1, 0);

            if (ShadowMapSettings.r_shadows_csm_roundToPixelSizeValue.value) {
                const cascadeRes = ShadowMapSettings.r_shadows_width.value / 2; // 2048
                const worldUnitsPerTexel = (radius * 2.0) / cascadeRes;

                const lightBasis = new Matrix4().lookAt(new Vector3(0, 0, 0), lightDirection, up);
                const inv = lightBasis.clone().invert();

                const c = frustumCenter.clone().applyMatrix4(lightBasis);

                c.x = Math.round(c.x / worldUnitsPerTexel) * worldUnitsPerTexel;
                c.y = Math.round(c.y / worldUnitsPerTexel) * worldUnitsPerTexel;

                frustumCenter.copy(c.applyMatrix4(inv));
            }

            const eye = frustumCenter.clone().sub(lightDirection.clone().mul(-radius));
            const lightViewMatrix = new Matrix4();
            lightViewMatrix.lookAt(eye, frustumCenter, up);

            const lightProjMatrix = new Matrix4().orthoZO(-radius, radius, -radius, radius, -radius * 2, 0);
            const viewProjMatrix = lightProjMatrix.clone().mul(lightViewMatrix);

            this.frustumData.corners.push(...frustumCorners);
            this.frustumData.cameraMatrix = camera.projectionMatrix.clone().mul(camera.viewMatrix);
            this.frustumData.lightMatrix = viewProjMatrix;
            this.frustumData.frustumCenters.push(frustumCenter);

            cascadeProjectionMatrices.push(viewProjMatrix);
        }

        return cascadeProjectionMatrices;
    }

    private prepareCascadedShadowMap(light: Light): LightShadowInfoBase {
        const camera = Camera.mainCamera;
        const numOfCascades = ShadowMapSettings.r_shadows_csm_numOfCascades.value;
        const cascadeSplits = this.getCascadeSplits(numOfCascades, camera.near, Math.min(camera.far, ShadowMapSettings.r_shadows_maxShadowDistance.value));
        this.csmSplits = cascadeSplits;
        const cascadeProjectionMatrices = this.getCascadeProjectionMatrices(cascadeSplits, camera, numOfCascades, light);
        const projectionMatrices = new Float32Array(cascadeProjectionMatrices.flatMap(m => [...m.elements]));
        let cascadeViewports: PreparedShadowViewport[] = [];
        const halfWidth = this.shadowOutput.width / 2;
        const halfHeight = this.shadowOutput.height / 2;
        for (let cascadeIndex = 0; cascadeIndex < numOfCascades; cascadeIndex++) {
            let x = 0;
            let y = 0;
            if (cascadeIndex >= 2) x += halfWidth;
            if (cascadeIndex & 1) y += halfHeight;
            cascadeViewports.push({ x, y, width: halfWidth, height: halfHeight });
        }

        return { numCascades: numOfCascades, projectionMatrices: projectionMatrices, cascadeSplits: new Float32Array(cascadeSplits), cascadeViewports: cascadeViewports };
    }

    private prepareShadowMap(light: Light): LightShadowInfoBase {
        const numOfCascades = 1;
        const vp = light.camera.projectionMatrix.clone().mul(light.camera.viewMatrix);
        const projectionMatrices = new Float32Array([vp, vp, vp, vp].flatMap(m => [...m.elements]));
        const cascadeSplits = [0, 0, 0, 0];
        const cascadeViewports = [{ x: 0, y: 0, width: this.shadowOutput.width, height: this.shadowOutput.height }];

        return { numCascades: numOfCascades, projectionMatrices: projectionMatrices, cascadeSplits: new Float32Array(cascadeSplits), cascadeViewports: cascadeViewports };
    }

    private ensureBuffers(lightCount: number) {
        if (!this.shadowOutput || this.shadowOutput.depth !== lightCount) {
            this.shadowOutput = DepthTextureArray.Create(ShadowMapSettings.r_shadows_width.value, ShadowMapSettings.r_shadows_height.value, lightCount);
        }

        const cascadeCapacity = ShadowMapSettings.r_shadows_csm_numOfCascades.value;
        const dynamicBufferBaseCapacity = cascadeCapacity * 4 * 256;
        const requiredProjectionSize = lightCount * dynamicBufferBaseCapacity; // Dynamic buffer

        if (!this.lightProjectionMatrices || this.lightProjectionMatrices.size !== requiredProjectionSize) {
            this.lightProjectionMatrices = DynamicBuffer.Create(requiredProjectionSize, BufferType.STORAGE, 256);

            this.drawShadowShader.SetBuffer("projectionMatrix", this.lightProjectionMatrices);
            this.drawSkinnedMeshShadowShader.SetBuffer("projectionMatrix", this.lightProjectionMatrices);
            this.drawInstancedShadowShader.SetBuffer("projectionMatrix", this.lightProjectionMatrices);
        }

        if (!this.cascadeIndexBuffer || this.cascadeIndexBuffer.size !== dynamicBufferBaseCapacity) {
            this.cascadeIndexBuffer = DynamicBuffer.Create(dynamicBufferBaseCapacity, BufferType.STORAGE, 256);
            for (let i = 0; i < cascadeCapacity; i++) {
                this.cascadeIndexBuffer.SetArray(new Uint32Array([i]), i * 256);
            }

            this.drawShadowShader.SetBuffer("cascadeIndex", this.cascadeIndexBuffer);
            this.drawSkinnedMeshShadowShader.SetBuffer("cascadeIndex", this.cascadeIndexBuffer);
            this.drawInstancedShadowShader.SetBuffer("cascadeIndex", this.cascadeIndexBuffer);
        }
    }

    private prepareRenderables() {
        const renderables: Renderable[] = []
        for (const [id, r] of Renderable.Renderables) {
            if (r.enableShadows && r.enabled && r.gameObject.enabled && r.geometry && r.geometry.attributes?.has("position")) renderables.push(r);
        }

        const shadowCasters = renderables.filter(r => !isInstancedRenderable(r));
        const instancedMeshes = renderables.filter(r => isInstancedRenderable(r) && r.instanceCount > 0) as InstancedRenderable[];

        if (shadowCasters.length > 0) {
            const requiredSize = shadowCasters.length * 256;
            if (!this.modelMatrices || this.modelMatrices.size !== requiredSize) {
                this.modelMatrices = DynamicBuffer.Create(requiredSize, BufferType.STORAGE, 256);
                this.drawShadowShader.SetBuffer("modelMatrix", this.modelMatrices);
                this.drawSkinnedMeshShadowShader.SetBuffer("modelMatrix", this.modelMatrices);
            }

            for (let i = 0; i < shadowCasters.length; i++) {
                this.modelMatrices.SetArray(shadowCasters[i].transform.localToWorldMatrix.elements, i * 256);
            }
        }
        this.preparedRenderables = shadowCasters;
        this.preparedInstancedMeshes = instancedMeshes;
    }

    public async preFrame(resources: ResourcePool) {
        if (!this.initialized) return;
        const mainCamera = Camera.mainCamera;
        if (!mainCamera) return;
        if (!ShadowMapSettings.r_shadows_enabled) return;

        const scene = mainCamera.gameObject.scene;
        this.lightShadowData.clear();
        this.preparedRenderables.length = 0;
        this.preparedInstancedMeshes.length = 0;

        const lights = scene.GetComponents(Light).filter(light => light.castShadows === true);

        if (lights.length === 0 ) return;

        this.ensureBuffers(lights.length);
        this.prepareRenderables();

        let shadowLayer = 0;
        for (let i = 0; i < lights.length; i++) {
            const light = lights[i];

            EventSystemLocal.emit(TransformEvents.Updated, light.transform);

            let preparedLight: LightShadowInfoBase = undefined;
            if (light instanceof DirectionalLight) preparedLight = this.prepareCascadedShadowMap(light);
            else if (light instanceof SpotLight) preparedLight = this.prepareShadowMap(light);
            else {
                shadowLayer++;
                continue;
            }

            const cascadeCapacity = ShadowMapSettings.r_shadows_csm_numOfCascades.value;
            const lightOffset = shadowLayer * cascadeCapacity * 4 * 256;
            this.lightProjectionMatrices.SetArray(preparedLight.projectionMatrices, lightOffset);

            this.lightShadowData.set(light.id, {
                cascadeSplits: preparedLight.cascadeSplits,
                projectionMatrices: preparedLight.projectionMatrices,
                shadowMapIndex: shadowLayer,

                numCascades: preparedLight.numCascades,
                lightOffset: lightOffset,
                cascadeViewports: preparedLight.cascadeViewports,
            });

            shadowLayer++;
        }

        resources.setResource(PassParams.ShadowPassCascadeData, this.lightShadowData);
        resources.setResource(PassParams.ShadowPassDepth, this.shadowOutput);
    }

    public async execute(resources: ResourcePool) {
        if (!this.initialized) return;
        if (this.lightShadowData.size === 0) return;

        const shadowOutput = this.shadowOutput;
        shadowOutput.SetActiveLayer(0);

        for (const [lightId, lightShadowData] of this.lightShadowData) {
            shadowOutput.SetActiveLayer(lightShadowData.shadowMapIndex);

            this.lightProjectionMatrices.dynamicOffset = lightShadowData.lightOffset;

            for (let cascadePass = 0; cascadePass < lightShadowData.numCascades; cascadePass++) {
                this.cascadeIndexBuffer.dynamicOffset = cascadePass * 256;

                RendererContext.BeginRenderPass("ShadowPass", [], { target: shadowOutput, clear: cascadePass === 0 }, true);

                const viewport = lightShadowData.cascadeViewports[cascadePass];
                if (viewport) RendererContext.SetViewport(viewport.x, viewport.y, viewport.width, viewport.height, 0, 1);
                else RendererContext.SetViewport(0, 0, shadowOutput.width, shadowOutput.height, 0, 1);

                let renderableIndex = 0;
                for (const renderable of this.preparedRenderables) {
                    this.modelMatrices.dynamicOffset = renderableIndex * 256;

                    if (renderable instanceof SkinnedMesh) {
                        // TODO: Make this work with more than one skinned mesh, cannot use SetBuffer inside execute
                        this.drawSkinnedMeshShadowShader.SetBuffer("boneMatrices", renderable.GetBoneMatricesBuffer());
                        renderable.OnRenderObject(this.drawSkinnedMeshShadowShader);
                    } else {
                        renderable.OnRenderObject(this.drawShadowShader);
                    }

                    renderableIndex++;
                }

                for (const instance of this.preparedInstancedMeshes) {
                    this.drawInstancedShadowShader.SetBuffer("modelMatrix", instance.matricesBuffer);
                    instance.OnRenderObject(this.drawInstancedShadowShader);
                }

                RendererContext.EndRenderPass();
            }
        }

        shadowOutput.SetActiveLayer(0);
    }
}
