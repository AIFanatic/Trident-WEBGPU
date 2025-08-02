
import { Mesh } from "../components/Mesh";
import { GameObject } from "../GameObject";
import { Camera } from "../components/Camera";
import { Scene } from "../Scene";
import { Geometry } from "../Geometry";
import { Renderer } from "../renderer/Renderer";
import { Shader } from "../renderer/Shader";
import { OrbitControls } from "../plugins/OrbitControls";
import { Component } from "../components/Component";
import { RenderPassParams, RendererContext } from "../renderer/RendererContext";
import { RenderCommandBuffer } from "../renderer/RenderCommandBuffer";
import { Buffer, BufferType } from "../renderer/Buffer";
import { MeshRenderPass } from "../renderer/passes/MeshRenderPass";
import { RenderTexture } from "../renderer/Texture";

const canvas = document.createElement("canvas");
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
document.body.appendChild(canvas);

async function Application() {
    const renderer = Renderer.Create(canvas, "webgpu");
    const scene = new Scene(renderer);
    const mainCameraGameObject = new GameObject(scene);
    mainCameraGameObject.transform.position.z = 10;
    mainCameraGameObject.name = "MainCamera";
    const camera = mainCameraGameObject.AddComponent(Camera);
    camera.aspect = canvas.width / canvas.height;

    const controls = new OrbitControls(camera);
    controls.connect(canvas);

    class CustomCubeRenderer extends Component {
        private geometry: Geometry;
        private shader: Shader;

        public Start(): void {
            const cubeVertices = new Float32Array([
                -0.5, -0.5, -0.5,
                0.5, -0.5, -0.5,
                0.5, 0.5, -0.5,
                -0.5, 0.5, -0.5,
                -0.5, -0.5, 0.5,
                0.5, -0.5, 0.5,
                0.5, 0.5, 0.5,
                -0.5, 0.5, 0.5
            ]);
        
            const cubeIndices = new Uint32Array([
                0, 3, 2, 2, 1, 0, // Front face
                4, 5, 6, 6, 7, 4, // Back face
                0, 1, 5, 5, 4, 0, // Bottom face
                3, 7, 6, 6, 2, 3, // Top face
                0, 4, 7, 7, 3, 0, // Left face
                1, 2, 6, 6, 5, 1 // Right face
            ]);
        
            this.geometry = new Geometry(cubeVertices, cubeIndices);
            this.shader = Shader.Standard;
        }

        // public Update(): void {
        //     const mainCamera = Camera.mainCamera;
        //     const renderParams: RenderPassParams = {renderTarget: mainCamera.renderTarget, depthTarget: mainCamera.depthTexture, clearValue: mainCamera.clearValue};

        //     this.shader.SetMatrix4("projectionMatrix", mainCamera.projectionMatrix);
        //     this.shader.SetMatrix4("viewMatrix", mainCamera.viewMatrix);

        //     this.shader.SetMatrix4("modelMatrix", this.transform.localToWorldMatrix);
        //     RenderCommandBuffer.DrawGeometry(this.geometry, this.shader);
        // }
    }

    const cubeInstanced = new GameObject(scene);
    cubeInstanced.transform.position.x = -2;
    cubeInstanced.AddComponent(CustomCubeRenderer);



    console.warn(`
        TODO: - https://docs.unity3d.com/ScriptReference/Graphics.RenderMeshInstanced.html
                Emulate Unity Grahpics API, only render functions.
                Pass RenderParams->Create RenderPass (cache)->Draw
              - Remove RendererContext and port everything to WEBGPURenderer
              - Figure out how to do post processing (everything needs to render to a render target)
    `)

    const cubeVertices = new Float32Array([
        -0.5, -0.5, -0.5,
        0.5, -0.5, -0.5,
        0.5, 0.5, -0.5,
        -0.5, 0.5, -0.5,
        -0.5, -0.5, 0.5,
        0.5, -0.5, 0.5,
        0.5, 0.5, 0.5,
        -0.5, 0.5, 0.5
    ]);

    const cubeIndices = new Uint32Array([
        0, 3, 2, 2, 1, 0, // Front face
        4, 5, 6, 6, 7, 4, // Back face
        0, 1, 5, 5, 4, 0, // Bottom face
        3, 7, 6, 6, 2, 3, // Top face
        0, 4, 7, 7, 3, 0, // Left face
        1, 2, 6, 6, 5, 1 // Right face
    ]);
    const geometry = new Geometry(cubeVertices, cubeIndices);
    const shader = Shader.Standard;

    const meshGameObject = new GameObject(scene);
    meshGameObject.transform.position.set(2, 2, 2);
    const mesh = meshGameObject.AddComponent(Mesh);
    mesh.enableGPUInstancing = true;
    mesh.SetGeometry(geometry);
    mesh.AddShader(shader);

    scene.Start();
}

Application();