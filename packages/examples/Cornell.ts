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
import { Debugger } from "@trident/plugins/Debugger";

import { PostProcessingFXAA } from "@trident/plugins/PostProcessing/effects/FXAA";
import { PostProcessingSMAA } from "@trident/plugins/PostProcessing/effects/SMAA";
import { PostProcessingPass } from "@trident/plugins/PostProcessing/PostProcessingPass";

async function Application(canvas: HTMLCanvasElement) {
    const renderer = GPU.Renderer.Create(canvas, "webgpu");
    const scene = new Scene(renderer);

    const mainCameraGameObject = new GameObject(scene);
    mainCameraGameObject.name = "MainCamera";
    const camera = mainCameraGameObject.AddComponent(Components.Camera);
    camera.SetPerspective(72, canvas.width / canvas.height, 0.5, 100);


    mainCameraGameObject.transform.position.set(0, 0, 10);
    mainCameraGameObject.transform.LookAtV1(new Mathf.Vector3(0, 0, 0));

    const controls = new OrbitControls(canvas, camera);

    const lightGameObject = new GameObject(scene);
    lightGameObject.transform.position.set(-10, 10, 10);
    lightGameObject.transform.LookAtV1(new Mathf.Vector3(0, 0, 0));
    const light = lightGameObject.AddComponent(Components.DirectionalLight);
    light.castShadows = true;

    

    // const top = new GameObject(scene);
    // top.transform.scale.set(100, 100, 1);
    // top.transform.position.y = -5.1;
    // top.transform.eulerAngles.x = -90;
    // const meshtop = top.AddComponent(Components.Mesh);
    // meshtop.SetGeometry(Geometry.Plane());
    // meshtop.AddMaterial(new PBRMaterial());


    const roughness = 0.7;
    const metalness = 0.1;

    const topMaterial = new PBRMaterial({ albedoColor: new Mathf.Color(1, 1, 1, 1), roughness: roughness, metalness: metalness });
    const floorMaterial = new PBRMaterial({ albedoColor: new Mathf.Color(1, 1, 1, 1), roughness: roughness, metalness: metalness });
    
    // const albedoMap = await Texture.Load("./test-assets/textures/brick-wall-unity/brick-wall_albedo.png");
    // const normalMap = await Texture.Load("./test-assets/textures/brick-wall-unity/brick-wall_normal-ogl.png");
    // const metalnessMap = await Texture.Load("./test-assets/textures/brick-wall-unity/brick-wall_metallic.png");
    // albedoMap.GenerateMips();
    // normalMap.GenerateMips();
    // metalnessMap.GenerateMips();
    // const backMaterial = new PBRMaterial({
    //     albedoMap: albedoMap,
    //     normalMap: normalMap,
    //     metalnessMap: metalnessMap,
    //     roughness: 0.1, metalness: 0.3
    //     // albedoColor: new Mathf.Color(1, 1, 1, 1), roughness: roughness, metalness: metalness
    // });

    const backMaterial = new PBRMaterial({ albedoColor: new Mathf.Color(1, 1, 1, 1), roughness: roughness, metalness: metalness });

    const leftMaterial = new PBRMaterial({ albedoColor: new Mathf.Color(1, 0, 0, 1), roughness: roughness, metalness: metalness });
    const rightMaterial = new PBRMaterial({ albedoColor: new Mathf.Color(0, 1, 0, 1), roughness: roughness, metalness: metalness });
    // const leftMaterial = new PBRMaterial({ albedoMap: await Texture.Load("./test-assets/textures/brick-wall-unity/brick-wall_normal-ogl.png"), roughness: roughness, metalness: metalness });
    // const rightMaterial = new PBRMaterial({ albedoMap: await Texture.Load("./test-assets/textures/brick-wall-unity/brick-wall_albedo.png"), roughness: roughness, metalness: metalness });

    const floor = new GameObject(scene);
    floor.transform.scale.set(5, 5, 5);
    floor.transform.position.y = -5;
    floor.transform.eulerAngles.x = -90;
    const meshbottom = floor.AddComponent(Components.Mesh);
    meshbottom.SetGeometry(Geometry.Plane());
    meshbottom.AddMaterial(floorMaterial);

    const left = new GameObject(scene);
    left.transform.scale.set(0.05, 10, 10);
    left.transform.position.x = -5;
    // left.transform.eulerAngles.y = 90;
    const meshleft = left.AddComponent(Components.Mesh);
    meshleft.SetGeometry(Geometry.Cube());
    meshleft.AddMaterial(leftMaterial);


    const right = new GameObject(scene);
    right.transform.scale.set(0.05, 10, 10);
    right.transform.position.x = 5;
    // right.transform.eulerAngles.y = -90;
    const meshright = right.AddComponent(Components.Mesh);
    meshright.SetGeometry(Geometry.Cube());
    meshright.AddMaterial(rightMaterial);

    const back = new GameObject(scene);
    back.transform.scale.set(10, 10, 0.05);
    back.transform.position.z = -5;
    const meshback = back.AddComponent(Components.Mesh);
    meshback.SetGeometry(Geometry.Cube());
    meshback.AddMaterial(backMaterial);

    const top = new GameObject(scene);
    top.transform.scale.set(5, 5, 5);
    top.transform.position.y = 5;
    top.transform.eulerAngles.x = 90;
    const meshtop = top.AddComponent(Components.Mesh);
    meshtop.SetGeometry(Geometry.Plane());
    meshtop.AddMaterial(topMaterial);


    const cube = new GameObject(scene);
    cube.transform.scale.set(2, 4, 2);
    cube.transform.position.set(-2, -3, -2);
    cube.transform.eulerAngles.y = 20;
    const cubeMesh = cube.AddComponent(Components.Mesh);
    cubeMesh.SetGeometry(Geometry.Cube());
    cubeMesh.AddMaterial(new PBRMaterial({ albedoColor: new Mathf.Color(1, 1, 1, 1), roughness: roughness, metalness: metalness }));

    const cube2 = new GameObject(scene);
    cube2.transform.scale.set(2, 2, 2);
    cube2.transform.position.set(2, -4, 2);
    cube2.transform.eulerAngles.y = 65;
    const cubeMesh2 = cube2.AddComponent(Components.Mesh);
    cubeMesh2.SetGeometry(Geometry.Cube());
    cubeMesh2.AddMaterial(new PBRMaterial({ 
        emissiveColor: new Mathf.Color(1, 0, 0, 1),
        albedoColor: new Mathf.Color(1, 1, 1, 1), roughness: roughness, metalness: metalness }));



    const postProcessing = new PostProcessingPass();
    postProcessing.effects.push(new PostProcessingFXAA());
    // postProcessing.effects.push(new PostProcessingSMAA());
    scene.renderPipeline.AddPass(postProcessing, GPU.RenderPassOrder.AfterLighting);
    Debugger.Enable();


    scene.Start();
};

Application(document.querySelector("canvas"));