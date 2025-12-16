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
import { PostProcessingPass } from "@trident/plugins/PostProcessing/PostProcessingPass";
import { PostProcessingSMAA } from "@trident/plugins/PostProcessing/effects/SMAA";
import { Sky } from "@trident/plugins/Environment/Sky";
import { Environment } from "@trident/plugins/Environment/Environment";
import { UIButtonStat, UITextureViewer } from "@trident/plugins/ui/UIStats";
import { Debugger } from "@trident/plugins/Debugger";

async function Application(canvas: HTMLCanvasElement) {
    const renderer = GPU.Renderer.Create(canvas, "webgpu");
    const scene = new Scene(renderer);

    const mainCameraGameObject = new GameObject(scene);
    mainCameraGameObject.name = "MainCamera";
    const camera = mainCameraGameObject.AddComponent(Components.Camera);
    camera.SetPerspective(72, canvas.width / canvas.height, 0.01, 500);


    mainCameraGameObject.transform.position.set(0, 0, 2);
    mainCameraGameObject.transform.LookAtV1(new Mathf.Vector3(0, 0, 0));

    const controls = new OrbitControls(canvas, camera);

    {
        const lightGameObject = new GameObject(scene);
        lightGameObject.transform.position.set(-4, -4, -4);
        lightGameObject.transform.LookAtV1(new Mathf.Vector3(0, 0, 0));
        const light = lightGameObject.AddComponent(Components.DirectionalLight);
        light.intensity = 3;
        light.color.set(1, 1, 1, 1);
        light.castShadows = false;
    }

    {
        const lightGameObject = new GameObject(scene);
        lightGameObject.transform.position.set(4, 4, 4);
        lightGameObject.transform.LookAtV1(new Mathf.Vector3(0, 0, 0));
        const light = lightGameObject.AddComponent(Components.DirectionalLight);
        light.intensity = 3;
        light.color.set(1, 1, 1, 1);
        light.castShadows = false;
    }

    {
        const lightGameObject = new GameObject(scene);
        lightGameObject.transform.position.set(4, 4, 4);
        lightGameObject.transform.LookAtV1(new Mathf.Vector3(0, 0, 0));
        const light = lightGameObject.AddComponent(Components.DirectionalLight);
        light.intensity = 1;
        light.color.set(1, 1, 1, 1);
        light.castShadows = false;
    }

    {
        const planeGO = new GameObject(scene);
        // planeGO.transform.eulerAngles.x = -90;
        planeGO.transform.position.set(0, 0, 0);
        planeGO.transform.scale.set(1, 1, 1);
        const sphereMesh = planeGO.AddComponent(Components.Mesh);
        sphereMesh.geometry = Geometry.Cube();
        const mat = new PBRMaterial({ metalness: 0.0, roughness: 1 });
        sphereMesh.material = mat;
    }

    const skyAtmosphere = new Sky();
    await skyAtmosphere.init();
    const skyTexture = skyAtmosphere.skyTextureCubemap;

    const environment = new Environment(scene, skyTexture);
    await environment.init();

    const postProcessing = new PostProcessingPass();
    const smaa = new PostProcessingSMAA();
    postProcessing.effects.push(smaa);
    scene.renderPipeline.AddPass(postProcessing, GPU.RenderPassOrder.BeforeScreenOutput);

    document.body.style.backgroundColor = "#404040";

    setTimeout(() => {
        new UIButtonStat(Debugger.ui, "Disable SMAA:", async value => {
            smaa.enabled = value;
        });
        const u0 = new UITextureViewer(Debugger.ui, "SMAA Edges", smaa.edgeTex);
        const u1 = new UITextureViewer(Debugger.ui, "SMAA Weights", smaa.weightsTex);
        setInterval(() => {
            u0.Update();
            u1.Update();
        }, 1000);
    }, 1000);
    
    Debugger.Enable();

    scene.Start();

};

Application(document.querySelector("canvas"));