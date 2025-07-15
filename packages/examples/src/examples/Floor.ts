import { Mesh } from "../components/Mesh";
import { GameObject } from "../GameObject";
import { Camera } from "../components/Camera";
import { Scene } from "../Scene";
import { Geometry } from "../Geometry";
import { Renderer } from "../renderer/Renderer";
import { OrbitControls } from "../plugins/OrbitControls";
import { DirectionalLight } from "../components/Light";

import { Texture } from "../renderer/Texture";
import { DeferredMeshMaterial } from "../renderer/Material";

import { Color } from "../math/Color";
import { Vector3 } from "../math/Vector3";
import { Debugger } from "../plugins/Debugger";
import { ComputeContext } from "../renderer/ComputeContext";
import { Buffer, BufferType } from "../renderer/Buffer";
import { Compute } from "../renderer/Shader";
import { InstancedMesh } from "../components/InstancedMesh";
import { Matrix4 } from "../math/Matrix4";
import { Quaternion } from "../math/Quaternion";

const canvas = document.createElement("canvas");
const aspectRatio = 1
canvas.width = window.innerWidth * aspectRatio;
canvas.height = window.innerHeight * aspectRatio;
canvas.style.width = `${window.innerWidth}px`;
canvas.style.height = `${window.innerHeight}px`;
document.body.appendChild(canvas);

async function Application() {
    const renderer = Renderer.Create(canvas, "webgpu");
    const scene = new Scene(renderer);
    const mainCameraGameObject = new GameObject(scene);
    mainCameraGameObject.transform.position.z = 15;
    mainCameraGameObject.name = "MainCamera";
    const camera = mainCameraGameObject.AddComponent(Camera);
    // camera.SetPerspective(60, canvas.width / canvas.height, 0.01, 100000);
    camera.SetPerspective(36, canvas.width / canvas.height, 0.5, 500);
    // Math.PI / 5,
    // this.presentationSize[0] / this.presentationSize[1],
    // 0.5,
    // 500
    // public fov = 60;
    // public aspect = 1;
    // public near = 0.01;
    // public far = 100000;

    const controls = new OrbitControls(camera);
    controls.connect(canvas);

    // alert(Renderer.SwapChainFormat)

    const planeGeometry = Geometry.Plane();
    const cubeGeometry = Geometry.Cube();

    const lightGameObject = new GameObject(scene);
    lightGameObject.transform.position.set(4, 4, 0);
    lightGameObject.transform.LookAt(new Vector3(0, 0, 0))
    const light = lightGameObject.AddComponent(DirectionalLight);
    light.intensity = 10;
    light.range = 100;
    light.color.set(1, 0, 0, 1);

    // {
    //     const lightGameObject = new GameObject(scene);
    //     lightGameObject.transform.position.set(-4, 4, 0);
    //     lightGameObject.transform.LookAt(new Vector3(0, 0, 0))
    //     const light = lightGameObject.AddComponent(DirectionalLight);
    //     light.intensity = 10;
    //     light.range = 100;
    //     light.color.set(0, 1, 0, 1);
    // }

    // SPOT_LIGHT,          L D, S D
    // DIRECTIONAL_LIGHT,   L D, S D
    // POINT_LIGHT,
    // AREA_LIGHT

    
    const lightHelperGameObject = new GameObject(scene);
    lightHelperGameObject.transform.position.copy(lightGameObject.transform.position);
    lightHelperGameObject.transform.eulerAngles.x = 90;
    const lightHelperMesh = lightHelperGameObject.AddComponent(Mesh);
    lightHelperMesh.SetGeometry(Geometry.Plane());
    lightHelperMesh.AddMaterial(new DeferredMeshMaterial({ unlit: true, cullMode: "none", albedoColor: light.color }));
    lightHelperMesh.enableShadows = false;
    
    // const lightGameObject2 = new GameObject(scene);
    // lightGameObject2.transform.position.set(-4, 4, 0);
    // lightGameObject2.transform.LookAt(new Vector3(0.01,0,0))
    // const light2 = lightGameObject2.AddComponent(Light);
    // light2.intensity = 50
    // light2.color.set(1, 0, 0, 1);

    // const lightHelperGameObject2 = new GameObject(scene);
    // lightHelperGameObject2.transform.position.copy(lightGameObject2.transform.position);
    // const lightGeometry2 = Geometry.Sphere();
    // const lightHelperMesh2 = lightHelperGameObject2.AddComponent(Mesh);
    // lightHelperMesh2.SetGeometry(lightGeometry2);
    // lightHelperMesh2.AddMaterial(new DeferredMeshMaterial({ unlit: true, albedoColor: light2.color }));

    function updateLight() {
        const lookAtPositon = new Vector3(0.01,0,0);
        lightGameObject.transform.LookAt(lookAtPositon);
        lightHelperMesh.transform.position.copy(lightGameObject.transform.position);
        lightHelperMesh.transform.LookAt(lookAtPositon);
    }

    // function updateLight2() {
    //     lightGameObject2.transform.LookAt(new Vector3(0.01,0,0));
    //     lightHelperMesh2.transform.position.copy(lightGameObject2.transform.position)        
    // }
    Debugger.ui.AddSlider("Light X", -10, 10, 0.1, light.transform.position.x, value => {
        lightGameObject.transform.position.x = value;
        updateLight();
    })

    Debugger.ui.AddSlider("Light Y", -10, 100, 0.1, light.transform.position.y, value => {
        lightGameObject.transform.position.y = value;
        updateLight();
    })

    Debugger.ui.AddSlider("Light Z", -10, 10, 0.1, light.transform.position.z, value => {
        lightGameObject.transform.position.z = value;
        updateLight();
    })

    let fov = 60;
    let near = 0.01;
    let far = 1000;
    Debugger.ui.AddSlider("FOV", 1, 120, 0.1, 60, value => {
        fov = value;
        light.camera.SetPerspective(fov, Renderer.width / Renderer.height, near, far);
        updateLight();
    })

    Debugger.ui.AddSlider("Near", 0.001, 0.01, 0.001, 0.01, value => {
        near = value;
        light.camera.SetPerspective(fov, Renderer.width / Renderer.height, near, far);
        updateLight();
    })

    Debugger.ui.AddSlider("Far", 1, 1000, 0.01, 1000, value => {
        far = value;
        light.camera.SetPerspective(fov, Renderer.width / Renderer.height, near, far);
        updateLight();
    })

    Debugger.ui.AddSlider("Scale X", 1, 100, 0.1, 1, value => {
        lightGameObject.transform.scale.x = value;
        lightHelperMesh.transform.scale.x = value;
    })

    Debugger.ui.AddSlider("Scale Y", 1, 100, 0.1, 1, value => {
        lightGameObject.transform.scale.y = value;
        lightHelperMesh.transform.scale.y = value;
    })

    Debugger.ui.AddSlider("Scale Z", 1, 100, 0.1, 1, value => {
        lightGameObject.transform.scale.z = value;
        lightHelperMesh.transform.scale.z = value;
    })


    // ui.AddSlider("Light2 X", -10, 10, 0.1, light2.transform.position.x, value => {
    //     lightGameObject2.transform.position.x = value;
    //     updateLight2();
    // })

    // ui.AddSlider("Light2 Y", -10, 10, 0.1, light2.transform.position.y, value => {
    //     lightGameObject2.transform.position.y = value;
    //     updateLight2();
    // })

    // ui.AddSlider("Light2 Z", -10, 10, 0.1, light2.transform.position.z, value => {
    //     lightGameObject2.transform.position.z = value;
    //     updateLight2();
    // })

    
    // const albedo = await Texture.Load("./assets/textures/brick-wall-unity/brick-wall_albedo.png");
    // const normal = await Texture.Load("./assets/textures/brick-wall-unity/brick-wall_normal-ogl.png");
    // const ao = await Texture.Load("./assets/textures/brick-wall-unity/brick-wall_ao.png");
    // const height = await Texture.Load("./assets/textures/brick-wall-unity/brick-wall_height.png");

    const albedo = await Texture.Load("./assets/textures/metal-compartments-unity/metal-compartments_albedo.png");
    const normal = await Texture.Load("./assets/textures/metal-compartments-unity/metal-compartments_normal-ogl.png");
    const ao = await Texture.Load("./assets/textures/metal-compartments-unity/metal-compartments_ao.png");
    const height = await Texture.Load("./assets/textures/metal-compartments-unity/metal-compartments_height.png");
    
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

    albedo.GenerateMips();
    normal.GenerateMips();
    ao.GenerateMips();
    height.GenerateMips();

    const roughness = 0.7;
    const metalness = 0.1;
    const floorMaterial = new DeferredMeshMaterial({albedoColor: new Color(1,1,1,1), albedoMap: albedo, normalMap: normal, heightMap: height, roughness: roughness, metalness: metalness});
    const topMaterial = new DeferredMeshMaterial({albedoColor: new Color(1,1,1,1), roughness: roughness, metalness: metalness});
    const backMaterial = new DeferredMeshMaterial({albedoColor: new Color(1,1,1,1), roughness: roughness, metalness: metalness});

    const leftMaterial = new DeferredMeshMaterial({albedoColor: new Color(1,0,0,1), roughness: roughness, metalness: metalness});
    const rightMaterial = new DeferredMeshMaterial({albedoColor: new Color(0,1,0,1), roughness: roughness, metalness: metalness});

    const floor = new GameObject(scene);
    floor.transform.scale.set(50, 50, 50);
    floor.transform.position.y = -5;
    floor.transform.eulerAngles.x = -90;
    const meshbottom = floor.AddComponent(Mesh);
    meshbottom.SetGeometry(planeGeometry);
    meshbottom.AddMaterial(floorMaterial);

    // const left = new GameObject(scene);
    // left.transform.scale.set(5, 5, 5);
    // left.transform.position.x = -5;
    // left.transform.eulerAngles.y = 90;
    // const meshleft = left.AddComponent(Mesh);
    // meshleft.SetGeometry(planeGeometry);
    // meshleft.AddMaterial(leftMaterial);


    // const right = new GameObject(scene);
    // right.transform.scale.set(5, 5, 5);
    // right.transform.position.x = 5;
    // right.transform.eulerAngles.y = -90;
    // const meshright = right.AddComponent(Mesh);
    // meshright.SetGeometry(planeGeometry);
    // meshright.AddMaterial(rightMaterial);

    // const back = new GameObject(scene);
    // back.transform.scale.set(5, 5, 5);
    // back.transform.position.z = -5;
    // const meshback = back.AddComponent(Mesh);
    // meshback.SetGeometry(planeGeometry);
    // meshback.AddMaterial(backMaterial);

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
    cubeMesh.AddMaterial(new DeferredMeshMaterial({albedoColor: new Color(1,1,1,1), roughness: roughness, metalness: metalness}));

    const cube2 = new GameObject(scene);
    cube2.transform.scale.set(2, 2, 2);
    cube2.transform.position.set(2, -4, 2);
    cube2.transform.eulerAngles.y = 65;
    const cubeMesh2 = cube2.AddComponent(Mesh);
    cubeMesh2.SetGeometry(cubeGeometry);
    cubeMesh2.AddMaterial(new DeferredMeshMaterial({albedoColor: new Color(1,1,1,1), roughness: roughness, metalness: metalness}));



    Debugger.ui.AddSlider("Cube X", -10, 10, 0.1, light.transform.position.x, value => {
        cube2.transform.position.x = value;
    })

    const compute = Compute.Create({
        code: `
            @group(0) @binding(0) var<storage, read> size: vec2<u32>;
            @group(0) @binding(1) var<storage, read> current: array<u32>;
            @group(0) @binding(2) var<storage, read_write> next: array<u32>;
            
            override blockSize = 8;
            
            fn getIndex(x: u32, y: u32) -> u32 {
                let h = size.y;
                let w = size.x;
                
                return (y % h) * w + (x % w);
            }
            
            fn getCell(x: u32, y: u32) -> u32 {
                return current[getIndex(x, y)];
            }
            
            fn countNeighbors(x: u32, y: u32) -> u32 {
                return getCell(x - 1, y - 1) + getCell(x, y - 1) + getCell(x + 1, y - 1) + 
                        getCell(x - 1, y) +                         getCell(x + 1, y) + 
                        getCell(x - 1, y + 1) + getCell(x, y + 1) + getCell(x + 1, y + 1);
            }
            
            @compute @workgroup_size(blockSize, blockSize)
            fn main(@builtin(global_invocation_id) grid: vec3u) {
                let x = grid.x;
                let y = grid.y;
                let n = countNeighbors(x, y);
                next[getIndex(x, y)] = select(u32(n == 3u), u32(n == 2u || n == 3u), getCell(x, y) == 1u);
                next[0] = 10;
            } 
        
        `,
        computeEntrypoint: "main",
        uniforms: {
            size: {group: 0, binding: 0, type: "storage"},
            current: {group: 0, binding: 1, type: "storage"},
            next: {group: 0, binding: 2, type: "storage-write"},
        }
    });

    renderer.BeginRenderFrame();
    ComputeContext.BeginComputePass("GOL");

    compute.SetArray("size", new Float32Array([128, 128]));
    compute.SetArray("current", new Float32Array([128]));
    const nextBuffer = Buffer.Create(128, BufferType.STORAGE);
    compute.SetBuffer("next", nextBuffer);
    ComputeContext.Dispatch(compute, 1, 1, 1);
    ComputeContext.EndComputePass();
    renderer.EndRenderFrame();

    const d = await nextBuffer.GetData(0, 0, 4);
    console.log(new Uint32Array(d))



    // for (let i = 0; i < 10; i++) {
    //     const cube2 = new GameObject(scene);
    //     cube2.transform.scale.set(2, 2, 2);
    //     // cube2.transform.position.set(2, -4, 2);
    //     // cube2.transform.eulerAngles.y = 65;
    //     let angle = (Math.PI * 4 * i) / 10;
    //     cube2.transform.position.set(Math.sin(angle) * (10 + i ** 1.4), -4, Math.cos(angle) * (10 + i ** 1.4));
    //     let scale = (i ** 1.4 * 5 + 1000) / 1000;

    //     const cubeMesh2 = cube2.AddComponent(Mesh);
    //     cubeMesh2.SetGeometry(cubeGeometry);
    //     cubeMesh2.AddMaterial(new DeferredMeshMaterial({albedoColor: new Color(1,1,1,1), roughness: roughness, metalness: metalness}));
    
    // }

    const instancedCubeGameObject = new GameObject(scene);
    const instancedCubeMesh = instancedCubeGameObject.AddComponent(InstancedMesh);
    instancedCubeMesh.SetGeometry(cubeGeometry);
    instancedCubeMesh.AddMaterial(new DeferredMeshMaterial({roughness: 0.1, metalness: 0.3}));

    const tempMatrix = new Matrix4();
    const tempPosition = new Vector3();
    const tempRotation = new Quaternion();
    const tempScale = new Vector3(1,1,1);
    const n = 10;
    let i = 0;
    for (let x = 0; x < n; x++) {
        for (let y = 0; y < n; y++) {
            for (let z = 0; z < n; z++) {
                tempPosition.set(x * 2, y * 2, z * 2);
                tempMatrix.compose(tempPosition, tempRotation, tempScale);
                instancedCubeMesh.SetMatrixAt(i, tempMatrix);
                i++;
            }
        }
    }

    scene.Start();
}

Application();