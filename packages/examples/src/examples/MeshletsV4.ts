import { GameObject } from "../GameObject";
import { Camera } from "../components/Camera";
import { Scene } from "../Scene";
import { Renderer } from "../renderer/Renderer";
import { OrbitControls } from "../plugins/OrbitControls";

import { Vector3 } from "../math/Vector3";
import { DirectionalLight } from "../components/Light";
import { PBRMaterial } from "../renderer/Material";
import { Mesh } from "../components/Mesh";
import { OBJLoaderIndexed } from "../plugins/OBJLoader";
import { MeshletDraw } from "../plugins/meshlets_v2/passes/MeshletDraw";
import { PassParams, RenderPassOrder } from "../renderer/RenderingPipeline";
import { DeferredGBufferPass } from "../renderer/passes/DeferredGBufferPass";
import { Geometry } from "../Geometry";
import { MeshletMesh } from "../plugins/meshlets_v2/MeshletMesh";
import { RenderTexture, RenderTextureArray, Texture, TextureArray } from "../renderer/Texture";
import { RendererContext } from "../renderer/RendererContext";
import { TextureViewer } from "../renderer/passes/TextureViewer";
import { Buffer, BufferType } from "../renderer/Buffer";

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
    mainCameraGameObject.transform.position.set(0,0,-15);
    mainCameraGameObject.name = "MainCamera";
    const camera = mainCameraGameObject.AddComponent(Camera);
    camera.SetPerspective(72, canvas.width / canvas.height, 0.5, 500);


    mainCameraGameObject.transform.position.set(0, 0, 20);
    mainCameraGameObject.transform.LookAtV1(new Vector3(0, 0, 0));

    const controls = new OrbitControls(canvas, camera);

    scene.renderPipeline.AddPass(new MeshletDraw(), RenderPassOrder.BeforeGBuffer);
    scene.renderPipeline.AddPass(new DeferredGBufferPass(), RenderPassOrder.BeforeGBuffer);
    
    {
        const lightGameObject = new GameObject(scene);
        lightGameObject.transform.position.set(-4, 4, -4);
        lightGameObject.transform.LookAtV1(new Vector3(0, 0, 0));
        const light = lightGameObject.AddComponent(DirectionalLight);
        light.intensity = 1;
        light.color.set(1, 1, 1, 1);
        light.castShadows = true;
    }


    {
        const planeGO = new GameObject(scene);
        planeGO.transform.scale.set(100, 100, 1);
        planeGO.transform.eulerAngles.x = -90;
        const sphereMesh = planeGO.AddComponent(Mesh);
        await sphereMesh.SetGeometry(Geometry.Plane());
        sphereMesh.AddMaterial(new PBRMaterial());
    }

    const mesh = await OBJLoaderIndexed.load("./assets/bunny.obj");
    console.log(mesh);

    const pinesGO = new GameObject(scene);
    const instancedMesh = pinesGO.AddComponent(MeshletMesh);
    instancedMesh.enableShadows = false;
    await instancedMesh.SetGeometry(mesh[0].geometry);
    instancedMesh.AddMaterial(mesh[0].material);

    scene.Start();
};

Application();