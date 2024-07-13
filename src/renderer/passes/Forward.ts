import { RendererContext } from "../RendererContext";
import { RenderPass, ResourcePool } from "../RenderGraph";
import { Renderer } from "../Renderer";
import { Shader, ShaderParams } from "../Shader";
import { Camera } from "../../components/Camera";
import { Mesh } from "../../components/Mesh";
import { Buffer, BufferType } from "../Buffer";

interface ForwardMesh {
    shader: Shader;
    modelMatrix: Buffer;
}
export class Forward extends RenderPass {
    public name: string = "Forward";
    private params: ShaderParams;
    private forwardMeshes: Map<string, ForwardMesh> = new Map();

    constructor() {
        super({});

        const code = `
        struct VertexInput {
            @location(0) position : vec3<f32>,
        };

        struct VertexOutput {
            @builtin(position) position : vec4<f32>,
        };

        @group(0) @binding(0) var<storage, read> projectionMatrix: mat4x4<f32>;
        @group(0) @binding(1) var<storage, read> viewMatrix: mat4x4<f32>;
        @group(0) @binding(2) var<storage, read> modelMatrix: mat4x4<f32>;

        @vertex fn vertexMain(input: VertexInput) -> VertexOutput {
            var output: VertexOutput;
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
        const sceneMeshlets = [...scene.GetComponents(Mesh)];

        let drawCount = 0;

        RendererContext.BeginRenderPass("Forward", [{ clear: false }]);

        for (const meshlet of sceneMeshlets) {
            let forwardMesh = this.forwardMeshes.get(meshlet.id);
            if (!forwardMesh) {
                forwardMesh = {
                    shader: Shader.Create(this.params),
                    modelMatrix: Buffer.Create(4 * 16, BufferType.STORAGE)
                }
                this.forwardMeshes.set(meshlet.id, forwardMesh);
                forwardMesh.shader.SetBuffer("modelMatrix", forwardMesh.modelMatrix);
            }

            forwardMesh.shader.SetMatrix4("projectionMatrix", mainCamera.projectionMatrix);
            forwardMesh.shader.SetMatrix4("viewMatrix", mainCamera.viewMatrix);
            forwardMesh.modelMatrix.SetArray(meshlet.transform.localToWorldMatrix.elements)

            RendererContext.DrawGeometry(meshlet.GetGeometry(), forwardMesh.shader);
            
            drawCount++;
        }
        RendererContext.EndRenderPass();
    }
}