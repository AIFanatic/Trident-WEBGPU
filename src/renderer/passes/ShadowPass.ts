import { Shader } from "../Shader";
import { Camera } from "../../components/Camera";
import { Vector3 } from "../../math/Vector3";
import { MeshRenderCache } from "./MeshRenderCache";
import { Matrix4 } from "../../math/Matrix4";
import { Light } from "../../components/Light";
import { DepthTexture, RenderTexture } from "../Texture";
import { Renderer } from "../Renderer";

export class ShadowPass {
    private shader: Shader;
    public depthTarget: DepthTexture;

    constructor() {
        this.shader = Shader.Create(`
        struct VertexInput {
            @location(0) position : vec3<f32>,
            @location(1) normal : vec3<f32>,
        };
        
        struct VertexOutput {
            @builtin(position) position : vec4<f32>,
            @location(0) normal : vec3<f32>,
        };
        
        @group(0) @binding(1) var<storage, read> projectionMatrix: mat4x4<f32>;
        @group(0) @binding(2) var<storage, read> viewMatrix: mat4x4<f32>;
        @group(0) @binding(3) var<storage, read> modelMatrix: array<mat4x4<f32>>;
        
        @vertex
        fn vertexMain(@builtin(instance_index) instanceIdx : u32, input: VertexInput) -> VertexOutput {
            var output : VertexOutput;
            var modelMatrixInstance = modelMatrix[instanceIdx];
            var modelViewMatrix = viewMatrix * modelMatrixInstance;
            
            output.position = projectionMatrix * modelViewMatrix * vec4(input.position, 1.0);
            output.normal = normalize((modelViewMatrix * vec4(input.normal, 0.0)).xyz);
            return output;
        }
        
        @fragment
        fn fragmentMain(fragData: VertexOutput) -> @location(0) vec4<f32> {
            return vec4(1.0, 0.0, 0.0, 1.0);
        }
        `);
        // this.shader.depthTest = false;
        this.depthTarget = DepthTexture.Create(Renderer.width, Renderer.height);
    }

    public Execute(light: Light) {
        const commandBuffer = new RenderCommandBuffer("LightPass");
        const mainCamera = Camera.mainCamera;
        commandBuffer.ClearRenderTarget(true, true, mainCamera.clearValue);
        commandBuffer.SetRenderTarget(null, this.depthTarget);

        // Render normal
        for (const renderable of MeshRenderCache.GetRenderable()) {
            this.shader.SetMatrix4("projectionMatrix", light.camera.projectionMatrix);
            this.shader.SetMatrix4("viewMatrix", light.camera.viewMatrix);
            if (!this.shader.HasBuffer("modelMatrix")) this.shader.SetBuffer("modelMatrix", renderable.modelMatrixBuffer);
        }

        // Render instanced
        for (const [_, renderableInstanced] of MeshRenderCache.GetRenderableInstanced()) {
            const shader = this.shader;
            
            shader.SetMatrix4("projectionMatrix", light.camera.projectionMatrix);
            shader.SetMatrix4("viewMatrix", light.camera.viewMatrix);
            if (!shader.HasBuffer("modelMatrix")) shader.SetBuffer("modelMatrix", renderableInstanced.modelMatrixBuffer);

            commandBuffer.DrawMesh(renderableInstanced.geometry, shader, renderableInstanced.transform.length);
        }
        return commandBuffer;
    }
}