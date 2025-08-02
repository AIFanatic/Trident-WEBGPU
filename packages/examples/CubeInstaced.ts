
import { Mesh } from "../components/Mesh";
import { GameObject } from "../GameObject";
import { Camera } from "../components/Camera";
import { Scene } from "../Scene";
import { Geometry } from "../Geometry";
import { Renderer } from "../renderer/Renderer";
import { Shader } from "../renderer/Shader";
import { OrbitControls } from "../plugins/OrbitControls";
import { Component } from "../components/Component";
import { RenderCommandBuffer } from "../renderer/RenderCommandBuffer";
import { Buffer, BufferType } from "../renderer/Buffer";
import { Vector3 } from "../math/Vector3";
import { Quaternion } from "../math/Quaternion";
import { Matrix4 } from "../math/Matrix4";

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

        private instances = 10;

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
            this.shader.depthTest = false;

            const p = new Vector3();
            const r = new Quaternion();
            const s = new Vector3(1,1,1);
            const m = new Matrix4();
            const matrixData = new Float32Array(16 * this.instances * this.instances * this.instances);
            let i = 0;
            for (let x = 0; x < this.instances; x++) {
                for (let y = 0; y < this.instances; y++) {
                    for (let z = 0; z < this.instances; z++) {
                        p.set(
                            (x + this.transform.position.x) * 2,
                            (y + this.transform.position.y) * 2,
                            (z + this.transform.position.z) * 2,
                        );
                        m.compose(p, r, s);
                        matrixData.set(m.elements, i * 16);
                        i++;
                    }
                }
            }
            const buffer = Buffer.Create(4 * 16 * this.instances * this.instances * this.instances, BufferType.STORAGE);
            buffer.SetArray(matrixData);
            this.shader.SetBuffer("modelMatrix", buffer);
        }

        public Update(): void {
            const mainCamera = Camera.mainCamera;

            this.shader.SetMatrix4("projectionMatrix", mainCamera.projectionMatrix);
            this.shader.SetMatrix4("viewMatrix", mainCamera.viewMatrix);

            RenderCommandBuffer.DrawGeometry(this.geometry, this.shader, this.instances * this.instances * this.instances);
        }
    }

    {
        const cubeInstanced = new GameObject(scene);
        cubeInstanced.transform.position.x = -100;
        cubeInstanced.AddComponent(CustomCubeRenderer);
    }

    {
        const cubeInstanced = new GameObject(scene);
        cubeInstanced.transform.position.x = 0;
        cubeInstanced.AddComponent(CustomCubeRenderer);
    }

    {
        const cubeInstanced = new GameObject(scene);
        cubeInstanced.transform.position.x = 100;
        cubeInstanced.AddComponent(CustomCubeRenderer);
    }



    console.warn(`
        TODO: - https://docs.unity3d.com/ScriptReference/Graphics.RenderMeshInstanced.html
                Emulate Unity Grahpics API, only render functions.
                Pass RenderParams->Create RenderPass (cache)->Draw
              - Remove RendererContext and port everything to WEBGPURenderer
              - Figure out how to do post processing (everything needs to render to a render target)
    `)

    scene.Start();
}

Application();