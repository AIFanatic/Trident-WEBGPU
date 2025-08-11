import {
    Components,
    Scene,
    GPU,
    Mathf,
    GameObject,
} from "@trident/core";

import { OrbitControls } from "@trident/plugins/OrbitControls";
import { GLTFParser } from "@trident/plugins/GLTF/GLTF_Parser";

async function Application(canvas: HTMLCanvasElement) {
    const renderer = GPU.Renderer.Create(canvas, "webgpu");
    const scene = new Scene(renderer);

    const mainCameraGameObject = new GameObject(scene);
    mainCameraGameObject.transform.position.set(0,0,-15);
    mainCameraGameObject.name = "MainCamera";
    const camera = mainCameraGameObject.AddComponent(Components.Camera);
    camera.SetPerspective(72, canvas.width / canvas.height, 0.5, 10);


    mainCameraGameObject.transform.position.set(0, 0, 2);
    mainCameraGameObject.transform.LookAtV1(new Mathf.Vector3(0, 0, 0));

    const controls = new OrbitControls(canvas, camera);

    const lightGameObject = new GameObject(scene);
    lightGameObject.transform.position.set(-4, 4, 4);
    lightGameObject.transform.LookAtV1(new Mathf.Vector3(0, 0, 0));
    const light = lightGameObject.AddComponent(Components.DirectionalLight);

    const helmet = (await GLTFParser.Load("./assets/models/DamagedHelmet/DamagedHelmet.gltf")).children[0];
    
    const helmetGameObject = new GameObject(scene);
    helmetGameObject.transform.eulerAngles.x = 90;
    const helmetMesh = helmetGameObject.AddComponent(Components.Mesh);
    helmetMesh.SetGeometry(helmet.geometry);
    helmetMesh.AddMaterial(helmet.material);

    const skybox = await GPU.Texture.Load("./assets/textures/HDR/snowy_forest_1k.png")
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


    scene.Start();
};

Application(document.querySelector("canvas"));