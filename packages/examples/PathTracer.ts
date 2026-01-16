import {
    Geometry,
    Components,
    Scene,
    Renderer,
    Mathf,
    GameObject,
    PBRMaterial,
    GPU
} from "@trident/core";

import { OrbitControls } from "@trident/plugins/OrbitControls";
import { Debugger } from "@trident/plugins/Debugger";
import { PathTracer } from "@trident/plugins/PathTracer";
import { UITextureViewer } from "@trident/plugins/ui/UIStats";

async function Application(canvas: HTMLCanvasElement) {
    const renderer = Renderer.Create(canvas, "webgpu");
    const scene = new Scene(renderer);

    const mainCameraGameObject = new GameObject(scene);
    mainCameraGameObject.transform.position.set(0, 6, 16);
    mainCameraGameObject.transform.LookAtV1(new Mathf.Vector3(0, 2, 0));
    mainCameraGameObject.name = "MainCamera";
    const camera = mainCameraGameObject.AddComponent(Components.Camera);
    camera.SetPerspective(60, canvas.width / canvas.height, 0.1, 200);

    new OrbitControls(canvas, camera);

    const lightGameObject = new GameObject(scene);
    lightGameObject.transform.position.set(-4, 4, 4);
    lightGameObject.transform.LookAtV1(new Mathf.Vector3(0, 0, 0));
    const light = lightGameObject.AddComponent(Components.DirectionalLight);
    light.castShadows = true;
    light.intensity = 1

    {
        const floor = new GameObject(scene);
        floor.transform.scale.set(5, 5, 5);
        floor.transform.position.y = -5;
        floor.transform.eulerAngles.x = -90;
        const meshbottom = floor.AddComponent(Components.Mesh);
        meshbottom.geometry = Geometry.Plane();
        meshbottom.material = new PBRMaterial({ albedoColor: new Mathf.Color(0.73, 0.73, 0.73, 1.0), emissiveColor: new Mathf.Color(0,0,0,0), roughness: 0.0, metalness: 0.0 });

        const left = new GameObject(scene);
        left.transform.scale.set(0.05, 10, 10);
        left.transform.position.x = -5;
        const meshleft = left.AddComponent(Components.Mesh);
        meshleft.geometry = Geometry.Cube();
        meshleft.material = new PBRMaterial({ albedoColor: new Mathf.Color(0.65, 0.05, 0.05, 1.0), emissiveColor: new Mathf.Color(0,0,0,0), roughness: 0.0, metalness: 0.0 });

        const right = new GameObject(scene);
        right.transform.scale.set(0.05, 10, 10);
        right.transform.position.x = 5;
        right.transform.eulerAngles.y = -180;
        const meshright = right.AddComponent(Components.Mesh);
        meshright.geometry = Geometry.Cube();
        meshright.material = new PBRMaterial({ albedoColor: new Mathf.Color(0.12, 0.45, 0.15, 1.0), emissiveColor: new Mathf.Color(0,0,0,0), roughness: 0.0, metalness: 0.0 });

        const back = new GameObject(scene);
        back.transform.scale.set(10, 10, 0.05);
        back.transform.position.z = -5;
        const meshback = back.AddComponent(Components.Mesh);
        meshback.geometry = Geometry.Cube();
        meshback.material = new PBRMaterial({ albedoColor: new Mathf.Color(0.73, 0.73, 0.73, 1.0), emissiveColor: new Mathf.Color(0,0,0,0), roughness: 0.0, metalness: 0.0 });

        const top = new GameObject(scene);
        top.transform.scale.set(5, 5, 5);
        top.transform.position.y = 5;
        top.transform.eulerAngles.x = 90;
        const meshtop = top.AddComponent(Components.Mesh);
        meshtop.geometry = Geometry.Plane();
        meshtop.material = new PBRMaterial({ albedoColor: new Mathf.Color(0.73, 0.73, 0.73, 1.0), emissiveColor: new Mathf.Color(0,0,0,0), roughness: 0.0, metalness: 0.0 });

        const cube = new GameObject(scene);
        cube.transform.scale.set(2, 4, 2);
        cube.transform.position.set(-2, -3, -2);
        cube.transform.eulerAngles.y = 20;
        const cubeMesh = cube.AddComponent(Components.Mesh);
        cubeMesh.geometry = Geometry.Cube();
        cubeMesh.material = new PBRMaterial({ albedoColor: new Mathf.Color(0.73, 0.73, 0.73, 1.0), emissiveColor: new Mathf.Color(0,0,0,0), roughness: 0.0, metalness: 1.0 });

        const cube2 = new GameObject(scene);
        cube2.transform.scale.set(2, 2, 2);
        cube2.transform.position.set(2, -4, 2);
        cube2.transform.eulerAngles.y = 65;
        const cubeMesh2 = cube2.AddComponent(Components.Mesh);
        cubeMesh2.geometry = Geometry.Cube();
        cubeMesh2.material = new PBRMaterial({ albedoColor: new Mathf.Color(0.73, 0.73, 0.73, 1.0), emissiveColor: new Mathf.Color(0,0,0,0), roughness: 0.0, metalness: 0.0 });

        const light = new GameObject(scene);
        light.transform.scale.set(2, 0.1, 2);
        light.transform.position.set(0, 4.8, 0);
        const lightMesh = light.AddComponent(Components.Mesh);
        lightMesh.geometry = Geometry.Cube();
        lightMesh.material = new PBRMaterial({ albedoColor: new Mathf.Color(0.73, 0.73, 0.73, 1.0), emissiveColor: new Mathf.Color(15,15,15,1), roughness: 0.0, metalness: 0.0 });
    }


    const pathTracer = new PathTracer();
    scene.renderPipeline.AddPass(pathTracer, GPU.RenderPassOrder.AfterLighting);

    Debugger.Enable();

    scene.Start();
};

Application(document.querySelector("canvas"));
