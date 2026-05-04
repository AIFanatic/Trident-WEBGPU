import {
    Geometry,
    Components,
    Scene,
    Mathf,
    GPU,
    GameObject,
    PBRMaterial,
    Renderer,
    Runtime,
} from "@trident/core";

import { OrbitControls } from "@trident/plugins/OrbitControls";
import { DirectionalLightHelper } from "@trident/plugins/DirectionalLightHelper";
import { SpotLightHelper } from "@trident/plugins/SpotLightHelper";

async function Application(canvas: HTMLCanvasElement) {
    await Runtime.Create(canvas);
    const scene = Runtime.SceneManager.CreateScene("DefaultScene");
    Runtime.SceneManager.SetActiveScene(scene);

    const mainCameraGameObject = new GameObject();
    mainCameraGameObject.transform.position.set(0, 0, 10);
    mainCameraGameObject.name = "MainCamera";
    const camera = mainCameraGameObject.AddComponent(Components.Camera);
    camera.SetPerspective(60, canvas.width / canvas.height, 0.05, 512);

    const observer = new ResizeObserver(entries => {
        camera.SetPerspective(60, canvas.width / canvas.height, 0.05, 512);
    });
    observer.observe(canvas);


    const controls = new OrbitControls(canvas, camera);

    {
        const lightGameObject = new GameObject();
        lightGameObject.transform.position.set(-2, 4, 0.01);
        lightGameObject.transform.LookAtV1(new Mathf.Vector3(0, 0, 0));
        const light = lightGameObject.AddComponent(Components.SpotLight);
        light.intensity = 1;
    
        const lightHelper = lightGameObject.AddComponent(SpotLightHelper);
        lightHelper.light = light;
    }

    {
        const lightGameObject = new GameObject();
        lightGameObject.transform.position.set(2, 4, 0.01);
        lightGameObject.transform.LookAtV1(new Mathf.Vector3(0, 0, 0));
        const light = lightGameObject.AddComponent(Components.DirectionalLight);
        light.intensity = 1;
    
        const lightHelper = lightGameObject.AddComponent(DirectionalLightHelper);
        lightHelper.light = light;
    }

    {
        const planeGO = new GameObject();
        planeGO.transform.eulerAngles.x = -90;
        planeGO.transform.position.set(0, -2, 0);
        planeGO.transform.scale.set(10, 10, 1);
        const sphereMesh = planeGO.AddComponent(Components.Mesh);
        sphereMesh.geometry = Geometry.Plane();
        const mat = new PBRMaterial({ albedoColor: new Mathf.Color(1, 1, 1), metalness: 0.0, roughness: 1 });
        sphereMesh.material = mat;
    }


    {
        const sphereGameObject = new GameObject();
        sphereGameObject.transform.position.set(1, -1.5, 0);
        const sphereMesh = sphereGameObject.AddComponent(Components.Mesh);
        sphereMesh.geometry = Geometry.Sphere();
        const mat = new PBRMaterial({ albedoColor: new Mathf.Color(1, 1, 1), metalness: 1.0, roughness: 0.0 });
        sphereMesh.material = mat;
    }

    {
        const sphereGameObject = new GameObject();
        sphereGameObject.transform.position.set(-3, -1.5, 0);
        const sphereMesh = sphereGameObject.AddComponent(Components.Mesh);
        sphereMesh.geometry = Geometry.Sphere();
        const mat = new PBRMaterial({ albedoColor: new Mathf.Color(1, 1, 1), metalness: 0.0, roughness: 0.0 });
        sphereMesh.material = mat;
    }

    {
        const sphereGameObject = new GameObject();
        sphereGameObject.transform.position.set(-1, -1.5, 0);
        const sphereMesh = sphereGameObject.AddComponent(Components.Mesh);
        sphereMesh.geometry = Geometry.Sphere();
        const mat = new PBRMaterial({ albedoColor: new Mathf.Color(1, 1, 1), metalness: 0.0, roughness: 1.0 });
        sphereMesh.material = mat;
    }

    Runtime.Play();
};

Application(document.querySelector("canvas"));