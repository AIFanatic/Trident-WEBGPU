import { GameObject } from "../GameObject";
import { Geometry, VertexAttribute } from "../Geometry";
import { Scene } from "../Scene";
import { Camera } from "../components/Camera";
import { DirectionalLight, PointLight, SpotLight } from "../components/Light";
import { Mesh } from "../components/Mesh";
import { Vector3 } from "../math/Vector3";
import { OrbitControls } from "../plugins/OrbitControls";
import { PBRMaterial } from "../renderer/Material";
import { Renderer } from "../renderer/Renderer";
import { PassParams, RenderPassOrder } from "../renderer/RenderingPipeline";
import { DeferredGBufferPass } from "../renderer/passes/DeferredGBufferPass";

import { Color } from "../math/Color";
import { Line } from "../plugins/Line";
import { Debugger } from "../plugins/Debugger";
import { UIFolder, UISliderStat, UIVecStat } from "../plugins/ui/UIStats";
import { RSMIndirectLighting } from "../plugins/RSMIndirectLighting";
import { Texture } from "../renderer/Texture";
import { GLTFParser } from "../plugins/GLTF/GLTF_Parser";
import { Object3D } from "../Object3D";
import { OBJLoaderIndexed } from "../plugins/OBJLoader";
import { Shader } from "../renderer/Shader";
import { Bloom } from "../plugins/Bloom";

const canvas = document.createElement("canvas");
const aspectRatio = 1;
canvas.width = window.innerWidth * aspectRatio;
canvas.height = window.innerHeight * aspectRatio;
canvas.style.width = `${window.innerWidth}px`;
canvas.style.height = `${window.innerHeight}px`;
document.body.appendChild(canvas);


async function Application() {
    const renderer = Renderer.Create(canvas, "webgpu");

    const scene = new Scene(renderer);

    const mainCameraGameObject = new GameObject(scene);
    mainCameraGameObject.transform.position.set(0, 0, 20);
    mainCameraGameObject.name = "MainCamera";
    const camera = mainCameraGameObject.AddComponent(Camera);
    camera.SetPerspective(72, canvas.width / canvas.height, 0.05, 512);


    const controls = new OrbitControls(canvas, camera);

    const lightGameObject = new GameObject(scene);
    lightGameObject.transform.position.set(2, 5, 10);
    lightGameObject.transform.LookAtV1(new Vector3(0, 0, 0));
    // const light = lightGameObject.AddComponent(DirectionalLight);
    const light = lightGameObject.AddComponent(SpotLight);
    light.range = 200;
    light.angle = 90;
    light.intensity = 10;
    light.color.set(1, 1, 1, 1);
    light.castShadows = true;
    const l = new Line(scene, lightGameObject.transform.position, new Vector3(0, 0, 0));


    {
        const lightFolder = new UIFolder(Debugger.ui, "Light");
        lightFolder.Open();

        new UIVecStat(lightFolder, "Position:", light.transform.position, value => {
            const p = new Vector3(value.x, value.y, value.z)
            light.transform.position.copy(p);
            l.SetFrom(p);
        });

        new UISliderStat(lightFolder, "Intensity:", 0, 100, 0.1, light.intensity, state => {light.intensity = state});
    }

    const top = new GameObject(scene);
    top.transform.scale.set(100, 100, 1);
    top.transform.position.y = -5.1;
    top.transform.eulerAngles.x = -90;
    const meshtop = top.AddComponent(Mesh);
    meshtop.SetGeometry(Geometry.Plane());
    meshtop.AddMaterial(new PBRMaterial());


    const roughness = 0.7;
    const metalness = 0.1;

    const topMaterial = new PBRMaterial({ albedoColor: new Color(1, 1, 1, 1), roughness: roughness, metalness: metalness });
    const floorMaterial = new PBRMaterial({ albedoColor: new Color(1, 1, 1, 1), roughness: roughness, metalness: metalness });
    
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
    //     // albedoColor: new Color(1, 1, 1, 1), roughness: roughness, metalness: metalness
    // });

    const backMaterial = new PBRMaterial({ albedoColor: new Color(1, 1, 1, 1), roughness: roughness, metalness: metalness });

    const leftMaterial = new PBRMaterial({ albedoColor: new Color(1, 0, 0, 1), roughness: roughness, metalness: metalness });
    const rightMaterial = new PBRMaterial({ albedoColor: new Color(0, 1, 0, 1), emissiveColor: new Color(0,1,0,1), roughness: roughness, metalness: metalness });
    // const leftMaterial = new PBRMaterial({ albedoMap: await Texture.Load("./test-assets/textures/brick-wall-unity/brick-wall_normal-ogl.png"), roughness: roughness, metalness: metalness });
    // const rightMaterial = new PBRMaterial({ albedoMap: await Texture.Load("./test-assets/textures/brick-wall-unity/brick-wall_albedo.png"), roughness: roughness, metalness: metalness });

    const planeGeometry = Geometry.Plane();
    const cubeGeometry = Geometry.Cube();

    const floor = new GameObject(scene);
    floor.transform.scale.set(5, 5, 5);
    floor.transform.position.y = -5;
    floor.transform.eulerAngles.x = -90;
    const meshbottom = floor.AddComponent(Mesh);
    meshbottom.SetGeometry(planeGeometry);
    meshbottom.AddMaterial(floorMaterial);

    const left = new GameObject(scene);
    left.transform.scale.set(0.05, 10, 10);
    left.transform.position.x = -5;
    // left.transform.eulerAngles.y = 90;
    const meshleft = left.AddComponent(Mesh);
    meshleft.SetGeometry(cubeGeometry);
    meshleft.AddMaterial(leftMaterial);


    const right = new GameObject(scene);
    right.transform.scale.set(0.05, 10, 10);
    right.transform.position.x = 5;
    // right.transform.eulerAngles.y = -90;
    const meshright = right.AddComponent(Mesh);
    meshright.SetGeometry(cubeGeometry);
    meshright.AddMaterial(rightMaterial);

    const back = new GameObject(scene);
    back.transform.scale.set(10, 10, 0.05);
    back.transform.position.z = -5;
    const meshback = back.AddComponent(Mesh);
    meshback.SetGeometry(cubeGeometry);
    meshback.AddMaterial(backMaterial);

    // const top = new GameObject(scene);
    // top.transform.scale.set(5, 5, 5);
    // top.transform.position.y = 5;
    // top.transform.eulerAngles.x = 90;
    // const meshtop = top.AddComponent(Mesh);
    // meshtop.SetGeometry(planeGeometry);
    // meshtop.AddMaterial(topMaterial);


    const cube = new GameObject(scene);
    cube.transform.scale.set(2, 4, 2);
    cube.transform.position.set(-2, -3, -2);
    cube.transform.eulerAngles.y = 20;
    const cubeMesh = cube.AddComponent(Mesh);
    cubeMesh.SetGeometry(cubeGeometry);
    cubeMesh.AddMaterial(new PBRMaterial({ albedoColor: new Color(1, 1, 1, 1), roughness: roughness, metalness: metalness }));

    const cube2 = new GameObject(scene);
    cube2.transform.scale.set(2, 2, 2);
    cube2.transform.position.set(2, -4, 2);
    cube2.transform.eulerAngles.y = 65;
    const cubeMesh2 = cube2.AddComponent(Mesh);
    cubeMesh2.SetGeometry(cubeGeometry);
    cubeMesh2.AddMaterial(new PBRMaterial({ albedoColor: new Color(1, 1, 1, 1), emissiveColor: new Color(5,0,0,1), roughness: roughness, metalness: metalness }));

    const lightGameObject2 = new GameObject(scene);
    const light2 = lightGameObject2.AddComponent(PointLight);
    light2.intensity = 10;
    light2.color.set(1, 0, 0, 1);
    light2.castShadows = false;
    light2.transform.position.copy(cube2.transform.position);




    const bloom = new Bloom();
    // @ts-ignore
    await bloom.init(scene.renderPipeline.renderGraph.resourcePool);

    scene.renderPipeline.AddPass(bloom, RenderPassOrder.AfterLighting);
    
    // Viewer
    {
        const viewerGO = new GameObject(scene);
        viewerGO.transform.scale.set(3,3,3)
        const viewerMesh = viewerGO.AddComponent(Mesh);
        viewerMesh.SetGeometry(Geometry.Plane());
        viewerMesh.AddMaterial(new PBRMaterial({ albedoMap: bloom.output, unlit: true }));
    }

    scene.renderPipeline.AddPass(new DeferredGBufferPass(), RenderPassOrder.BeforeGBuffer);

    scene.Start();
};

Application();