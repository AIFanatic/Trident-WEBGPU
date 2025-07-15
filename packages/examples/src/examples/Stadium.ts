
import { Mesh } from "../components/Mesh";
import { GameObject } from "../GameObject";
import { Camera } from "../components/Camera";
import { Scene } from "../Scene";
import { Geometry } from "../Geometry";
import { Renderer } from "../renderer/Renderer";
import { Shader } from "../renderer/Shader";
import { OrbitControls } from "../plugins/OrbitControls";
import { OBJLoaderIndexed } from "../plugins/OBJLoader";

import SPONZA from "./assets/kb3d_neosanfrancisco-native.obj";

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

    OBJLoaderIndexed.load(SPONZA, obj => {
        console.log(obj);

        const geometry = new Geometry(obj.vertices, obj.indices, obj.normals);
        const shader = Shader.BasicShader();
    
        const meshGameObject = new GameObject(scene);
        meshGameObject.transform.scale.set(10, 10, 10)
        // meshGameObject.transform.position.z = 2;
        const mesh = meshGameObject.AddComponent(Mesh);
        mesh.SetGeometry(geometry);
        mesh.AddShader(shader);
    
        scene.Start();
    })

}

Application();