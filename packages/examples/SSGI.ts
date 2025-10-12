import {
    GameObject,
    Geometry,
    Scene,
    Components,
    Mathf,
    PBRMaterial,
    GPU
} from "@trident/core";

import { OrbitControls } from "@trident/plugins/OrbitControls";
import { OBJLoaderIndexed } from "@trident/plugins/OBJLoader";
import { SSGIRenderPass } from "@trident/plugins/SSGI";
import { Debugger } from "@trident/plugins/Debugger";

async function Application(canvas: HTMLCanvasElement) {
    const renderer = GPU.Renderer.Create(canvas, "webgpu");

    const scene = new Scene(renderer);

    const mainCameraGameObject = new GameObject(scene);
    mainCameraGameObject.transform.position.set(0, 0, 20);
    mainCameraGameObject.name = "MainCamera";
    const camera = mainCameraGameObject.AddComponent(Components.Camera);
    camera.SetPerspective(72, canvas.width / canvas.height, 0.05, 512);


    const controls = new OrbitControls(canvas, camera);

    const lightGameObject = new GameObject(scene);
    lightGameObject.transform.position.set(2, 5, 10);
    lightGameObject.transform.LookAtV1(new Mathf.Vector3(0, 0, 0));
    // const light = lightGameObject.AddComponent(DirectionalLight);
    const light = lightGameObject.AddComponent(Components.SpotLight);
    light.range = 200;
    light.angle = 90;
    light.intensity = 100;
    light.color.set(1, 1, 1, 1);
    light.castShadows = true;

    const top = new GameObject(scene);
    top.transform.scale.set(100, 100, 1);
    top.transform.position.y = -5.1;
    top.transform.eulerAngles.x = -90;
    const meshtop = top.AddComponent(Components.Mesh);
    meshtop.geometry = Geometry.Plane();
    meshtop.material = new PBRMaterial();


    const roughness = 0.7;
    const metalness = 0.1;

    const topMaterial = new PBRMaterial({ albedoColor: new Mathf.Color(1, 1, 1, 1), roughness: roughness, metalness: metalness });
    const floorMaterial = new PBRMaterial({ albedoColor: new Mathf.Color(1, 1, 1, 1), roughness: roughness, metalness: metalness });
    
    const backMaterial = new PBRMaterial({ albedoColor: new Mathf.Color(1, 1, 1, 1), roughness: roughness, metalness: metalness });

    const leftMaterial = new PBRMaterial({ albedoColor: new Mathf.Color(1, 0, 0, 1), roughness: roughness, metalness: metalness });
    const rightMaterial = new PBRMaterial({ albedoColor: new Mathf.Color(0, 1, 0, 1), roughness: roughness, metalness: metalness });
    // const leftMaterial = new PBRMaterial({ albedoMap: await Texture.Load("./test-assets/textures/brick-wall-unity/brick-wall_normal-ogl.png"), roughness: roughness, metalness: metalness });
    // const rightMaterial = new PBRMaterial({ albedoMap: await Texture.Load("./test-assets/textures/brick-wall-unity/brick-wall_albedo.png"), roughness: roughness, metalness: metalness });

    const planeGeometry = Geometry.Plane();
    const cubeGeometry = Geometry.Cube();

    const floor = new GameObject(scene);
    floor.transform.scale.set(5, 5, 5);
    floor.transform.position.y = -5;
    floor.transform.eulerAngles.x = -90;
    const meshbottom = floor.AddComponent(Components.Mesh);
    meshbottom.geometry = planeGeometry;
    meshbottom.material = floorMaterial;

    const left = new GameObject(scene);
    left.transform.scale.set(0.05, 10, 10);
    left.transform.position.x = -5;
    // left.transform.eulerAngles.y = 90;
    const meshleft = left.AddComponent(Components.Mesh);
    meshleft.geometry = cubeGeometry;
    meshleft.material = leftMaterial;


    const right = new GameObject(scene);
    right.transform.scale.set(0.05, 10, 10);
    right.transform.position.x = 5;
    // right.transform.eulerAngles.y = -90;
    const meshright = right.AddComponent(Components.Mesh);
    meshright.geometry = cubeGeometry;
    meshright.material = rightMaterial;

    const back = new GameObject(scene);
    back.transform.scale.set(10, 10, 0.05);
    back.transform.position.z = -5;
    const meshback = back.AddComponent(Components.Mesh);
    meshback.geometry = cubeGeometry;
    meshback.material = backMaterial;

    const cube = new GameObject(scene);
    cube.transform.scale.set(2, 4, 2);
    cube.transform.position.set(-2, -3, -2);
    cube.transform.eulerAngles.y = 20;
    const cubeMesh = cube.AddComponent(Components.Mesh);
    cubeMesh.geometry = cubeGeometry;
    cubeMesh.material = new PBRMaterial({ albedoColor: new Mathf.Color(1, 1, 1, 1), roughness: roughness, metalness: metalness });

    const cube2 = new GameObject(scene);
    cube2.transform.scale.set(2, 2, 2);
    cube2.transform.position.set(2, -4, 2);
    cube2.transform.eulerAngles.y = 65;
    const cubeMesh2 = cube2.AddComponent(Components.Mesh);
    cubeMesh2.geometry = cubeGeometry;
    cubeMesh2.material = new PBRMaterial({ 
        emissiveColor: new Mathf.Color(1, 0, 0, 1),
        albedoColor: new Mathf.Color(1, 1, 1, 1), roughness: roughness, metalness: metalness });




    const bunny = (await OBJLoaderIndexed.load("./assets/models/bunny.obj"));
    const gameObject = new GameObject(scene);
    const mesh = gameObject.AddComponent(Components.Mesh)
    mesh.geometry = bunny.geometry;

    const m = new PBRMaterial({
        roughness: 0.1, metalness: 1
    });

    mesh.material = m;

    {
        const ssgi = new SSGIRenderPass();
        scene.renderPipeline.AddPass(ssgi, GPU.RenderPassOrder.AfterLighting);

        const viewerGO = new GameObject(scene);
        const viewerMesh = viewerGO.AddComponent(Components.Mesh);
        viewerMesh.geometry = Geometry.Plane();
        viewerMesh.material = new PBRMaterial({ albedoMap: ssgi.output, unlit: true });
    }

    Debugger.Enable();

    scene.Start();
};

Application(document.querySelector("canvas"));