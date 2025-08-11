import {
    Components,
    Scene,
    Mathf,
    GPU,
    GameObject,
    PBRMaterial,
} from "@trident/core";

import { OrbitControls } from "@trident/plugins/OrbitControls";
import { TerrainBuilder } from "@trident/plugins/TerrainGenerator/TerrainBuilder";
import { Debugger } from "@trident/plugins/Debugger";

async function Application(canvas: HTMLCanvasElement) {
    const renderer = GPU.Renderer.Create(canvas, "webgpu");
    const scene = new Scene(renderer);

    const mainCameraGameObject = new GameObject(scene);
    mainCameraGameObject.transform.position.set(0,0,-15);
    mainCameraGameObject.name = "MainCamera";
    const camera = mainCameraGameObject.AddComponent(Components.Camera);
    camera.SetPerspective(72, canvas.width / canvas.height, 0.5, 5000);


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
    const terrainAlbedo = await GPU.Texture.Load("./assets/textures/rocky_terrain_02_2k/rocky_terrain_02_diff_2k.jpg");
    const terrainNormal = await GPU.Texture.Load("./assets/textures/rocky_terrain_02_2k/rocky_terrain_02_nor_gl_2k.jpg");
    const terrainSpec = await GPU.Texture.Load("./assets/textures/rocky_terrain_02_2k/rocky_terrain_02_spec_2k.jpg");
    const material = new PBRMaterial({albedoMap: terrainAlbedo, normalMap: terrainNormal, metalnessMap: terrainSpec});
    // const material = new PBRMaterial();
    const mesh = gameObject.AddComponent(Components.Mesh);
    await mesh.SetGeometry(terrain.geometry);
    mesh.AddMaterial(material);

    const skybox = await GPU.Texture.Load("./assets/textures/HDR/autumn_field_puresky_1k.png")
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

    Debugger.Enable();

    scene.Start();
};

Application(document.querySelector("canvas"));