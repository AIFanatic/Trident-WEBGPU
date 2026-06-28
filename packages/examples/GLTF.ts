import { Components, Scene, GPU, Mathf, GameObject, Geometry, IndexAttribute, PBRMaterial, VertexAttribute, Runtime, PlayerRuntime } from "@trident/core";

import { OrbitControls } from "@trident/plugins/OrbitControls";
import { GLTFLoader } from "@trident/plugins/GLTF/GLTFLoader";
import { Debugger } from "@trident/plugins/Debugger";
import { HDRParser } from "@trident/plugins/HDRParser";
import { WireframePass } from "@trident/plugins/WireframePass";
import { IBLLightingPass } from "@trident/plugins/Environment/IBLLightingPass";
import { SkyboxPass } from "@trident/plugins/Environment/SkyboxPass";
import { PhysicsDebugger } from "@trident/plugins/PhysicsRapier/PhysicsDebugger";
import { MeshCollider } from "@trident/plugins/PhysicsRapier/colliders/MeshCollider";
import { PhysicsRapier } from "@trident/plugins/PhysicsRapier/PhysicsRapier";

import { RigidBody } from "@trident/plugins/PhysicsRapier/RigidBody";
import { CapsuleCollider } from "@trident/plugins/PhysicsRapier/colliders/CapsuleCollider";
import { CharacterController } from "@trident/plugins/PhysicsRapier/CharacterController";

async function Application(canvas: HTMLCanvasElement) {
    await PlayerRuntime.Create(canvas);
    const scene = PlayerRuntime.SceneManager.CreateScene("DefaultScene");
    PlayerRuntime.SceneManager.SetActiveScene(scene);

    const mainCameraGameObject = new GameObject();
    mainCameraGameObject.transform.position.set(0, 0, -15);
    mainCameraGameObject.name = "MainCamera";
    const camera = mainCameraGameObject.AddComponent(Components.Camera);
    camera.SetPerspective(60, canvas.width / canvas.height, 0.05, 10000);


    mainCameraGameObject.transform.position.set(0, 0, 2);
    mainCameraGameObject.transform.LookAt(new Mathf.Vector3(0, 0, 0));
    mainCameraGameObject.AddComponent(OrbitControls);

    const lightGameObject = new GameObject();
    lightGameObject.transform.position.set(2, 0, 0);
    lightGameObject.transform.LookAt(new Mathf.Vector3(0, 0, 0));
    const light = lightGameObject.AddComponent(Components.DirectionalLight);
    light.castShadows = false;
    light.intensity = 2;

    // const lightHelper = lightGameObject.AddComponent(DirectionalLightHelper);
    // lightHelper.light = light;


    // const cube = new GameObject();
    // cube.transform.position.y = 0.5;
    // const cubeMesh = cube.AddComponent(Components.Mesh);
    // cubeMesh.geometry = Geometry.Cube();
    // cubeMesh.material = new PBRMaterial();


    // const rootGO = await GLTFLoader.Load("./assets/models/DamagedHelmet/DamagedHelmet.gltf", scene);
    // const rootGO = await GLTFLoader.Load("/extra/test-assets/bouquet.glb", scene);
    const rootGO = await GLTFLoader.Load("./assets/models/Shadow.glb", scene);
    // const rootGO = await GLTFLoader.Load("/extra/test-assets/nature/overgrowth/patch_grass_medium.glb", scene);
    // const rootGO = await GLTFLoader.Load("/extra/test-assets/Mountain Environment/Pine_trees/Prefabs/Prefab_Forest_pine_01_LOD0.glb", scene);
    // const rootGO = await GLTFLoader.Load("/extra/test-assets/ak47u.worldmodel.glb", scene);
    // const rootGO = await GLTFLoader.Load("/extra/test-assets/semi_auto_rifle.worldmodel.glb", scene);
    // const rootGO = await GLTFLoader.Load("/extra/test-assets/sphere/sphere.gltf", scene);
    // const rootGO = await GLTFLoader.Load("./assets/models/Fox.glb", scene);

    const meshComponents = rootGO.GetComponentsInChildren(Components.Mesh);
    for (const mesh of meshComponents) {
        const animator = mesh.gameObject.GetComponent(Components.Animator);
        if (animator) {
            console.log(animator);
            break;
        }
    }

    const fpArmsAKMGO = await GLTFLoader.Load("/extra/SampleProject/Survival/Wieldables/GLB/FP_Arms_Pickaxe.glb", scene);
    fpArmsAKMGO.transform.position.x = 2;
    const fpArmsAKM = fpArmsAKMGO.GetComponent(Components.Animator);
    console.log(fpArmsAKM)
    fpArmsAKM.SetClipByIndex(0);

    // const fpAKMGO = await GLTFLoader.Load("/extra/SampleProject/Survival/Wieldables/GLB/FP_AKM.glb", scene);
    // fpAKMGO.transform.position.x = 2;
    // const fpAKM = fpAKMGO.GetComponent(Components.Animator);
    // console.log(fpAKM)
    // // fpAKM.SetClipByIndex(0);

    // setTimeout(() => {
    //     console.log("Playing");
    //     fpArmsAKM.SetClipByIndex(1);
    //     fpAKM.SetClipByIndex(0);
    // }, 3000);

    //     {
    //         const gameObject = await GLTFLoader.Load("/extra/test-assets/bouquet.glb", scene);
    //         gameObject.transform.position.x = -2;
    //         // gameObject.transform.scale.set(0.01, 0.01, 0.01);

    //         const animator = gameObject.GetComponent(Components.Animator);
    //         console.log(animator)
    //         // animator.SetClipByIndex(1)
    //         // animator.CrossFadeTo(0, 1000);

    //     }

    // const hdr = await HDRParser.Load("./assets/textures/HDR/autumn_field_puresky_1k.hdr");
    const hdr = await HDRParser.Load("./assets/textures/HDR/spruit_sunrise_1k.hdr");
    const skyTexture = await HDRParser.ToCubemap(hdr);

    // const sky = new Sky();
    // sky.SUN_ELEVATION_DEGREES = 60;
    // await sky.init();
    // const skyTexture = sky.skyTextureCubemap;
    const iblLightingPass = Runtime.Renderer.RenderPipeline.AddPass(IBLLightingPass, GPU.RenderPassOrder.AfterLighting);
    const skyboxPass = Runtime.Renderer.RenderPipeline.AddPass(SkyboxPass, GPU.RenderPassOrder.AfterLighting);
    iblLightingPass.SetEnvironment(skyTexture);
    skyboxPass.SetSkybox(skyTexture);


    const gameObject = new GameObject();
    const mesh = gameObject.AddComponent(Components.Mesh);
    mesh.geometry = Geometry.Sphere();
    mesh.material = new PBRMaterial({
        albedoMap: await GPU.Texture.Load("/extra/SampleProject/Nature/Terrain/leafy_grass/leafy_grass_diff_2k.jpg", { format: "rgba8unorm-srgb" }),
        normalMap: await GPU.Texture.Load("/extra/SampleProject/Nature/Terrain/leafy_grass/leafy_grass_nor_gl_2k.jpg"),
        armMap: await GPU.Texture.Load("/extra/SampleProject/Nature/Terrain/leafy_grass/leafy_grass_arm_2k.jpg"),
    });


    // Drag and drop models
    {
        window.addEventListener("dragover", (e) => {
            e.preventDefault(); // allow drop
        });

        window.addEventListener("drop", async (e) => {
            e.preventDefault();

            const file = e.dataTransfer?.files?.[0];
            if (!file) return;

            const url = URL.createObjectURL(file);
            const obj = await GLTFLoader.Load(url, scene, "glb");



            // const physics = new GameObject();
            // Runtime.AddSystem(PhysicsRapier)
            // physics.AddComponent(PhysicsDebugger);
            // obj.transform.eulerAngles.x = -90;
            // obj.transform.position.y -= 50;
            // obj.transform.position.x += 50;

            // const meshes = obj.GetComponentsInChildren(Components.Mesh);
            // console.log(meshes)

            // for (const mesh of meshes) {
            //     mesh.gameObject.AddComponent(MeshCollider);
            // }
            // console.log(obj)


            // const player = new GameObject();
            // const animator = player.AddComponent(Components.Animator);
            // const collider = player.AddComponent(CapsuleCollider);
            // const rigidbody = player.AddComponent(RigidBody);
            // rigidbody.isKinematic = false;
            // const characterController = player.AddComponent(CharacterController);
            // characterController.player = player;

            // mainCameraGameObject.transform.parent = player.transform;

        });
    }

    // Debugger.Enable();

    // Runtime.Play();
};

Application(document.querySelector("canvas"));