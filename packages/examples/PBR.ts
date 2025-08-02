import { Mesh } from "../components/Mesh";
import { GameObject } from "../GameObject";
import { Camera } from "../components/Camera";
import { Scene } from "../Scene";
import { Geometry, IndexAttribute, VertexAttribute } from "../Geometry";
import { Renderer } from "../renderer/Renderer";
import { OrbitControls } from "../plugins/OrbitControls";
import { Light } from "../components/Light";

import { Texture } from "../renderer/Texture";
import { DeferredMeshMaterial } from "../renderer/Material";

import { OBJLoaderIndexed } from "../plugins/OBJLoader";
import { Color } from "../math/Color";

const canvas = document.createElement("canvas");
const aspectRatio = 1;
canvas.width = window.innerWidth * aspectRatio;
canvas.height = window.innerHeight * aspectRatio;
canvas.style.width = `${window.innerWidth}px`;
canvas.style.height = `${window.innerHeight}px`;
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

    // alert(Renderer.SwapChainFormat)

    const planeGeometry = Geometry.Plane();
    const cubeGeometry = Geometry.Cube();

    // for (let i = 0; i < 16; i++) {
    const lightGameObject = new GameObject(scene);
    lightGameObject.transform.position.set(5, 5, 5);
    const light = lightGameObject.AddComponent(Light);
    // light.radius = 1;
    light.intensity = 100
    light.color.set(1, 1, 1, 1);

    const lightHelperGameObject = new GameObject(scene);
    lightHelperGameObject.transform.position.copy(lightGameObject.transform.position);
    const lightGeometry = Geometry.Sphere();
    const lightHelperMesh = lightHelperGameObject.AddComponent(Mesh);
    lightHelperMesh.SetGeometry(lightGeometry);
    lightHelperMesh.AddMaterial(new DeferredMeshMaterial({ unlit: true, albedoColor: light.color }));

    // setInterval(() => {

    //     const time = performance.now();

    //     // light.transform.position.x += (Math.random() * 2.0 - 1.0) * 2;
    //     // light.transform.position.z += (Math.random() * 2.0 - 1.0) * 2;
    //     light.transform.position.x = Math.sin(time * 0.001) * 5;
    //     light.transform.position.z = Math.cos(time * 0.001) * 5;
    //     lightHelperGameObject.transform.position.copy(light.transform.position)

    // }, 1000 / 60);

    // {
    //     const lightGameObject = new GameObject(scene);
    //     lightGameObject.transform.position.set(5, 5, 5);
    //     const light = lightGameObject.AddComponent(Light);
    //     // light.radius = 1;
    //     light.intensity = 100
    //     light.color.set(1, 0, 0, 1);
    // // }

    // const size = 200;
    // for (let i = 0; i < 10; i++) {
    //     const lightGameObject = new GameObject(scene);
    //     lightGameObject.transform.position.set(Math.random() * size - (size * 0.5), 5, Math.random() * size - (size * 0.5));
    //     const light = lightGameObject.AddComponent(Light);
    //     // light.radius = 1;
    //     light.intensity = 100
    //     light.color.set(Math.random(), Math.random(), Math.random(), 1);
    // }


    // {
    //     const lightGameObject = new GameObject(scene);
    //     lightGameObject.transform.position.set(2, 0, 0);
    //     const light = lightGameObject.AddComponent(Light);
    //     light.radius = 10;
    //     light.color.set(1, 0, 0, 1);
    // }

    const obj = await OBJLoaderIndexed.load("./assets/bunny_uv.obj");
    const geometry = new Geometry();
    geometry.attributes.set("position", new VertexAttribute(obj.vertices));
    geometry.attributes.set("normal", new VertexAttribute(obj.normals));
    geometry.attributes.set("uv", new VertexAttribute(obj.uvs));
    geometry.index = new IndexAttribute(obj.indices);
    // geometry.ComputeNormals();
    console.log(obj)

    // const albedo = await Texture.Load("./assets/textures/brick-wall-unity/brick-wall_albedo.png");
    // const normal = await Texture.Load("./assets/textures/brick-wall-unity/brick-wall_normal-ogl.png");
    // const ao = await Texture.Load("./assets/textures/brick-wall-unity/brick-wall_ao.png");

    const albedo = await Texture.Load("./assets/textures/metal-compartments-unity/metal-compartments_albedo.png");
    const normal = await Texture.Load("./assets/textures/metal-compartments-unity/metal-compartments_normal-ogl.png");
    const ao = await Texture.Load("./assets/textures/metal-compartments-unity/metal-compartments_ao.png");

    // const albedo = await Texture.Load("./assets/textures/whispy-grass-meadow-unity/wispy-grass-meadow_albedo.png");
    // const normal = await Texture.Load("./assets/textures/whispy-grass-meadow-unity/wispy-grass-meadow_normal-ogl.png");
    // const ao = await Texture.Load("./assets/textures/whispy-grass-meadow-unity/wispy-grass-meadow_ao.png");

    // const albedo = await Texture.Load("./assets/textures/ash-tree-bark-unity/ash-tree-bark_albedo.png");
    // const normal = await Texture.Load("./assets/textures/ash-tree-bark-unity/ash-tree-bark_normal-ogl.png");
    // const ao = await Texture.Load("./assets/textures/ash-tree-bark-unity/ash-tree-bark_ao.png");

    // const albedo = await Texture.Load("./assets/textures/Dirt02_MR_2K/Dirt02_2k_BaseColor.png");
    // const normal = await Texture.Load("./assets/textures/Dirt02_MR_2K/Dirt02_2k_Normal.png");
    // const ao = await Texture.Load("./assets/textures/Dirt02_MR_2K/Dirt02_2k_AO.png");

    albedo.GenerateMips();
    normal.GenerateMips();
    ao.GenerateMips();

    const cube = new GameObject(scene);
    cube.transform.scale.set(200, 200, 200);
    // cube.transform.position.set(0, 0, 0);
    // cube.transform.position.set(-1, 0, 0);
    cube.transform.eulerAngles.x = -90;
    const sphereGeometry = Geometry.Sphere();
    const cubeMesh = cube.AddComponent(Mesh);
    cubeMesh.SetGeometry(planeGeometry);
    cubeMesh.AddMaterial(new DeferredMeshMaterial({ albedoMap: albedo, albedoColor: new Color(0, 1, 0, 1), normalMap: normal, aoMap: ao, roughness: 0.1, metalness: 0.3}));

    console.log(Renderer.SwapChainFormat)
    // {
    //     const cube = new GameObject(scene);
    //     cube.transform.scale.set(200, 200, 200);
    //     // cube.transform.position.set(0, 0, 0);
    //     // cube.transform.position.set(-1, 0, 0);
    //     // cube.transform.eulerAngles.x = -90;
    //     const sphereGeometry = Geometry.Sphere();
    //     const cubeMesh = cube.AddComponent(Mesh);
    //     cubeMesh.SetGeometry(cubeGeometry);
    //     cubeMesh.AddMaterial(new PBRMaterial({roughness: 0.1, metalness: 0.3, albedoMap: albedo, normalMap: normal, aoMap: ao}));
    // }



    const cubeShader = new DeferredMeshMaterial();
    let lastCube;
    const n = 10;
    for (let x = 0; x < n; x++) {
        for (let y = 0; y < n; y++) {
            for (let z = 0; z < n; z++) {
                const meshGameObject = new GameObject(scene);
                meshGameObject.transform.position.set(x * 2, y * 2, z * 2);
                const mesh = meshGameObject.AddComponent(Mesh);
                mesh.SetGeometry(cubeGeometry);
                mesh.AddMaterial(cubeShader);
                lastCube = meshGameObject.transform;
            }
        }
    }

    scene.Start();
}

Application();