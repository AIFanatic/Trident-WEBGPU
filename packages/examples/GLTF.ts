import { Components, Scene, GPU, Mathf, GameObject, Geometry, IndexAttribute, PBRMaterial, VertexAttribute, Runtime } from "@trident/core";

import { OrbitControls } from "@trident/plugins/OrbitControls";
import { GLTFLoader } from "@trident/plugins/GLTF/GLTFLoader";
import { Debugger } from "@trident/plugins/Debugger";
import { HDRParser } from "@trident/plugins/HDRParser";
import { Environment } from "@trident/plugins/Environment/Environment";
import { DirectionalLightHelper } from "@trident/plugins/DirectionalLightHelper";
import { Sky } from "@trident/plugins/Environment/Sky";

import { WireframePass } from "@trident/plugins/WireframePass";

async function Application(canvas: HTMLCanvasElement) {
    await Runtime.Create(canvas);
    const scene = Runtime.SceneManager.CreateScene("DefaultScene");
    Runtime.SceneManager.SetActiveScene(scene);

    const mainCameraGameObject = new GameObject();
    mainCameraGameObject.transform.position.set(0, 0, -15);
    mainCameraGameObject.name = "MainCamera";
    const camera = mainCameraGameObject.AddComponent(Components.Camera);
    camera.SetPerspective(60, canvas.width / canvas.height, 0.05, 1000);


    mainCameraGameObject.transform.position.set(0, 0, 2);
    mainCameraGameObject.transform.LookAtV1(new Mathf.Vector3(0, 0, 0));

    const controls = new OrbitControls(canvas, camera);

    const lightGameObject = new GameObject();
    lightGameObject.transform.position.set(2, 0, 0);
    lightGameObject.transform.LookAtV1(new Mathf.Vector3(0, 0, 0));
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


    // const hdr = await HDRParser.Load("./assets/textures/HDR/autumn_field_puresky_1k.hdr");
    const hdr = await HDRParser.Load("./assets/textures/HDR/spruit_sunrise_1k.hdr");
    const skyTexture = await HDRParser.ToCubemap(hdr);

    // const sky = new Sky();
    // sky.SUN_ELEVATION_DEGREES = 60;
    // await sky.init();
    // const skyTexture = sky.skyTextureCubemap;

    const environment = new Environment(scene, skyTexture);
    await environment.init();

    const rootGO = await GLTFLoader.Load("./assets/models/DamagedHelmet/DamagedHelmet.gltf", scene);
    // const rootGO = await GLTFLoader.Load("/extra/test-assets/bouquet.glb", scene);
    // const rootGO = await GLTFLoader.Load("./assets/models/Shadow.glb", scene);
    // const rootGO = await GLTFLoader.Load("/extra/test-assets/nature/overgrowth/patch_grass_medium.glb", scene);
    // const rootGO = await GLTFLoader.Load("/extra/test-assets/tree-01/american_beech_a/american_beech_a.glb", scene);
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

    {
        const gameObject = await GLTFLoader.Load("./assets/models/Shadow.glb", scene);
        gameObject.transform.position.x = 2;
        // gameObject.transform.scale.set(0.01, 0.01, 0.01);

        const animator = gameObject.GetComponent(Components.Animator);
//         console.log(animator)
//         animator.SetClipByIndex(0)
//           const animator = gameObject.GetComponent(Components.Animator);
//   console.log("Available clips:", animator.clips);
//         // animator.CrossFadeTo(0, 1000);

//         // animator.SetLayerClip(1, 2, 0.8);

  // Base: jog forward
  animator.SetClipByIndex(45); // Jog_Fwd_Loop


    }

    {
        const gameObject = await GLTFLoader.Load("/extra/test-assets/bouquet.glb", scene);
        gameObject.transform.position.x = -2;
        // gameObject.transform.scale.set(0.01, 0.01, 0.01);

        const animator = gameObject.GetComponent(Components.Animator);
        console.log(animator)
        // animator.SetClipByIndex(1)
        // animator.CrossFadeTo(0, 1000);

    }

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

            console.log(obj)
        });
    }
    Debugger.Enable();
    
    Runtime.Play();
};

Application(document.querySelector("canvas"));