import { GameObject } from "../GameObject";
import { Camera } from "../components/Camera";
import { Scene } from "../Scene";
import { Geometry, IndexAttribute, VertexAttribute } from "../Geometry";
import { Renderer } from "../renderer/Renderer";
import { OrbitControls } from "../plugins/OrbitControls";

import { Vector3 } from "../math/Vector3";
import { Material, PBRMaterial } from "../renderer/Material";
import { DirectionalLight } from "../components/Light";

import { GLTFLoad, GLTFLoader } from "../plugins/GLTF/gltf";
import { Color } from "../math/Color";
import { Mesh } from "../components/Mesh";

import { OBJLoaderIndexed } from "../plugins/OBJLoader";
import { MeshletMesh } from "../plugins/meshlets/MeshletMesh";
import { Component } from "../components/Component";
import { Utils } from "../utils/Utils";
import { Texture } from "../renderer/Texture";
import { InstancedMesh } from "../components/InstancedMesh";
import { Matrix4 } from "../math/Matrix4";
import { Quaternion } from "../math/Quaternion";
import { ImpostorMesh } from "../plugins/Impostors/ImpostorMesh";
import { Dilator } from "../plugins/Impostors/Dilator";
import { DynamicBufferMemoryAllocator } from "../utils/MemoryAllocator";

// GLTFLoader.Load("./assets/DamagedHelmet/DamagedHelmet.gltf");

const canvas = document.createElement("canvas");
const aspectRatio = window.devicePixelRatio;
canvas.width = window.innerWidth * aspectRatio;
canvas.height = window.innerHeight * aspectRatio;
canvas.style.width = `${window.innerWidth}px`;
canvas.style.height = `${window.innerHeight}px`;
document.body.appendChild(canvas);

async function Application() {
    const renderer = Renderer.Create(canvas, "webgpu");
    const scene = new Scene(renderer);

    // const b = new DynamicBufferMemoryAllocator(10, 10);
    // console.log(new Float32Array(await b.getBuffer().GetData()))
    // b.set(1, new Float32Array([1,2,3,4,5,6,7,8]));
    // console.log(new Float32Array(await b.getBuffer().GetData()))
    // b.set(2, new Float32Array([8,7,6,5,4,3,2,1]));
    // console.log(new Float32Array(await b.getBuffer().GetData()))
    
    // b.delete(1);
    // console.log(new Float32Array(await b.getBuffer().GetData()))


    // b.set(3, new Float32Array([9,7,6,5,4,3,2,5]));
    // console.log(new Float32Array(await b.getBuffer().GetData()))

    // return;

    const mainCameraGameObject = new GameObject(scene);
    mainCameraGameObject.transform.position.set(0,0,-15);
    // setInterval(() => {
    //     console.log(camera.transform.position.elements)
    // }, 1000);
    // mainCameraGameObject.transform.position.z = -15;
    mainCameraGameObject.name = "MainCamera";
    const camera = mainCameraGameObject.AddComponent(Camera);
    camera.SetPerspective(72, canvas.width / canvas.height, 0.5, 50000);
    // camera.transform.LookAt(new Vector3(0,0,0));
    

    // camera.transform.position.x = 10;

    const controls = new OrbitControls(canvas, camera);

    // let angle = 10;
    // setInterval(() => {
    //     console.log(angle)
    //     camera.transform.RotateAround(new Vector3(5, 0, 0), new Vector3(0, 1, 0), angle);
    // }, 1000);

    // camera.transform.RotateAround(new Vector3(), new Vector3(0, 1, 0), 90);

    
    // {
    //     const c = new GameObject(scene);
    //     c.transform.position.set(0, 0, 0);
    //     const g = Geometry.Cube();
    //     const mat = new PBRMaterial({albedoColor: new Color(1,1,1,1), unlit: false});
    //     const m = c.AddComponent(Mesh);
    //     await m.SetGeometry(g);
    //     m.AddMaterial(mat);
    // }

    // {
    //     const c = new GameObject(scene);
    //     c.transform.position.set(5, 5, 5);
    //     const g = Geometry.Cube();
    //     const mat = new PBRMaterial({unlit: false});
    //     const m = c.AddComponent(Mesh);
    //     await m.SetGeometry(g);
    //     m.AddMaterial(mat);
    // }

    const lightGameObject = new GameObject(scene);
    lightGameObject.transform.position.set(4, 4, 4);
    lightGameObject.transform.LookAt(new Vector3(0, 0, 0))
    const light = lightGameObject.AddComponent(DirectionalLight);
    light.intensity = 1;
    light.range = 100;
    light.color.set(1, 1, 1, 1);

    const bunny = await OBJLoaderIndexed.load("./bunny.obj");
    // const bunny = await GLTFLoader.load("./assets/low_poly_tree_pack/pine.gltf");
    // const bunny = await GLTFLoader.load("./assets/quiver_tree_02/quiver_tree_02.gltf");
    // const bunny = await GLTFLoader.load("./assets/GLTFScenes/barrel.gltf");
    // console.log("bunny", bunny)
    const go = new GameObject(scene);
    // go.transform.scale.set(0.01, 0.01, 0.01);
    // // go.transform.position.z = -20;
    // const mesh = go.AddComponent(Mesh);
    // await mesh.SetGeometry(bunny[0].geometry);
    // mesh.AddMaterial(bunny[0].material);

    const bunnyImpostor = go.AddComponent(ImpostorMesh);
    await bunnyImpostor.Create(bunny);
    const m = new Material();
    m.shader = bunnyImpostor.impostorShader;

    const impostor = new GameObject(scene);
    // impostor.transform.position.x = -2
    // impostor.transform.scale.set(10, 10, 10)
    const im = impostor.AddComponent(Mesh);
    await im.SetGeometry(bunnyImpostor.impostorGeometry);
    im.AddMaterial(m);


    // const textureDilated = await Dilator.Dilate(bunnyImpostor.normalTexture);
    // // bunnyImpostor.normalTexture = textureDilated;
    // bunnyImpostor.impostorShader.SetTexture("normalTexture", textureDilated);

    // {
    //     const dilatorGameObject = new GameObject(scene);
    //     dilatorGameObject.transform.position.x = 2;
    //     const dilatorMesh = dilatorGameObject.AddComponent(Mesh);
    //     await dilatorMesh.SetGeometry(Geometry.Plane());

    //     const dilatorMaterial = new PBRMaterial({albedoMap: textureDilated, unlit: true});
    //     dilatorMesh.AddMaterial(dilatorMaterial);
    // }



    const instancedMeshGameObject = new GameObject(scene);
    const instancedMesh = instancedMeshGameObject.AddComponent(InstancedMesh);
    await instancedMesh.SetGeometry(bunnyImpostor.impostorGeometry);
    instancedMesh.AddMaterial(m);

    const mat = new Matrix4();
    const p = new Vector3();
    const r = new Quaternion();
    const s = new Vector3(1,1,1);
    const c = 2;
    let i = 0;
    for (let x = 0; x < c; x++) {
        for (let z = 0; z < c; z++) {
            p.set(x * 2, 0, z * 2);
            mat.compose(p, r, s);
            instancedMesh.SetMatrixAt(i, mat);
            i++;
        }
    }

    scene.Start();
};

Application();