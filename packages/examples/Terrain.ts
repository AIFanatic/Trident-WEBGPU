import {
    Components,
    Scene,
    Renderer,
    Mathf,
    GameObject,
    PBRMaterial,
} from "@trident/core";

import { OrbitControls } from "@trident/plugins/OrbitControls";
import { TerrainBuilder } from "@trident/plugins/TerrainGenerator/TerrainBuilder";

const canvas = document.createElement("canvas");
const aspectRatio = 1;
canvas.width = document.body.clientWidth * aspectRatio;
canvas.height = document.body.clientHeight * aspectRatio;
canvas.style.width = `100vw`;
canvas.style.height = `100vh`;
document.body.appendChild(canvas);

async function Application() {
    const renderer = Renderer.Create(canvas, "webgpu");
    const scene = new Scene(renderer);

    const mainCameraGameObject = new GameObject(scene);
    mainCameraGameObject.transform.position.set(0,0,-15);
    mainCameraGameObject.name = "MainCamera";
    const camera = mainCameraGameObject.AddComponent(Components.Camera);
    camera.SetPerspective(72, canvas.width / canvas.height, 0.5, 500);


    mainCameraGameObject.transform.position.set(0, 0, 20);
    mainCameraGameObject.transform.LookAtV1(new Mathf.Vector3(0, 0, 0));

    const controls = new OrbitControls(canvas, camera);

    const lightGameObject = new GameObject(scene);
    lightGameObject.transform.position.set(-4, 4, -4);
    lightGameObject.transform.LookAtV1(new Mathf.Vector3(0, 0, 0));
    const light = lightGameObject.AddComponent(Components.DirectionalLight);

    const terrainSize = 128;
    const terrain = new TerrainBuilder(terrainSize);
    const gameObject = new GameObject(scene);
    gameObject.transform.position.z -= terrainSize * 0.5;
    gameObject.transform.position.x -= terrainSize * 0.5;
    gameObject.transform.position.y = -5;

    // const terrainAlbedo = await Texture.Load("./assets/textures/rocky_terrain_02_2k.gltf/textures/rocky_terrain_02_diff_2k.jpg");
    // const terrainNormal = await Texture.Load("./assets/textures/rocky_terrain_02_2k.gltf/textures/rocky_terrain_02_nor_gl_2k.jpg");
    // const terrainSpec = await Texture.Load("./assets/textures/rocky_terrain_02_2k.gltf/textures/rocky_terrain_02_spec_2k.jpg");
    // const material = new PBRMaterial({albedoMap: terrainAlbedo, normalMap: terrainNormal, metalnessMap: terrainSpec});

    const material = new PBRMaterial();
    const mesh = gameObject.AddComponent(Components.Mesh);
    await mesh.SetGeometry(terrain.geometry);
    mesh.AddMaterial(material);

    scene.Start();
};

Application();