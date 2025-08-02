
import { Mesh } from "../components/Mesh";
import { GameObject } from "../GameObject";
import { Camera } from "../components/Camera";
import { Scene } from "../Scene";
import { Geometry } from "../Geometry";
import { Renderer } from "../renderer/Renderer";
import { Shader } from "../renderer/Shader";
import { OrbitControls } from "../plugins/OrbitControls";

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
    meshGameObject.transform.position.x = -2;
    const mesh = meshGameObject.AddComponent(Mesh);
    mesh.enableGPUInstancing = true
    mesh.SetGeometry(geometry);
    mesh.AddShader(shader);


    let lastCube;
    const n = 10;
    for (let x = 0; x < n; x++) {
        for (let y = 0; y < n; y++) {
            for (let z = 0; z < n; z++) {
                const meshGameObject = new GameObject(scene);
                meshGameObject.transform.position.set(x * 2, y * 2, z * 2);
                const mesh = meshGameObject.AddComponent(Mesh);
                mesh.enableGPUInstancing = true;
                mesh.SetGeometry(geometry);
                mesh.AddShader(shader);
                lastCube = meshGameObject.transform;
            }
        }
    }

    setTimeout(() => {
        console.log("CALLED", lastCube.position)
        lastCube.position.x += Math.random() * 2;
    }, 5000);

    scene.Start();
}

Application();