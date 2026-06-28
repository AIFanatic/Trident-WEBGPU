import { GameObject, Geometry, Components, Mathf, PBRMaterial, GPU, Runtime, PlayerRuntime } from "@trident/core";

import { OrbitControls } from "@trident/plugins/OrbitControls";

import { UIFolder, UISliderStat, UIVecStat } from "@trident/plugins/ui/UIStats";
import { Debugger } from "@trident/plugins/Debugger";
import { PostProcessingPass } from "@trident/plugins/PostProcessing/PostProcessingPass";
import { PostProcessingBloom } from "@trident/plugins/PostProcessing/effects/Bloom";

async function Application(canvas: HTMLCanvasElement) {
    await PlayerRuntime.Create(canvas);
    const scene = PlayerRuntime.SceneManager.CreateScene("DefaultScene");
    PlayerRuntime.SceneManager.SetActiveScene(scene);

    const mainCameraGameObject = new GameObject();
    mainCameraGameObject.transform.position.set(0, 0, 20);
    mainCameraGameObject.name = "MainCamera";
    const camera = mainCameraGameObject.AddComponent(Components.Camera);
    camera.SetPerspective(72, canvas.width / canvas.height, 0.05, 512);
    mainCameraGameObject.AddComponent(OrbitControls);

    const lightGameObject = new GameObject();
    lightGameObject.transform.position.set(2, 5, 10);
    lightGameObject.transform.LookAt(new Mathf.Vector3(0, 0, 0));
    // const light = lightGameObject.AddComponent(DirectionalLight);
    const light = lightGameObject.AddComponent(Components.PointLight);
    light.range = 200;
    light.angle = 90;
    light.intensity = 10;
    light.color.set(1, 1, 1, 1);
    light.castShadows = true;

    {
        const lightFolder = new UIFolder(Debugger.ui, "Light");
        lightFolder.Open();

        new UIVecStat(lightFolder, "Position:",
        {value: light.transform.position.x, min: -10, max: 10, step: 0.1},
        {value: light.transform.position.y, min: -10, max: 10, step: 0.1},
        {value: light.transform.position.z, min: -10, max: 10, step: 0.1},
        undefined,
        value => {
            const p = new Mathf.Vector3(value.x, value.y, value.z)
            light.transform.position.copy(p);
            // l.SetFrom(p);
        });

        new UISliderStat(lightFolder, "Intensity:", 0, 100, 0.1, light.intensity, state => {light.intensity = state});
        new UISliderStat(lightFolder, "Angle:", 0, 100, 0.1, light.angle, state => {light.angle = state});
        new UISliderStat(lightFolder, "Range:", 0, 100, 0.1, light.range, state => {light.range = state});
    }

    const top = new GameObject();
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
    const rightMaterial = new PBRMaterial({ albedoColor: new Mathf.Color(0, 1, 0, 1), emissiveColor: new Mathf.Color(0,1,0,1), roughness: roughness, metalness: metalness });

    const planeGeometry = Geometry.Plane();
    const cubeGeometry = Geometry.Cube();

    const floor = new GameObject();
    floor.transform.scale.set(5, 5, 5);
    floor.transform.position.y = -5;
    floor.transform.eulerAngles.x = -90;
    const meshbottom = floor.AddComponent(Components.Mesh);
    meshbottom.geometry = planeGeometry;
    meshbottom.material = floorMaterial;

    const left = new GameObject();
    left.transform.scale.set(0.05, 10, 10);
    left.transform.position.x = -5;
    // left.transform.eulerAngles.y = 90;
    const meshleft = left.AddComponent(Components.Mesh);
    meshleft.geometry = cubeGeometry;
    meshleft.material = leftMaterial;


    const right = new GameObject();
    right.transform.scale.set(0.05, 10, 10);
    right.transform.position.x = 5;
    // right.transform.eulerAngles.y = -90;
    const meshright = right.AddComponent(Components.Mesh);
    meshright.geometry = cubeGeometry;
    meshright.material = rightMaterial;

    const back = new GameObject();
    back.transform.scale.set(10, 10, 0.05);
    back.transform.position.z = -5;
    const meshback = back.AddComponent(Components.Mesh);
    meshback.geometry = cubeGeometry;
    meshback.material = backMaterial;

    // const top = new GameObject();
    // top.transform.scale.set(5, 5, 5);
    // top.transform.position.y = 5;
    // top.transform.eulerAngles.x = 90;
    // const meshtop = top.AddComponent(Mesh);
    // meshtop.geometry = planeGeometry;
    // meshtop.material = topMaterial;


    const cube = new GameObject();
    cube.transform.scale.set(2, 4, 2);
    cube.transform.position.set(-2, -3, -2);
    cube.transform.eulerAngles.y = 20;
    const cubeMesh = cube.AddComponent(Components.Mesh);
    cubeMesh.geometry = cubeGeometry;
    cubeMesh.material = new PBRMaterial({ albedoColor: new Mathf.Color(1, 1, 1, 1), roughness: roughness, metalness: metalness });

    const cube2 = new GameObject();
    cube2.transform.scale.set(2, 2, 2);
    cube2.transform.position.set(2, -4, 2);
    cube2.transform.eulerAngles.y = 65;
    const cubeMesh2 = cube2.AddComponent(Components.Mesh);
    cubeMesh2.geometry = cubeGeometry;
    cubeMesh2.material = new PBRMaterial({ albedoColor: new Mathf.Color(1, 1, 1, 1), emissiveColor: new Mathf.Color(5,0,0,1), roughness: roughness, metalness: metalness });

    const lightGameObject2 = new GameObject();
    const light2 = lightGameObject2.AddComponent(Components.PointLight);
    light2.intensity = 10;
    light2.range = 20;
    light2.color.set(1, 0, 0, 1);
    light2.castShadows = false;
    light2.transform.position.copy(cube2.transform.position);



    const postProcessing = new PostProcessingPass();
    const bloom = new PostProcessingBloom();
    postProcessing.effects.push(bloom);
    Runtime.Renderer.RenderPipeline.AddPass(postProcessing, GPU.RenderPassOrder.AfterLighting);
};

Application(document.querySelector("canvas"));