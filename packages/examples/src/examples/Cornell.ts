import { Mesh } from "../components/Mesh";
import { GameObject } from "../GameObject";
import { Camera } from "../components/Camera";
import { Scene } from "../Scene";
import { Geometry, IndexAttribute, VertexAttribute } from "../Geometry";
import { Renderer } from "../renderer/Renderer";
import { OrbitControls } from "../plugins/OrbitControls";
import { Light } from "../components/Light";

import { Texture } from "../renderer/Texture";
import { DeferredMeshMaterial, ShadowMaterial } from "../renderer/Material";

import { OBJLoaderIndexed } from "../plugins/OBJLoader";
import { Color } from "../math/Color";
import { Vector3 } from "../math/Vector3";
import { UIStats } from "../plugins/UIStats";
import { InstancedMesh } from "../components/InstancedMesh";
import { Matrix4 } from "../math/Matrix4";
import { Quaternion } from "../math/Quaternion";

const canvas = document.createElement("canvas");
const aspectRatio = window.devicePixelRatio;
canvas.width = window.innerWidth * aspectRatio;
canvas.height = window.innerHeight * aspectRatio;
canvas.style.width = `${window.innerWidth}px`;
canvas.style.height = `${window.innerHeight}px`;
document.body.appendChild(canvas);

const ui = new UIStats();

async function Application() {
    const renderer = Renderer.Create(canvas, "webgpu");
    const scene = new Scene(renderer);
    const mainCameraGameObject = new GameObject(scene);
    mainCameraGameObject.transform.position.z = 15;
    mainCameraGameObject.name = "MainCamera";
    const camera = mainCameraGameObject.AddComponent(Camera);
    camera.SetPerspective(60, canvas.width / canvas.height, 0.01, 100000);
    // public fov = 60;
    // public aspect = 1;
    // public near = 0.01;
    // public far = 100000;

    const controls = new OrbitControls(camera);
    controls.connect(canvas);

    // alert(Renderer.SwapChainFormat)

    const planeGeometry = Geometry.Plane();
    const cubeGeometry = Geometry.Cube();

    // for (let i = 0; i < 16; i++) {
    const lightGameObject = new GameObject(scene);
    lightGameObject.transform.position.set(4, 4, 0);
    lightGameObject.transform.LookAt(new Vector3(0.01,0,0))
    const light = lightGameObject.AddComponent(Light);
    // light.radius = 1;
    light.intensity = 50
    light.color.set(0, 1, 0, 1);

    const lightGameObject2 = new GameObject(scene);
    lightGameObject2.transform.position.set(-4, 4, 0);
    lightGameObject2.transform.LookAt(new Vector3(0.01,0,0))
    const light2 = lightGameObject2.AddComponent(Light);
    light2.intensity = 50
    light2.color.set(1, 0, 0, 1);

    const lightHelperGameObject = new GameObject(scene);
    lightHelperGameObject.transform.position.copy(lightGameObject.transform.position);
    const lightGeometry = Geometry.Sphere();
    const lightHelperMesh = lightHelperGameObject.AddComponent(Mesh);
    lightHelperMesh.SetGeometry(lightGeometry);
    lightHelperMesh.AddMaterial(new DeferredMeshMaterial({ unlit: true, albedoColor: light.color }));


    const lightHelperGameObject2 = new GameObject(scene);
    lightHelperGameObject2.transform.position.copy(lightGameObject2.transform.position);
    const lightGeometry2 = Geometry.Sphere();
    const lightHelperMesh2 = lightHelperGameObject2.AddComponent(Mesh);
    lightHelperMesh2.SetGeometry(lightGeometry2);
    lightHelperMesh2.AddMaterial(new DeferredMeshMaterial({ unlit: true, albedoColor: light2.color }));

    function updateLight() {
        lightGameObject.transform.LookAt(new Vector3(0.01,0,0));
        lightHelperMesh.transform.position.copy(lightGameObject.transform.position)        
    }

    function updateLight2() {
        lightGameObject2.transform.LookAt(new Vector3(0.01,0,0));
        lightHelperMesh2.transform.position.copy(lightGameObject2.transform.position)        
    }
    ui.AddSlider("Light X", -10, 10, 0.1, light.transform.position.x, value => {
        lightGameObject.transform.position.x = value;
        updateLight();
    })

    ui.AddSlider("Light Y", -10, 10, 0.1, light.transform.position.y, value => {
        lightGameObject.transform.position.y = value;
        updateLight();
    })

    ui.AddSlider("Light Z", -10, 10, 0.1, light.transform.position.z, value => {
        lightGameObject.transform.position.z = value;
        updateLight();
    })

    ui.AddSlider("FOV", 1, 120, 0.1, 60, value => {
        light.camera.SetPerspective(value, Renderer.width / Renderer.height, 0.01, 1000);
        updateLight();
    })


    ui.AddSlider("Light2 X", -10, 10, 0.1, light2.transform.position.x, value => {
        lightGameObject2.transform.position.x = value;
        updateLight2();
    })

    ui.AddSlider("Light2 Y", -10, 10, 0.1, light2.transform.position.y, value => {
        lightGameObject2.transform.position.y = value;
        updateLight2();
    })

    ui.AddSlider("Light2 Z", -10, 10, 0.1, light2.transform.position.z, value => {
        lightGameObject2.transform.position.z = value;
        updateLight2();
    })

    
    // const albedo = await Texture.Load("./assets/textures/brick-wall-unity/brick-wall_albedo.png");
    // const normal = await Texture.Load("./assets/textures/brick-wall-unity/brick-wall_normal-ogl.png");
    // const ao = await Texture.Load("./assets/textures/brick-wall-unity/brick-wall_ao.png");
    // const height = await Texture.Load("./assets/textures/brick-wall-unity/brick-wall_height.png");

    // const albedo = await Texture.Load("./assets/textures/metal-compartments-unity/metal-compartments_albedo.png");
    // const normal = await Texture.Load("./assets/textures/metal-compartments-unity/metal-compartments_normal-ogl.png");
    // const ao = await Texture.Load("./assets/textures/metal-compartments-unity/metal-compartments_ao.png");
    // const height = await Texture.Load("./assets/textures/metal-compartments-unity/metal-compartments_height.png");
    
    // const albedo = await Texture.Load("./assets/textures/whispy-grass-meadow-unity/wispy-grass-meadow_albedo.png");
    // const normal = await Texture.Load("./assets/textures/whispy-grass-meadow-unity/wispy-grass-meadow_normal-ogl.png");
    // const ao = await Texture.Load("./assets/textures/whispy-grass-meadow-unity/wispy-grass-meadow_ao.png");
    // const height = await Texture.Load("./assets/textures/whispy-grass-meadow-unity/wispy-grass-meadow_height.png");

    // const albedo = await Texture.Load("./assets/textures/ash-tree-bark-unity/ash-tree-bark_albedo.png");
    // const normal = await Texture.Load("./assets/textures/ash-tree-bark-unity/ash-tree-bark_normal-ogl.png");
    // const ao = await Texture.Load("./assets/textures/ash-tree-bark-unity/ash-tree-bark_ao.png");
    // const height = await Texture.Load("./assets/textures/ash-tree-bark-unity/ash-tree-bark_height.png");

    // const albedo = await Texture.Load("./assets/textures/Dirt02_MR_2K/Dirt02_2k_BaseColor.png");
    // const normal = await Texture.Load("./assets/textures/Dirt02_MR_2K/Dirt02_2k_Normal.png");
    // const ao = await Texture.Load("./assets/textures/Dirt02_MR_2K/Dirt02_2k_AO.png");
    // const height = await Texture.Load("./assets/textures/Dirt02_MR_2K/Dirt02_2k_Height.png");

    // albedo.GenerateMips();
    // normal.GenerateMips();
    // ao.GenerateMips();
    // height.GenerateMips();

    const roughness = 0.7;
    const metalness = 0.1;
    const topMaterial = new DeferredMeshMaterial({albedoColor: new Color(1,1,1,1), roughness: roughness, metalness: metalness});
    const floorMaterial = new DeferredMeshMaterial({albedoColor: new Color(1,1,1,1), roughness: roughness, metalness: metalness});
    const backMaterial = new DeferredMeshMaterial({albedoColor: new Color(1,1,1,1), roughness: roughness, metalness: metalness});

    const leftMaterial = new DeferredMeshMaterial({albedoColor: new Color(1,0,0,1), roughness: roughness, metalness: metalness});
    const rightMaterial = new DeferredMeshMaterial({albedoColor: new Color(0,1,0,1), roughness: roughness, metalness: metalness});

    const floor = new GameObject(scene);
    floor.transform.scale.set(5, 5, 5);
    floor.transform.position.y = -5;
    floor.transform.eulerAngles.x = -90;
    const meshbottom = floor.AddComponent(Mesh);
    meshbottom.SetGeometry(planeGeometry);
    meshbottom.AddMaterial(floorMaterial);
    meshbottom.AddMaterial(new ShadowMaterial(light));
    meshbottom.AddMaterial(new ShadowMaterial(light2));

    const left = new GameObject(scene);
    left.transform.scale.set(5, 5, 5);
    left.transform.position.x = -5;
    left.transform.eulerAngles.y = 90;
    const meshleft = left.AddComponent(Mesh);
    meshleft.SetGeometry(planeGeometry);
    meshleft.AddMaterial(leftMaterial);
    meshleft.AddMaterial(new ShadowMaterial(light));
    meshleft.AddMaterial(new ShadowMaterial(light2));


    const right = new GameObject(scene);
    right.transform.scale.set(5, 5, 5);
    right.transform.position.x = 5;
    right.transform.eulerAngles.y = -90;
    const meshright = right.AddComponent(Mesh);
    meshright.SetGeometry(planeGeometry);
    meshright.AddMaterial(rightMaterial);
    meshright.AddMaterial(new ShadowMaterial(light));
    meshright.AddMaterial(new ShadowMaterial(light2));

    const back = new GameObject(scene);
    back.transform.scale.set(5, 5, 5);
    back.transform.position.z = -5;
    const meshback = back.AddComponent(Mesh);
    meshback.SetGeometry(planeGeometry);
    meshback.AddMaterial(backMaterial);
    meshback.AddMaterial(new ShadowMaterial(light));
    meshback.AddMaterial(new ShadowMaterial(light2));

    const top = new GameObject(scene);
    top.transform.scale.set(5, 5, 5);
    top.transform.position.y = 5;
    top.transform.eulerAngles.x = 90;
    const meshtop = top.AddComponent(Mesh);
    meshtop.SetGeometry(planeGeometry);
    meshtop.AddMaterial(topMaterial);
    meshtop.AddMaterial(new ShadowMaterial(light));
    meshtop.AddMaterial(new ShadowMaterial(light2));


    const cube = new GameObject(scene);
    cube.transform.scale.set(2, 4, 2);
    cube.transform.position.set(-2, -3, -2);
    cube.transform.eulerAngles.y = 20;
    const cubeMesh = cube.AddComponent(Mesh);
    cubeMesh.SetGeometry(cubeGeometry);
    cubeMesh.AddMaterial(new DeferredMeshMaterial({albedoColor: new Color(1,1,1,1), roughness: roughness, metalness: metalness}));
    cubeMesh.AddMaterial(new ShadowMaterial(light));
    cubeMesh.AddMaterial(new ShadowMaterial(light2));

    const cube2 = new GameObject(scene);
    cube2.transform.scale.set(2, 2, 2);
    cube2.transform.position.set(2, -4, 2);
    cube2.transform.eulerAngles.y = 65;
    const cubeMesh2 = cube2.AddComponent(Mesh);
    cubeMesh2.SetGeometry(cubeGeometry);
    cubeMesh2.AddMaterial(new DeferredMeshMaterial({albedoColor: new Color(1,1,1,1), roughness: roughness, metalness: metalness}));
    cubeMesh2.AddMaterial(new ShadowMaterial(light));
    cubeMesh2.AddMaterial(new ShadowMaterial(light2));




    // const instancedCubeGameObject = new GameObject(scene);
    // const instancedCubeMesh = instancedCubeGameObject.AddComponent(InstancedMesh);
    // instancedCubeMesh.SetGeometry(cubeGeometry);
    // instancedCubeMesh.AddMaterial(new DeferredMeshMaterial({roughness: 0.1, metalness: 0.3}));
    // instancedCubeMesh.AddMaterial(new ShadowMaterial(light));
    // instancedCubeMesh.AddMaterial(new ShadowMaterial(light2));

    // const tempMatrix = new Matrix4();
    // const tempPosition = new Vector3();
    // const tempRotation = new Quaternion();
    // const tempScale = new Vector3(1,1,1);
    // const n = 10;
    // let i = 0;
    // for (let x = 0; x < n; x++) {
    //     for (let y = 0; y < n; y++) {
    //         for (let z = 0; z < n; z++) {
    //             tempPosition.set(x * 2, y * 2, z * 2);
    //             tempMatrix.compose(tempPosition, tempRotation, tempScale);
    //             instancedCubeMesh.SetMatrixAt(i, tempMatrix);
    //             i++;
    //         }
    //     }
    // }

    scene.Start();
}

Application();