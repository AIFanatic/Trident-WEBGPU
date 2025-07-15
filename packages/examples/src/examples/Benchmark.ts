import { GameObject } from "../GameObject";
import { Camera } from "../components/Camera";
import { Scene } from "../Scene";
import { Geometry, IndexAttribute, InterleavedVertexAttribute, VertexAttribute } from "../Geometry";
import { Renderer } from "../renderer/Renderer";
import { OrbitControls } from "../plugins/OrbitControls";

import { OBJLoaderIndexed } from "../plugins/OBJLoader";
import { MeshletMesh } from "../components/MeshletMesh";
import { Vector3 } from "../math/Vector3";
import { DeferredMeshMaterial } from "../renderer/Material";
import { Texture } from "../renderer/Texture";
import { DirectionalLight } from "../components/Light";

const canvas = document.createElement("canvas");
const aspectRatio = window.devicePixelRatio;
canvas.width = window.innerWidth * aspectRatio;
canvas.height = window.innerHeight * aspectRatio;
canvas.style.width = `${window.innerWidth}px`;
canvas.style.height = `${window.innerHeight}px`;
document.body.appendChild(canvas);

async function Application() {
    const renderer = Renderer.Create(canvas, "webgpu");
    const scene = new Scene(renderer);
    const mainCameraGameObject = new GameObject(scene);
    mainCameraGameObject.transform.position.set(0,0,-15);
    // mainCameraGameObject.transform.position.z = -15;
    mainCameraGameObject.name = "MainCamera";
    const camera = mainCameraGameObject.AddComponent(Camera);
    camera.SetPerspective(72, canvas.width / canvas.height, 0.5, 50000);
    camera.transform.LookAt(new Vector3(0,0,1));

    const controls = new OrbitControls(camera);
    controls.connect(canvas);

    const lightGameObject = new GameObject(scene);
    lightGameObject.transform.position.set(4, 4, 0);
    lightGameObject.transform.LookAt(new Vector3(0, 0, 0))
    const light = lightGameObject.AddComponent(DirectionalLight);
    light.intensity = 1;
    light.range = 100;
    light.color.set(1, 1, 1, 1);

    const sphereGeometry = Geometry.Sphere();
    const cubeGeometry = Geometry.Cube();

    const bunnyObj = await OBJLoaderIndexed.load("./bunny.obj");
    const bunnyGeometry = new Geometry();
    bunnyGeometry.attributes.set("position", new VertexAttribute(bunnyObj.vertices));
    bunnyGeometry.attributes.set("normal", new VertexAttribute(bunnyObj.normals));
    bunnyGeometry.attributes.set("uv", new VertexAttribute(bunnyObj.uvs));
    bunnyGeometry.index = new IndexAttribute(bunnyObj.indices);
    console.log("bunnyObj", bunnyObj);
    console.log("bunnyGeometry", bunnyGeometry);

    // From: freepbr.com
    const albedoMap = await Texture.Load("./brick-wall-unity/brick-wall_albedo.png");
    const normalMap = await Texture.Load("./brick-wall-unity/brick-wall_normal-ogl.png");
    const heightMap = await Texture.Load("./brick-wall-unity/brick-wall_height.png");

    const mat = new DeferredMeshMaterial({
        albedoMap: albedoMap,
        normalMap: normalMap,
        heightMap: heightMap,
    });

    let lastMesh;
    const n = 10;
    for (let x = 0; x < n; x++) {
        for (let y = 0; y < n; y++) {
            for (let z = 0; z < n; z++) {
                const cube = new GameObject(scene);
                cube.transform.scale.set(0.1, 0.1, 0.1);

                cube.transform.position.set(x * 20, y * 20, z * 20);
                const cubeMesh = cube.AddComponent(MeshletMesh);

                const which = Math.random() > 0.5;
                await cubeMesh.SetGeometry(bunnyGeometry);
                await cubeMesh.AddMaterial(mat);
                lastMesh = cube;
            }
        }
    }

    scene.Start();
}

Application();