import {
    Components,
    Scene,
    GPU,
    Mathf,
    GameObject,
    Geometry,
    PBRMaterial,
} from "@trident/core";

import { OrbitControls } from "@trident/plugins/OrbitControls";
import { Debugger } from "@trident/plugins/Debugger";

const canvas = document.createElement("canvas");
const aspectRatio = 1;
canvas.width = document.body.clientWidth * aspectRatio;
canvas.height = document.body.clientHeight * aspectRatio;
canvas.style.width = `100vw`;
canvas.style.height = `100vh`;
canvas.style.userSelect = "none";
document.body.appendChild(canvas);

async function Application() {
    const renderer = GPU.Renderer.Create(canvas, "webgpu");
    const scene = new Scene(renderer);

    const mainCameraGameObject = new GameObject(scene);
    mainCameraGameObject.name = "MainCamera";
    const camera = mainCameraGameObject.AddComponent(Components.Camera);
    camera.SetPerspective(72, canvas.width / canvas.height, 0.5, 500);


    mainCameraGameObject.transform.position.set(0, 0, 10);
    mainCameraGameObject.transform.LookAtV1(new Mathf.Vector3(0, 0, 0));

    const controls = new OrbitControls(canvas, camera);

    const lightsInfo = [
        {position: new Mathf.Vector3(-10.0, 10.0, 10.0), color: new Mathf.Vector3(1, 1, 1) },
        {position: new Mathf.Vector3(10.0, 10.0, 10.0), color: new Mathf.Vector3(1, 1, 1) },
        {position: new Mathf.Vector3(-10.0, -10.0, 10.0), color: new Mathf.Vector3(1, 1, 1) },
        {position: new Mathf.Vector3(10.0, -10.0, 10.0), color: new Mathf.Vector3(1, 1, 1) },
    ];

    for (const lightInfo of lightsInfo ) {
        const lightGameObject = new GameObject(scene);
        lightGameObject.transform.position.copy(lightInfo.position);
        lightGameObject.transform.LookAtV1(new Mathf.Vector3(0, 0, 0));
        const light = lightGameObject.AddComponent(Components.DirectionalLight);
        light.color = Mathf.Color.fromVector(lightInfo.color);
        light.castShadows = false;
    }

    const skybox = await GPU.Texture.Load("./assets/textures/HDR/royal_esplanade_1k.png")
    const skyboxCube = GPU.CubeTexture.Create(1024, 1024, 6);
    GPU.Renderer.BeginRenderFrame();
    // +X face (Right)
    GPU.RendererContext.CopyTextureToTextureV3( { texture: skybox, origin: [2048, 1024, 0] }, { texture: skyboxCube, origin: [0, 0, 0] }, [1024, 1024, 1]);
    // -X face (Left)
    GPU.RendererContext.CopyTextureToTextureV3( { texture: skybox, origin: [0, 1024, 0] }, { texture: skyboxCube, origin: [0, 0, 1] }, [1024, 1024, 1]);
    // +Y face (Top)
    GPU.RendererContext.CopyTextureToTextureV3( { texture: skybox, origin: [1024, 0, 0] }, { texture: skyboxCube, origin: [0, 0, 2] }, [1024, 1024, 1]);
    // -Y face (Bottom)
    GPU.RendererContext.CopyTextureToTextureV3( { texture: skybox, origin: [1024, 2048, 0] }, { texture: skyboxCube, origin: [0, 0, 3] }, [1024, 1024, 1]);
    // +Z face (Front)
    GPU.RendererContext.CopyTextureToTextureV3( { texture: skybox, origin: [1024, 1024, 0] }, { texture: skyboxCube, origin: [0, 0, 4] }, [1024, 1024, 1]);
    // -Z face (Back)
    GPU.RendererContext.CopyTextureToTextureV3( { texture: skybox, origin: [3072, 1024, 0] }, { texture: skyboxCube, origin: [0, 0, 5] }, [1024, 1024, 1]);
    GPU.Renderer.EndRenderFrame();

    scene.renderPipeline.skybox = skyboxCube;


    for (let x = 0; x < 8; x++) {
        for (let y = 0; y < 8; y++) {
            const sphereGameObject = new GameObject(scene);
            sphereGameObject.transform.position.set((x - 4) * 1.5, (y - 4) * 1.5, 0);
            const sphereMesh = sphereGameObject.AddComponent(Components.Mesh);
            sphereMesh.SetGeometry(Geometry.Sphere());
            sphereMesh.AddMaterial(new PBRMaterial({
                albedoColor: new Mathf.Color(1, 0, 0, 1),
                metalness: x / 8,
                roughness: y / 8
            }));
        }
    }

    Debugger.Enable();


    scene.Start();
};

Application();