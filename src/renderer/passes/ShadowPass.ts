import { Camera } from "../../components/Camera";
import { RenderPass, ResourcePool } from "../RenderGraph";
import { DepthTexture, DepthTextureArray } from "../Texture";
import { RendererContext } from "../RendererContext";
import { AreaLight, DirectionalLight, Light, PointLight, SpotLight } from "../../components/Light";
import { Mesh } from "../../components/Mesh";
import { InstancedMesh } from "../../components/InstancedMesh";
import { Shader, ShaderCode, ShaderParams } from "../Shader";
import { Buffer, BufferType, DynamicBuffer } from "../Buffer";
import { EventSystem } from "../../Events";
import { Debugger } from "../../plugins/Debugger";

export class ShadowPass extends RenderPass {
    public name: string = "ShadowPass";
    
    private shadowDepthDT: DepthTexture;
    private shadowWidth = 1024;
    private shadowHeight = 1024;

    private shader: Shader;
    private instancedShader: Shader;

    private lightViewMatricesBuffer: Buffer;
    private lightProjectionMatricesBuffer: Buffer;
    private modelMatrices: DynamicBuffer;

    private lightViewMatrixBuffer: Buffer;
    private lightProjectionMatrixBuffer: Buffer;

    private needsUpdate: boolean = true;

    constructor(outputDepthDT: string) {
        super({outputs: [outputDepthDT]});

        this.shader = Shader.Create({
            code: ShaderCode.ShadowShader,
            attributes: {
                position: { location: 0, size: 3, type: "vec3" },
                normal: { location: 1, size: 3, type: "vec3" },
                uv: { location: 2, size: 2, type: "vec2" }
            },
            uniforms: {
                projectionMatrix: {group: 0, binding: 0, type: "storage"},
                viewMatrix: {group: 0, binding: 1, type: "storage"},
                modelMatrix: {group: 1, binding: 2, type: "storage"},
            },
            depthOutput: "depth24plus",
            colorOutputs: []
        });
        
        this.instancedShader = Shader.Create({
            code: ShaderCode.ShadowShader,
            attributes: {
                position: { location: 0, size: 3, type: "vec3" },
                normal: { location: 1, size: 3, type: "vec3" },
                uv: { location: 2, size: 2, type: "vec2" }
            },
            uniforms: {
                projectionMatrix: {group: 0, binding: 0, type: "storage"},
                viewMatrix: {group: 0, binding: 1, type: "storage"},
                modelMatrix: {group: 1, binding: 2, type: "storage"},
            },
            depthOutput: "depth24plus",
            colorOutputs: []
        });

        this.shadowDepthDT = DepthTextureArray.Create(this.shadowWidth, this.shadowHeight, 1);

        this.lightViewMatrixBuffer = Buffer.Create(4 * 16, BufferType.STORAGE);
        this.lightProjectionMatrixBuffer = Buffer.Create(4 * 16, BufferType.STORAGE);

        this.shader.SetBuffer("viewMatrix", this.lightViewMatrixBuffer);
        this.shader.SetBuffer("projectionMatrix", this.lightProjectionMatrixBuffer);
        this.instancedShader.SetBuffer("viewMatrix", this.lightViewMatrixBuffer);
        this.instancedShader.SetBuffer("projectionMatrix", this.lightProjectionMatrixBuffer);

        EventSystem.on("LightUpdated", component => {
            this.needsUpdate = true;
        })

        EventSystem.on("MeshUpdated", component => {
            this.needsUpdate = true;
        })
    }

    public execute(resources: ResourcePool, outputDepthDT: string) {
        if (!this.needsUpdate) return;

        Debugger.AddFrameRenderPass("ShadowPass");

        const scene = Camera.mainCamera.gameObject.scene;

        // const lights = scene.GetComponents(Light);
        // TODO: Fix, GetComponents(Light)
        const lights = [...scene.GetComponents(SpotLight), ...scene.GetComponents(PointLight), ...scene.GetComponents(DirectionalLight), ...scene.GetComponents(AreaLight)];
        if (lights.length === 0) {
            resources.setResource(outputDepthDT, this.shadowDepthDT);
            return;
        }

        if (lights.length !== this.shadowDepthDT.depth) {
            this.shadowDepthDT = DepthTextureArray.Create(this.shadowWidth, this.shadowHeight, lights.length);
        }

        const meshes = scene.GetComponents(Mesh);
        const instancedMeshes = scene.GetComponents(InstancedMesh);

        // Lights
        if (!this.lightViewMatricesBuffer || this.lightViewMatricesBuffer.size / 4 / 16 !== lights.length) {
            this.lightViewMatricesBuffer = Buffer.Create(lights.length * 4 * 16, BufferType.STORAGE);
        }

        if (!this.lightProjectionMatricesBuffer || this.lightProjectionMatricesBuffer.size / 4 / 16 !== lights.length) {
            this.lightProjectionMatricesBuffer = Buffer.Create(lights.length * 4 * 16, BufferType.STORAGE);
        }

        // Model
        if (!this.modelMatrices || this.modelMatrices.size / 256 !== meshes.length) {
            this.modelMatrices = DynamicBuffer.Create(meshes.length * 256, BufferType.STORAGE, 256);
        }

        for (let i = 0; i < lights.length; i++) {
            this.lightViewMatricesBuffer.SetArray(lights[i].camera.viewMatrix.elements, i * 4 * 16);
            this.lightProjectionMatricesBuffer.SetArray(lights[i].camera.projectionMatrix.elements, i * 4 * 16);
        }

        // TODO: Only update if model changes
        for (let i = 0; i < meshes.length; i++) {
            const mesh = meshes[i];
            this.modelMatrices.SetArray(mesh.transform.localToWorldMatrix.elements, i * 256)
        }

        this.shader.SetBuffer("modelMatrix", this.modelMatrices);

        this.shadowDepthDT.SetActiveLayer(0);
        for (let i = 0; i < lights.length; i++) {
            RendererContext.CopyBufferToBuffer(this.lightViewMatricesBuffer, this.lightViewMatrixBuffer, i * 4 * 16, 0, 4 * 16);
            RendererContext.CopyBufferToBuffer(this.lightProjectionMatricesBuffer, this.lightProjectionMatrixBuffer, i * 4 * 16, 0, 4 * 16);

            RendererContext.BeginRenderPass("ShadowPass", [], {target: this.shadowDepthDT, clear: true});

            for (let i = 0; i < meshes.length; i++) {
                const mesh = meshes[i];
                if (!mesh.enableShadows) continue;
                const uniform_offset = i * 256;
                this.modelMatrices.dynamicOffset = uniform_offset;
                RendererContext.DrawGeometry(mesh.GetGeometry(), this.shader, 1);
            }

            for (let instancedMesh of instancedMeshes) {
                if (instancedMesh.instanceCount === 0) continue;
                this.instancedShader.SetBuffer("modelMatrix", instancedMesh.matricesBuffer);
                RendererContext.DrawGeometry(instancedMesh.GetGeometry(), this.instancedShader, instancedMesh.instanceCount);
            }

            RendererContext.EndRenderPass();

            this.shadowDepthDT.SetActiveLayer(this.shadowDepthDT.GetActiveLayer()+1);
        }
        
        resources.setResource(outputDepthDT, this.shadowDepthDT);

        this.needsUpdate = false;
    }
}