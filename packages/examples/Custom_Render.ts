import { GameObject } from "../GameObject";
import { Camera } from "../components/Camera";
import { Scene } from "../Scene";
import { Geometry, IndexAttribute, InterleavedVertexAttribute, VertexAttribute } from "../Geometry";
import { Renderer } from "../renderer/Renderer";
import { OrbitControls } from "../plugins/OrbitControls";

import { Vector3 } from "../math/Vector3";
import { PBRMaterial, PBRMaterialParams } from "../renderer/Material";
import { Texture } from "../renderer/Texture";
import { DirectionalLight } from "../components/Light";

import { GLTFLoad } from "../plugins/GLTF/gltf";
import { Color } from "../math/Color";
import { Mesh } from "../components/Mesh";
import { MeshletMesh } from "../components/MeshletMesh";

import { OBJLoaderIndexed } from "../plugins/OBJLoader";
import { MaterialDeferredPBR } from "../renderer/materials/MaterialDeferredPBR";
import { Meshlet } from "../plugins/meshlets/Meshlet";

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

    // const planeGeometry = Geometry.Cube();
    // const vertices = planeGeometry.attributes.get("position").array;
    // const normals = planeGeometry.attributes.get("normal").array;
    // const uvs = planeGeometry.attributes.get("uv").array;
    // const indices = planeGeometry.index.array;
    // const vN = Geometry.ToNonIndexed(vertices, indices);
    
    // const interleaved = InterleavedVertexAttribute.fromArrays([vertices, normals, uvs], [3,3,2]);
    // // console.log(indices)
    // console.log(interleaved)
    // console.log(indices.length / 3, vertices.length, normals.length, uvs.length, vN.length)
    // const m = new Meshlet(interleaved.array, indices)
    // console.log(m)

    const scene = new Scene(renderer);
    const mainCameraGameObject = new GameObject(scene);
    mainCameraGameObject.transform.position.set(0,0,-15);
    // mainCameraGameObject.transform.position.z = -15;
    mainCameraGameObject.name = "MainCamera";
    const camera = mainCameraGameObject.AddComponent(Camera);
    camera.SetPerspective(72, canvas.width / canvas.height, 0.5, 50000);
    camera.transform.LookAt(new Vector3(0,0,1));

    const controls = new OrbitControls(canvas, camera);

    const lightGameObject = new GameObject(scene);
    lightGameObject.transform.position.set(4, 4, 0);
    lightGameObject.transform.LookAt(new Vector3(0, 0, 0))
    const light = lightGameObject.AddComponent(DirectionalLight);
    light.intensity = 1;
    light.range = 100;
    light.color.set(1, 1, 1, 1);

    const planeGeometry = Geometry.Cube();
    const planeGameObject = new GameObject(scene);
    const meshletMesh = planeGameObject.AddComponent(MeshletMesh);
    await meshletMesh.SetGeometry(planeGeometry, false);
    const planeMat = new PBRMaterial({albedoColor: new Color(1, 0, 0, 1), unlit: true});
    meshletMesh.AddMaterial(planeMat);


    const bunny = await OBJLoaderIndexed.load("./bunny.obj");
    const bunnyGeometry = new Geometry();
    bunnyGeometry.attributes.set("position", new VertexAttribute(bunny.vertices));
    if (bunny.normals) bunnyGeometry.attributes.set("normal", new VertexAttribute(bunny.normals));
    if (bunny.uvs) bunnyGeometry.attributes.set("uv", new VertexAttribute(bunny.uvs));
    if (bunny.indices) bunnyGeometry.index = new IndexAttribute(new Uint32Array(bunny.indices));

    const bunnyGameObject = new GameObject(scene);
    bunnyGameObject.transform.scale.set(0.01, 0.01, 0.01);
    const bunnyMesh = bunnyGameObject.AddComponent(MeshletMesh);
    await bunnyMesh.SetGeometry(bunnyGeometry);
    
    const mat = new PBRMaterial();
    bunnyMesh.AddMaterial(mat);


    scene.Start();
};

Application();