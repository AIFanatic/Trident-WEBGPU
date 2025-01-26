import { Camera } from "../../components/Camera";
import { RendererContext } from "../RendererContext";
import { RenderPass, ResourcePool } from "../RenderGraph";
import { Mesh } from "../../components/Mesh";
import { PassParams } from "../RenderingPipeline";
import { InstancedMesh } from "../../components/InstancedMesh";
import { AreaLight, DirectionalLight, Light, PointLight, SpotLight } from "../../components/Light";
import { Shader, Topology } from "../Shader";
import { RenderCache } from "../RenderCache";

import { Buffer, BufferType, DynamicBuffer } from "../Buffer";
import { Matrix4 } from "../../math/Matrix4";
import { EventSystemLocal } from "../../Events";
import { TransformEvents } from "../../components/Transform";
import { Vector3 } from "../../math/Vector3";
import { Vector4 } from "../../math/Vector4";
import { Debugger } from "../../plugins/Debugger";
import { UIButtonStat, UIFolder, UISliderStat } from "../../plugins/ui/UIStats";

export let lightsCSMProjectionMatrix: Float32Array[] = [];
export let cascadeSplits: Vector4 = new Vector4();

interface Cascade {
    splitDepth: number;
    viewProjMatrix: Matrix4;
}

class _DeferredShadowMapPassDebug {
    private shadowsFolder: UIFolder;
    private shadowsUpdate: UIButtonStat;
    private shadowsRoundToPixelSize: UIButtonStat;
    private debugCascades: UIButtonStat;
    private pcfResolution: UISliderStat;
    private blendThreshold: UISliderStat;
    private viewBlendThreshold: UIButtonStat;
    
    public shadowsUpdateValue = true;
    public roundToPixelSizeValue = true;
    public debugCascadesValue = false;
    public pcfResolutionValue: number = 1;
    public blendThresholdValue: number = 0.3;
    public viewBlendThresholdValue = false;

    constructor() {
        this.shadowsFolder = new UIFolder(Debugger.ui, "CSM Shadows");
        this.shadowsUpdate = new UIButtonStat(this.shadowsFolder, "Update shadows", value => { this.shadowsUpdateValue = value}, this.shadowsUpdateValue);
        this.shadowsRoundToPixelSize = new UIButtonStat(this.shadowsFolder, "RoundToPixelSize", value => { this.roundToPixelSizeValue = value}, this.roundToPixelSizeValue);
        this.debugCascades = new UIButtonStat(this.shadowsFolder, "Debug cascades", value => { this.debugCascadesValue = value}, this.debugCascadesValue);
        this.pcfResolution = new UISliderStat(this.shadowsFolder, "PCF resolution", 0, 7, 1, this.pcfResolutionValue, value => { this.pcfResolutionValue = value} );
        this.blendThreshold = new UISliderStat(this.shadowsFolder, "Blend threshold", 0, 1, 0.01, this.blendThresholdValue, value => { this.blendThresholdValue = value} );
        this.viewBlendThreshold = new UIButtonStat(this.shadowsFolder, "View blend threshold", value => { this.viewBlendThresholdValue = value}, this.viewBlendThresholdValue);
        this.shadowsFolder.Open();
    }
}

export const DeferredShadowMapPassDebug = new _DeferredShadowMapPassDebug();

export class DeferredShadowMapPass extends RenderPass {
    public name: string = "DeferredShadowMapPass";

    private drawInstancedShadowShader: Shader;
    private drawShadowShader: Shader;

    private lightProjectionMatrixBuffer: Buffer;
    private lightProjectionViewMatricesBuffer: Buffer;
    private modelMatrices: DynamicBuffer;

    private cascadeIndexBuffers: Buffer[] = [];
    private cascadeCurrentIndexBuffer: Buffer;

    private needsUpdate: boolean = false;

    constructor() {
        super({
            inputs: [
                PassParams.MainCamera,
                PassParams.GBufferAlbedo,
                PassParams.GBufferNormal,
                PassParams.GBufferERMO,
                PassParams.GBufferDepth,
            ],
            outputs: [
                PassParams.ShadowPassDepth
            ]
        });
    }

    public async init(resources: ResourcePool) {
        const code = `
        struct VertexInput {
            @builtin(instance_index) instanceIdx : u32, 
            @location(0) position : vec3<f32>,
            @location(1) normal : vec3<f32>,
            @location(2) uv : vec2<f32>,
        };
        
        
        struct VertexOutput {
            @builtin(position) position : vec4<f32>,
        };
        
        @group(0) @binding(0) var<storage, read> projectionMatrix: array<mat4x4<f32>, 4>;
        @group(0) @binding(1) var<storage, read> cascadeIndex: f32;
        
        @group(1) @binding(0) var<storage, read> modelMatrix: array<mat4x4<f32>>;
        
        @vertex
        fn vertexMain(input: VertexInput) -> @builtin(position) vec4<f32> {
            var output : VertexOutput;

            let modelMatrixInstance = modelMatrix[input.instanceIdx];
            let lightProjectionViewMatrix = projectionMatrix[u32(cascadeIndex)];
        
            return lightProjectionViewMatrix * modelMatrixInstance * vec4(input.position, 1.0);
        }
        
        @fragment
        fn fragmentMain() -> @location(0) vec4<f32> {
            return vec4(1.0);
        }
        `;
        this.drawShadowShader = await Shader.Create({
            code: code,
            attributes: {
                position: { location: 0, size: 3, type: "vec3" },
                normal: { location: 1, size: 3, type: "vec3" },
                uv: { location: 2, size: 2, type: "vec2" }
            },
            uniforms: {
                projectionMatrix: { group: 0, binding: 0, type: "storage" },
                cascadeIndex: { group: 0, binding: 1, type: "storage" },
                modelMatrix: { group: 1, binding: 0, type: "storage" },
            },
            colorOutputs: [],
            depthOutput: "depth24plus",
            // depthBias: 2,              // Constant bias
            // depthBiasSlopeScale: 3.0,  // Slope-scale bias
            // depthBiasClamp: 0.0,       // Max clamp for the bias
            cullMode: "front",
        })

        this.drawInstancedShadowShader = await Shader.Create({
            code: code,
            attributes: {
                position: { location: 0, size: 3, type: "vec3" },
                normal: { location: 1, size: 3, type: "vec3" },
                uv: { location: 2, size: 2, type: "vec2" }
            },
            uniforms: {
                projectionMatrix: { group: 0, binding: 0, type: "storage" },
                cascadeIndex: { group: 0, binding: 1, type: "storage" },
                modelMatrix: { group: 1, binding: 0, type: "storage" },
            },
            colorOutputs: [],
            depthOutput: "depth24plus",
            cullMode: "front"
        });

        this.initialized = true;
    }

    private getCornersForCascade(camera: Camera, cascadeNear: number, cascadeFar: number): Vector3[] {
        const projectionMatrix = new Matrix4().perspectiveWGPUMatrix(camera.fov * (Math.PI / 180), camera.aspect, cascadeNear, cascadeFar);
    
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
    
        // Project frustum corners into world space
        const invViewProj = projectionMatrix.clone().mul(camera.viewMatrix).invert();
        for (let i = 0; i < 8; i++) {
            frustumCorners[i].applyMatrix4(invViewProj);
        }
    
        return frustumCorners;
    }
    
    private getCascades(camera: Camera, cascadeCount: number, light: Light): Cascade[] {
        const CASCADE_PERCENTAGES: number[] = [0.05, 0.15, 0.5, 1];
        const CASCADE_DISTANCES: number[] = [
            CASCADE_PERCENTAGES[0] * camera.far,
            CASCADE_PERCENTAGES[1] * camera.far,
            CASCADE_PERCENTAGES[2] * camera.far,
            CASCADE_PERCENTAGES[3] * camera.far,
        ];
    
        // console.log(CASCADE_DISTANCES)
    
        // const CASCADE_DISTANCES: number[] = [20, 80, 400, 1000];
    
        let cascades: Cascade[] = [];
    
        for (let i = 0; i < cascadeCount; i++) {
    
            const cascadeNear = i === 0 ? camera.near : CASCADE_DISTANCES[i - 1];
            const cascadeFar = CASCADE_DISTANCES[i];
            const frustumCorners = this.getCornersForCascade(camera, cascadeNear, cascadeFar);
            const frustumCenter = new Vector3(0, 0, 0);
    
            // Compute center of frustum corners
            for (let i = 0; i < frustumCorners.length; i++) {
                frustumCenter.add(frustumCorners[i]);
            }
            frustumCenter.mul(1 / frustumCorners.length);
    
            const lightDirection = light.transform.position.clone().normalize();
    
            const radius = frustumCorners[0].clone().sub(frustumCorners[6]).length() / 2;
            if (DeferredShadowMapPassDebug.roundToPixelSizeValue === true) {
                const shadowMapSize = 4096;
                const texelsPerUnit = shadowMapSize / (radius * 2.0);
                const scalar = new Matrix4().makeScale(new Vector3(texelsPerUnit, texelsPerUnit, texelsPerUnit));
                const baseLookAt = new Vector3(-lightDirection.x, -lightDirection.y, -lightDirection.z);
        
                const lookAt = new Matrix4().lookAt(new Vector3(0, 0, 0), baseLookAt, new Vector3(0, 1, 0)).mul(scalar);
                const lookAtInv = lookAt.clone().invert();
        
                frustumCenter.transformDirection(lookAt);
                frustumCenter.x = Math.floor(frustumCenter.x);
                frustumCenter.y = Math.floor(frustumCenter.y);
                frustumCenter.transformDirection(lookAtInv);
            }
    
            const eye = frustumCenter.clone().sub(lightDirection.clone().mul(radius * 2.0));
            
            const lightViewMatrix = new Matrix4();
            lightViewMatrix.lookAt(
                eye,
                frustumCenter,
                new Vector3(0, 1, 0)
            );
    
    
            const lightProjMatrix = new Matrix4().orthoZO(-radius, radius, -radius, radius, -radius * 6.0, radius * 6.0);
            const out = lightProjMatrix.mul(lightViewMatrix);
    
            cascades.push({
                viewProjMatrix: out,
                splitDepth: cascadeFar
            })
        }
    
        return cascades;
    }

    public execute(resources: ResourcePool) {
        if (!this.initialized) return;


        const scene = Camera.mainCamera.gameObject.scene;

        // const lights = scene.GetComponents(Light);
        // TODO: Fix, GetComponents(Light)
        const lights = [...scene.GetComponents(SpotLight), ...scene.GetComponents(PointLight), ...scene.GetComponents(DirectionalLight), ...scene.GetComponents(AreaLight)];
        if (lights.length === 0) {
            return;
        }

        const meshes = scene.GetComponents(Mesh);
        const instancedMeshes = scene.GetComponents(InstancedMesh);

        if (meshes.length === 0 && instancedMeshes.length === 0) return;

        // Lights

        // if (!this.lightProjectionMatricesBuffer || this.lightProjectionMatricesBuffer.size / 4 / 16 !== lights.length) {
        //     this.lightProjectionMatricesBuffer = Buffer.Create(lights.length * 4 * 16, BufferType.STORAGE);
        // }

        const numOfCascades = 4;

        if (!this.lightProjectionMatrixBuffer) {
            this.lightProjectionMatrixBuffer = Buffer.Create(lights.length * 4 * 4 * 16, BufferType.STORAGE);
            this.drawShadowShader.SetBuffer("projectionMatrix", this.lightProjectionMatrixBuffer);
            this.drawInstancedShadowShader.SetBuffer("projectionMatrix", this.lightProjectionMatrixBuffer);
        }

        // Model
        if (!this.modelMatrices || this.modelMatrices.size / 256 !== meshes.length) {
            this.modelMatrices = DynamicBuffer.Create(meshes.length * 256, BufferType.STORAGE, 256);
        }

        if (!this.lightProjectionViewMatricesBuffer || this.lightProjectionViewMatricesBuffer.size / 4 / 4 / 16 !== lights.length) {
            this.lightProjectionViewMatricesBuffer = Buffer.Create(lights.length * numOfCascades * 4 * 16, BufferType.STORAGE);
        }

        if (!this.cascadeCurrentIndexBuffer) {
            this.cascadeCurrentIndexBuffer = Buffer.Create(4, BufferType.STORAGE);
        }

        if (this.cascadeIndexBuffers.length === 0) {
            for (let i = 0; i < numOfCascades; i++) {
                const buffer = Buffer.Create(4, BufferType.STORAGE)
                buffer.SetArray(new Float32Array([i]));
                this.cascadeIndexBuffers.push(buffer);
            }
        }

        lightsCSMProjectionMatrix = [];

        for (let i = 0; i < lights.length; i++) {
            const light = lights[i];
            // TODO: For now we call this so that DeferredLightingPass updates.
            //       This is only needed for cascaded shadows and only when the main camera moves.
            EventSystemLocal.emit(TransformEvents.Updated, light.transform);

            let lightData: Matrix4[] = [];

            const cascades = this.getCascades(Camera.mainCamera, numOfCascades, light);
            lightData = [];
            for (const cascade of cascades) {
                lightData.push(cascade.viewProjMatrix);
            }
            cascadeSplits.x = cascades[0].splitDepth;
            cascadeSplits.y = cascades[1].splitDepth;
            cascadeSplits.z = cascades[2].splitDepth;
            cascadeSplits.w = cascades[3].splitDepth;


            const ld = new Float32Array(lightData.flatMap(v => v.elements).flatMap(v => [...v]));
            this.lightProjectionViewMatricesBuffer.SetArray(ld, i * numOfCascades * 4 * 16);
            lightsCSMProjectionMatrix.push(ld);
        }

        // TODO: Only update if model changes
        for (let i = 0; i < meshes.length; i++) {
            const mesh = meshes[i];
            if (!mesh.enableShadows) continue;
            this.modelMatrices.SetArray(mesh.transform.localToWorldMatrix.elements, i * 256)
        }

        this.drawShadowShader.SetBuffer("modelMatrix", this.modelMatrices);

        const shadowOutput = resources.getResource(PassParams.ShadowPassDepth)
        shadowOutput.SetActiveLayer(0);

        this.drawShadowShader.SetBuffer("cascadeIndex", this.cascadeCurrentIndexBuffer);
        this.drawInstancedShadowShader.SetBuffer("cascadeIndex", this.cascadeCurrentIndexBuffer);

        for (let i = 0; i < lights.length; i++) {
            RendererContext.CopyBufferToBuffer(this.lightProjectionViewMatricesBuffer, this.lightProjectionMatrixBuffer, i * numOfCascades * 4 * 16, 0, numOfCascades * 4 * 16);

            for (let cascadePass = 0; cascadePass < numOfCascades; cascadePass++) {
                // if (cascadePass > 0) continue;

                RendererContext.CopyBufferToBuffer(this.cascadeIndexBuffers[cascadePass], this.cascadeCurrentIndexBuffer);

                RendererContext.BeginRenderPass("ShadowPass", [], { target: shadowOutput, clear: cascadePass === 0 ? true : false }, true);
                // RendererContext.BeginRenderPass("ShadowPass", [], {target: shadowOutput, clear: false});

                // TODO this should be parametric
                const width = shadowOutput.width / 2;
                const height = shadowOutput.height / 2;
                let x = 0;
                let y = 0;
                if (cascadePass >= 2) x += width;
                if (cascadePass % 2 !== 0) y += height;
                RendererContext.SetViewport(x, y, width, height, 0, 1);

                let meshCount = 0; // For dynamic offset
                for (const renderableMesh of RenderCache.renderableMeshes) {
                    if (renderableMesh.shader.params.topology === Topology.Lines) continue;

                    if (renderableMesh.type === "Draw") {
                        if (renderableMesh.mesh.enableShadows) {
                            const uniform_offset = meshCount * 256;
                            this.modelMatrices.dynamicOffset = uniform_offset;
                            RendererContext.DrawGeometry(renderableMesh.geometry, this.drawShadowShader, 1);
                        };
                        meshCount++;
                    }
                    else if (renderableMesh.type === "DrawInstanced") {
                        if (renderableMesh.instances === 0) continue;
                        if (!renderableMesh.instancedMesh.enableShadows) continue;
                        this.drawInstancedShadowShader.SetBuffer("modelMatrix", renderableMesh.instancedMesh.matricesBuffer);
                        RendererContext.DrawGeometry(renderableMesh.geometry, this.drawInstancedShadowShader, renderableMesh.instances);
                    }
                }

                RendererContext.EndRenderPass();

            }
            shadowOutput.SetActiveLayer(shadowOutput.GetActiveLayer() + 1);
        }

        shadowOutput.SetActiveLayer(0);
    }
}