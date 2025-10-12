import {
    Components,
    Scene,
    GPU,
    Mathf,
    GameObject,
    Geometry,
    PBRMaterial,
    Object3D,
} from "@trident/core";

import { OrbitControls } from "@trident/plugins/OrbitControls";
import { GLTFLoader } from "@trident/plugins/GLTF/GLTFLoader";
import { Debugger } from "@trident/plugins/Debugger";

async function Application(canvas: HTMLCanvasElement) {
    const renderer = GPU.Renderer.Create(canvas, "webgpu");
    const scene = new Scene(renderer);

    const mainCameraGameObject = new GameObject(scene);
    mainCameraGameObject.transform.position.set(0,0,-15);
    mainCameraGameObject.name = "MainCamera";
    const camera = mainCameraGameObject.AddComponent(Components.Camera);
    camera.SetPerspective(72, canvas.width / canvas.height, 0.01, 100);


    mainCameraGameObject.transform.position.set(0, 0, 2);
    mainCameraGameObject.transform.LookAtV1(new Mathf.Vector3(0, 0, 0));

    const controls = new OrbitControls(canvas, camera);

    const lightGameObject = new GameObject(scene);
    lightGameObject.transform.position.set(4, 4, 4);
    lightGameObject.transform.LookAtV1(new Mathf.Vector3(0, 0, 0));
    const light = lightGameObject.AddComponent(Components.DirectionalLight);
    light.color.set(1.00, 0.851, 0.732, 1);
    light.intensity = 2
    
    {
        // Room
        const room = await GLTFLoader.loadAsGameObjects(scene, "./assets/models/room/room.gltf");
        // traverse(room, object3D => {
        //     console.log(object3D)
        //     if (object3D.geometry && object3D.material) {
        //         const gameObject = new GameObject(scene);
        //         // gameObject.transform.scale.set(0.01, 0.01, 0.01);
        //         object3D.localMatrix.decompose(gameObject.transform.position, gameObject.transform.rotation, gameObject.transform.scale);
        //         const mesh = gameObject.AddComponent(Components.Mesh);
        //         mesh.SetGeometry(object3D.geometry);
        //         mesh.AddMaterial(object3D.material);
        //     }
        // })
    }

    // const skybox = await GPU.Texture.Load("./assets/textures/hdr/bedroom-forest.png")
    // const skyboxCube = GPU.CubeTexture.Create(1024, 1024, 6);
    // GPU.Renderer.BeginRenderFrame();
    // // +X face (Right)
    // GPU.RendererContext.CopyTextureToTextureV3( { texture: skybox, origin: [2048, 1024, 0] }, { texture: skyboxCube, origin: [0, 0, 0] }, [1024, 1024, 1]);
    // // -X face (Left)
    // GPU.RendererContext.CopyTextureToTextureV3( { texture: skybox, origin: [0, 1024, 0] }, { texture: skyboxCube, origin: [0, 0, 1] }, [1024, 1024, 1]);
    // // +Y face (Top)
    // GPU.RendererContext.CopyTextureToTextureV3( { texture: skybox, origin: [1024, 0, 0] }, { texture: skyboxCube, origin: [0, 0, 2] }, [1024, 1024, 1]);
    // // -Y face (Bottom)
    // GPU.RendererContext.CopyTextureToTextureV3( { texture: skybox, origin: [1024, 2048, 0] }, { texture: skyboxCube, origin: [0, 0, 3] }, [1024, 1024, 1]);
    // // +Z face (Front)
    // GPU.RendererContext.CopyTextureToTextureV3( { texture: skybox, origin: [1024, 1024, 0] }, { texture: skyboxCube, origin: [0, 0, 4] }, [1024, 1024, 1]);
    // // -Z face (Back)
    // GPU.RendererContext.CopyTextureToTextureV3( { texture: skybox, origin: [3072, 1024, 0] }, { texture: skyboxCube, origin: [0, 0, 5] }, [1024, 1024, 1]);
    // GPU.Renderer.EndRenderFrame();

    // scene.renderPipeline.skybox = skyboxCube;

    Debugger.Enable();


    scene.Start();
};

Application(document.querySelector("canvas"));