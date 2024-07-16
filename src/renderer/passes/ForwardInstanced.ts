import { RendererContext } from "../RendererContext";
import { RenderPass, ResourcePool } from "../RenderGraph";
import { Renderer } from "../Renderer";
import { Shader, ShaderParams } from "../Shader";
import { Camera } from "../../components/Camera";
import { Mesh } from "../../components/Mesh";
import { Buffer, BufferType } from "../Buffer";
import { InstancedMesh } from "../../components/InstancedMesh";

export class ForwardInstanced extends RenderPass {
    public name: string = "ForwardInstanced";
    private params: ShaderParams;
    private instancedMeshShaders: Map<string, Shader> = new Map();

    constructor() {
        super({});

        const code = `
        struct VertexInput {
            @location(0) position : vec3<f32>,
            @builtin(instance_index) instanceIdx : u32,
        };

        struct VertexOutput {
            @builtin(position) position : vec4<f32>,
        };

        @group(0) @binding(0) var<storage, read> projectionMatrix: mat4x4<f32>;
        @group(0) @binding(1) var<storage, read> viewMatrix: mat4x4<f32>;
        @group(0) @binding(2) var<storage, read> modelMatrixArray: array<mat4x4<f32>>;

        @vertex fn vertexMain(input: VertexInput) -> VertexOutput {
            var output: VertexOutput;
            let modelMatrix = modelMatrixArray[input.instanceIdx];
            output.position = projectionMatrix * viewMatrix * modelMatrix * vec4(input.position, 1.0);
            return output;
        }
        
        @fragment fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
            return vec4(1.0, 0.0, 0.0, 1.0);
        }
        `;

        this.params = {
            code: code,
            colorOutputs: [{ format: Renderer.SwapChainFormat }],
            attributes: {
                position: { location: 0, size: 3, type: "vec3" },
            },
            uniforms: {
                projectionMatrix: { group: 0, binding: 0, type: "storage" },
                viewMatrix: { group: 0, binding: 1, type: "storage" },
                modelMatrix: { group: 0, binding: 2, type: "storage" },
            },
        };
    }

    public execute(resources: ResourcePool) {
        const mainCamera = Camera.mainCamera;
        const scene = mainCamera.gameObject.scene;
        const sceneInstancedMeshes = [...scene.GetComponents(InstancedMesh)];

        let drawCount = 0;

        RendererContext.BeginRenderPass("ForwardInstanced", [{ clear: false }], undefined, true);

        for (const instancedMesh of sceneInstancedMeshes) {
            let instancedMeshShader = this.instancedMeshShaders.get(instancedMesh.id);
            if (!instancedMeshShader) {
                instancedMeshShader = Shader.Create(this.params);
                this.instancedMeshShaders.set(instancedMesh.id, instancedMeshShader);
                instancedMeshShader.SetBuffer("modelMatrix", instancedMesh.matricesBuffer)
            }

            instancedMeshShader.SetMatrix4("projectionMatrix", mainCamera.projectionMatrix);
            instancedMeshShader.SetMatrix4("viewMatrix", mainCamera.viewMatrix);

            RendererContext.DrawGeometry(instancedMesh.GetGeometry(), instancedMeshShader, instancedMesh.instanceCount);
            
            drawCount++;
        }
        RendererContext.EndRenderPass();
    }
}