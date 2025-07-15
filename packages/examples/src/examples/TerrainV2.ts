import {
    Components,
    Scene,
    Renderer,
    Mathf,
    GameObject,
    PBRMaterial,
    Geometry,
    Object3D,
    Texture
} from "@trident/core";

// import { Texture } from "@trident/core/renderer/Texture";
// import { RenderPassOrder } from "@trident/core/renderer/RenderingPipeline";
// import { DeferredGBufferPass } from "@trident/core/renderer/passes/DeferredGBufferPass";
// import { Geometry } from "@trident/core/Geometry";
// import { InstancedMesh } from "@trident/core/components/InstancedMesh";
// import { Matrix4 } from "@trident/core/math/Matrix4";
// import { Quaternion } from "@trident/core/math/Quaternion";
// import { Object3D } from "@trident/core/Object3D";

import { OrbitControls } from "@trident/plugins";
// import { MeshletMesh } from "@trident/plugins/meshlets_v2/MeshletMesh";
import { GLTFParser } from "@trident/plugins";
// import { OBJLoaderIndexed } from "@trident/plugins/OBJLoader";
// import { MeshletDraw } from "@trident/plugins/meshlets_v2/passes/MeshletDraw";
import { TerrainBuilder } from "@trident/plugins/TerrainGenerator/TerrainBuilder";

const canvas = document.createElement("canvas");
const aspectRatio = 1; //window.devicePixelRatio;
canvas.width = window.innerWidth * aspectRatio;
canvas.height = window.innerHeight * aspectRatio;
canvas.style.width = `${window.innerWidth}px`;
canvas.style.height = `${window.innerHeight}px`;
canvas.style.userSelect = `none`;
document.body.appendChild(canvas);

async function Application() {
    const renderer = Renderer.Create(canvas, "webgpu");
    const scene = new Scene(renderer);

    // WEBGPUInspector.Load();

    const mainCameraGameObject = new GameObject(scene);
    mainCameraGameObject.transform.position.set(0,0,-15);
    mainCameraGameObject.name = "MainCamera";
    const camera = mainCameraGameObject.AddComponent(Components.Camera);
    camera.SetPerspective(72, canvas.width / canvas.height, 0.5, 500);


    mainCameraGameObject.transform.position.set(0, 0, 20);
    mainCameraGameObject.transform.LookAtV1(new Mathf.Vector3(0, 0, 0));

    const controls = new OrbitControls(canvas, camera);

    // scene.renderPipeline.AddPass(new MeshletDraw(), RenderPassOrder.BeforeGBuffer);
    // scene.renderPipeline.AddPass(new DeferredGBufferPass(), RenderPassOrder.BeforeGBuffer);
    
    {
        const lightGameObject = new GameObject(scene);
        lightGameObject.transform.position.set(-4, 4, -4);
        lightGameObject.transform.LookAtV1(new Mathf.Vector3(0, 0, 0));
        const light = lightGameObject.AddComponent(Components.DirectionalLight);
        light.intensity = 1;
        light.color.set(1, 1, 1, 1);
        light.castShadows = true;
    }


    // {
    //     const planeGO = new GameObject(scene);
    //     planeGO.transform.scale.set(100, 100, 1);
    //     // planeGO.transform.position.x = 2.1;
    //     planeGO.transform.eulerAngles.x = -90;
    //     const sphereMesh = planeGO.AddComponent(Mesh);
    //     await sphereMesh.SetGeometry(Geometry.Plane());
    //     const checkerboard = await Texture.Load("./test-assets/textures/dev/dev_measurewall01a.png");
    //     checkerboard.GenerateMips();
    //     sphereMesh.AddMaterial(new PBRMaterial({
    //         albedoMap: checkerboard
    //         // wireframe: true
    //     }));
    // }

    // // const mesh = await (await GLTFParser.Load("./test-assets/GLTF/Nature/bush.gltf")).children[0].children[0];
    // // const mesh = (await GLTFParser.Load("./test-assets/GLTF/planter_box_01_2k.gltf/planter_box_01_2k.gltf")).children[0];
    // const mesh = (await GLTFParser.Load("./assets/models/quiver_tree_02/quiver_tree_02.gltf")).children[0];
    // console.log(mesh);

    // const pinesGO = new GameObject(scene);
    // pinesGO.transform.position.set(4, 1, 0);
    // pinesGO.transform.scale.set(0.001, 0.001, 0.001);
    // const instancedMesh = pinesGO.AddComponent(Components.Mesh);
    // await instancedMesh.SetGeometry(mesh.geometry);
    // // mesh.material.params.wireframe = true;
    // instancedMesh.AddMaterial(mesh.material);


    // {
    //     interface InstancePair {
    //         instance1Index: number;
    //         instance2Index: number;
    //     };



    //     function randomNumber(min: number, max: number) {
    //         return Math.random() * (max - min) + min;
    //       }

    //     let instancedMeshes: Map<Object3D, Components.InstancedMesh> = new Map();

    //     const m = new Mathf.Matrix4();
    //     const p = new Mathf.Vector3();
    //     const q = new Mathf.Quaternion();
    //     // const s = new Mathf.Vector3(0.001, 0.001, 0.001);
    //     // const s = new Mathf.Vector3(1,1,1);
    //     const s = new Mathf.Vector3(10,10,10);
    //     const o = 2;
    
    //     let instances = 0;
    //     const count = 2;
    //     for (let x = 0; x < count; x++) {
    //         for (let z = 0; z < count; z++) {
    //             p.set(randomNumber(-100, 100), 0, randomNumber(-100, 100));
    //             m.compose(p, q, s);
    //             s.set(s.x, s.y, s.z)

    //             // const child = mesh.children[0]

    //             const meshes = [mesh];
    //             for (const child of mesh.children) { meshes.push(child) } // Dodgy
    //             for (const child of meshes) {
    //                 if (!child.geometry) throw Error("No geometry");
    //                 if (!child.material) throw Error("No material");

    //                 // child.geometry = child.geometry.Scale(new Vector3(0.001, 0.001, 0.001))

    //                 // Instances
    //                 let instancedMesh = instancedMeshes.get(child);
    //                 if (!instancedMesh) {
    //                     const pinesGO = new GameObject(scene);
    //                     instancedMesh = pinesGO.AddComponent(Components.InstancedMesh);
    //                     // instancedMesh.enableShadows = false;
    //                     await instancedMesh.SetGeometry(child.geometry);
    //                     instancedMesh.AddMaterial(child.material);

    //                     instancedMeshes.set(child, instancedMesh);

    //                 }
    //                 instancedMesh.SetMatrixAt(instances, m);
    //                 instances++;

    //                 // // Meshlets
    //                 // const pinesGO = new GameObject(scene);
    //                 // pinesGO.transform.position.copy(p);
    //                 // pinesGO.transform.rotation.copy(q);
    //                 // pinesGO.transform.scale.copy(s);
    //                 // const instancedMesh = pinesGO.AddComponent(MeshletMesh);
    //                 // instancedMesh.enableShadows = false;
    //                 // await instancedMesh.SetGeometry(child.geometry);
    //                 // instancedMesh.AddMaterial(child.material);
    //             }
    //         }
    //     }


    // }

    {
        const terrainSize = 128;
        const terrain = new TerrainBuilder(terrainSize);
        const gameObject = new GameObject(scene);
        // gameObject.transform.eulerAngles.x = 180;
        gameObject.transform.position.z -= terrainSize * 0.5;
        gameObject.transform.position.x -= terrainSize * 0.5;
        gameObject.transform.position.y = -5;
    
        const terrainAlbedo = await Texture.Load("./assets/textures/rocky_terrain_02_2k.gltf/textures/rocky_terrain_02_diff_2k.jpg");
        const terrainNormal = await Texture.Load("./assets/textures/rocky_terrain_02_2k.gltf/textures/rocky_terrain_02_nor_gl_2k.jpg");
        const terrainSpec = await Texture.Load("./assets/textures/rocky_terrain_02_2k.gltf/textures/rocky_terrain_02_spec_2k.jpg");
        const material = new PBRMaterial({albedoMap: terrainAlbedo, normalMap: terrainNormal, metalnessMap: terrainSpec});
        const mesh = gameObject.AddComponent(Components.Mesh);
        await mesh.SetGeometry(terrain.geometry);
        mesh.AddMaterial(material);
    }

    scene.Start();
};

Application();