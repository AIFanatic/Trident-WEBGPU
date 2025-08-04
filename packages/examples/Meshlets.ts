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

const canvas = document.createElement("canvas");
const aspectRatio = 1;
canvas.width = document.body.clientWidth * aspectRatio;
canvas.height = document.body.clientHeight * aspectRatio;
canvas.style.width = `100vw`;
canvas.style.height = `100vh`;
document.body.appendChild(canvas);

async function Application() {
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

    scene.renderPipeline.AddPass(new MeshletDraw(), GPU.RenderPassOrder.BeforeGBuffer);
    
    {
        const lightGameObject = new GameObject(scene);
        lightGameObject.transform.position.set(-4, 4, -4);
        lightGameObject.transform.LookAtV1(new Mathf.Vector3(0, 0, 0));
        const light = lightGameObject.AddComponent(Components.DirectionalLight);
        light.intensity = 1;
        light.color.set(1, 1, 1, 1);
        light.castShadows = true;
    }

    {
        const planeGO = new GameObject(scene);
        planeGO.transform.scale.set(100, 100, 1);
        planeGO.transform.eulerAngles.x = -90;
        const sphereMesh = planeGO.AddComponent(Components.Mesh);
        await sphereMesh.SetGeometry(Geometry.Plane());
        sphereMesh.AddMaterial(new PBRMaterial());
    }

    const mesh = await OBJLoaderIndexed.load("./assets/models/bunny.obj");

    const pinesGO = new GameObject(scene);
    const instancedMesh = pinesGO.AddComponent(MeshletMesh);
    instancedMesh.enableShadows = false;
    await instancedMesh.SetGeometry(mesh[0].geometry);
    instancedMesh.AddMaterial(mesh[0].material);

    scene.Start();
};

Application();