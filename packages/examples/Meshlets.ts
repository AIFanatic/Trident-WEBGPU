import {
    GameObject,
    Geometry,
    Scene,
    Components,
    Mathf,
    PBRMaterial,
    GPU,
} from "@trident/core";

import { OrbitControls } from "@trident/plugins/OrbitControls";
import { OBJLoaderIndexed } from "@trident/plugins/OBJLoader";

import { MeshletMesh } from "@trident/plugins/meshlets_v2/MeshletMesh";
import { MeshletDraw } from "@trident/plugins/meshlets_v2/passes/MeshletDraw";

async function Application(canvas: HTMLCanvasElement) {
    const renderer = GPU.Renderer.Create(canvas, "webgpu");
    const scene = new Scene(renderer);

    const mainCameraGameObject = new GameObject(scene);
    mainCameraGameObject.transform.position.set(0,0,-15);
    mainCameraGameObject.name = "MainCamera";
    const camera = mainCameraGameObject.AddComponent(Components.Camera);
    camera.SetPerspective(72, canvas.width / canvas.height, 0.5, 500);


    mainCameraGameObject.transform.position.set(0, 0, 20);
    mainCameraGameObject.transform.LookAtV1(new Mathf.Vector3(0, 0, 0));

    const controls = new OrbitControls(canvas, camera);

    // TODO: Should be added automatically from plugin
    scene.renderPipeline.AddPass(new MeshletDraw(), GPU.RenderPassOrder.BeforeGBuffer);
    
    const lightGameObject = new GameObject(scene);
    lightGameObject.transform.position.set(-4, 4, -4);
    lightGameObject.transform.LookAtV1(new Mathf.Vector3(0, 0, 0));
    const light = lightGameObject.AddComponent(Components.DirectionalLight);
    light.intensity = 1;
    light.color.set(1, 1, 1, 1);
    light.castShadows = true;

    const floorGameObject = new GameObject(scene);
    floorGameObject.transform.scale.set(100, 100, 1);
    floorGameObject.transform.eulerAngles.x = -90;
    const floorMesh = floorGameObject.AddComponent(Components.Mesh);
    floorMesh.geometry = Geometry.Plane();
    floorMesh.material = new PBRMaterial();

    const mesh = await OBJLoaderIndexed.load("./assets/models/bunny.obj");

    const meshletGameObject = new GameObject(scene);
    const meshletMesh = meshletGameObject.AddComponent(MeshletMesh);
    meshletMesh.enableShadows = false;
    await meshletMesh.SetGeometry(mesh.geometry);
    meshletMesh.material = mesh.material;

    scene.Start();
};

Application(document.querySelector("canvas"));