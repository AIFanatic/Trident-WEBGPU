
import { Mesh } from "../components/Mesh";
import { GameObject } from "../GameObject";
import { Camera } from "../components/Camera";
import { Scene } from "../Scene";
import { Geometry } from "../Geometry";
import { Renderer } from "../renderer/Renderer";
import { Shader } from "../renderer/Shader";
import { OrbitControls } from "../plugins/OrbitControls";
import { Light } from "../components/Light";
import { Vector3 } from "../math/Vector3";

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

    const geometry = Geometry.Cube();
    const shader = Shader.Standard;

    const lightGameObject = new GameObject(scene);
    lightGameObject.transform.position.set(10, 10, 10);
    lightGameObject.transform.LookAt(new Vector3(0,0,0))
    lightGameObject.AddComponent(Light);
    



    // const meshGameObject = new GameObject(scene);
    // meshGameObject.transform.position.x = -2;
    // const mesh = meshGameObject.AddComponent(Mesh);
    // mesh.enableGPUInstancing = true
    // mesh.SetGeometry(geometry);
    // mesh.AddShader(shader);


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

    scene.Start();

    setTimeout(() => {
        console.log(Camera.mainCamera)
    }, 1000);
}

Application();