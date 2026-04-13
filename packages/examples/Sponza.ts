import {
    Components,
    Mathf,
    GameObject,
    PBRMaterial,
    Runtime,
    GPU
} from "@trident/core";

import { OrbitControls } from "@trident/plugins/OrbitControls";
import { Debugger } from "@trident/plugins/Debugger";

import { GLTFLoader } from "@trident/plugins/GLTF/GLTFLoader";
import { PointLightHelper } from "@trident/plugins/PointLightHelper";
import { PostProcessingPass } from "@trident/plugins/PostProcessing/PostProcessingPass";
import { PostProcessingSMAA } from "@trident/plugins/PostProcessing/effects/SMAA";

async function Application(canvas: HTMLCanvasElement) {
    await Runtime.Create(canvas);
    const scene = Runtime.SceneManager.CreateScene("DefaultScene");
    Runtime.SceneManager.SetActiveScene(scene);

    const mainCameraGameObject = new GameObject(scene);
    mainCameraGameObject.name = "MainCamera";
    const camera = mainCameraGameObject.AddComponent(Components.Camera);
    camera.SetPerspective(72, canvas.width / canvas.height, 0.5, 10000);


    mainCameraGameObject.transform.position.set(0, 0, 10);
    mainCameraGameObject.transform.LookAtV1(new Mathf.Vector3(0, 0, 0));

    const controls = new OrbitControls(canvas, camera);

    const lightGameObject = new GameObject(scene);
    lightGameObject.transform.position.set(-10, 10, 10);
    lightGameObject.transform.LookAtV1(new Mathf.Vector3(0, 0, 0));
    const light = lightGameObject.AddComponent(Components.DirectionalLight);
    light.castShadows = true;
    light.intensity = 0.01

    function traverse(gameObjects: GameObject[], fn: (gameObject: GameObject) => void) {
        for (const gameObject of gameObjects) {
            fn(gameObject);
            for (const child of gameObject.transform.children) {
                traverse([child.gameObject], fn);
            }
        }
    }

    const rootGameObject = await GLTFLoader.Load("/extra/test-assets/scenes/Bistro.glb", scene);
    // const rootGameObject = await GLTFLoader.Load("/extra/test-assets/scenes/Sponza.glb", scene);

    Debugger.Enable();

    let lightCount = 0;
    traverse([rootGameObject], gameObject => {
        const mesh = gameObject.GetComponent(Components.Mesh);
        if (mesh) {
            const mat = (mesh.material as PBRMaterial).params;
            // mesh.enableShadows = false;
            if (mat.emissiveMap.width > 1 || mat.emissiveColor.r > 0) {
                // const pointLightGO = new GameObject(scene);
                const pointLight = gameObject.AddComponent(Components.PointLight);
                // const pointlightHelper = gameObject.AddComponent(PointLightHelper);
                // pointlightHelper.light = pointLight;
                pointLight.intensity = 10;
                pointLight.range = 50;
                // pointLightGO.transform.position.copy(gameObject.transform.position)
                mat.emissiveMap.GetPixels(0, 0, 1, 1, 0).then(pixel => {
                    pointLight.color.set(pixel[0] / 255, pixel[1] / 255, pixel[2] / 255, 1);
                })
                lightCount++;
            }
        }
    })

    console.log(lightCount)

        const postProcessing = new PostProcessingPass();
        // postProcessing.effects.push(new PostProcessingFog());
        // postProcessing.effects.push(new PostProcessingFXAA());
        const smaa = new PostProcessingSMAA();
        postProcessing.effects.push(smaa);
        Runtime.Renderer.RenderPipeline.AddPass(postProcessing, GPU.RenderPassOrder.BeforeScreenOutput);
        
    Runtime.Play();
};

Application(document.querySelector("canvas"));