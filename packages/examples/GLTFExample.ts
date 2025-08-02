import { GameObject } from "../GameObject";
import { Camera } from "../components/Camera";
import { Scene } from "../Scene";
import { Geometry, IndexAttribute, InterleavedVertexAttribute, VertexAttribute } from "../Geometry";
import { Renderer } from "../renderer/Renderer";
import { OrbitControls } from "../plugins/OrbitControls";

import { OBJLoaderIndexed } from "../plugins/OBJLoader";
import { MeshletMesh } from "../components/MeshletMesh";
import { Vector3 } from "../math/Vector3";
import { DeferredMeshMaterial, DeferredMeshMaterialParams } from "../renderer/Material";
import { Texture } from "../renderer/Texture";
import { DirectionalLight } from "../components/Light";

import { loadModel } from "../plugins/GLTF2/gltf";
import { Color } from "../math/Color";
import { Meshlet } from "../plugins/meshlets/Meshlet";
import { Meshoptimizer } from "../plugins/meshlets/Meshoptimizer";
import { FQMR } from "../plugins/meshlets/FQMR";

import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

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
    const mainCameraGameObject = new GameObject(scene);
    mainCameraGameObject.transform.position.set(0,0,-15);
    // mainCameraGameObject.transform.position.z = -15;
    mainCameraGameObject.name = "MainCamera";
    const camera = mainCameraGameObject.AddComponent(Camera);
    camera.SetPerspective(72, canvas.width / canvas.height, 0.5, 50000);
    camera.transform.LookAt(new Vector3(0,0,1));

    const controls = new OrbitControls(canvas, camera);
    controls.connect(canvas);

    const lightGameObject = new GameObject(scene);
    lightGameObject.transform.position.set(4, 4, 0);
    lightGameObject.transform.LookAt(new Vector3(0, 0, 0))
    const light = lightGameObject.AddComponent(DirectionalLight);
    light.intensity = 1;
    light.range = 100;
    light.color.set(1, 1, 1, 1);

    const damagedHelmet = await loadModel("./assets/DamagedHelmet/DamagedHelmet_Face_2.gltf");
    // const damagedHelmet = await loadModel("./assets/modular_mecha_doll_neon_mask/scene.gltf");
    console.log(damagedHelmet);

    for (const node of damagedHelmet.nodes) {
        if (node.mesh === undefined) continue;

        const meshId = node.mesh;
        const mesh = damagedHelmet.meshes[meshId];

        if (mesh === undefined) continue;

        const damagedHelmetGameObject = new GameObject(scene);
        const damagedHelmetMesh = damagedHelmetGameObject.AddComponent(MeshletMesh);
    
        console.log("MESH", mesh)

        const damagedHelmetGeometry = new Geometry();
        damagedHelmetGeometry.attributes.set("position", new VertexAttribute(mesh.positions.buffer.data as Float32Array));
        if (mesh.normals) damagedHelmetGeometry.attributes.set("normal", new VertexAttribute(mesh.normals.buffer.data as Float32Array));
        if (mesh.texCoord) damagedHelmetGeometry.attributes.set("uv", new VertexAttribute(mesh.texCoord.buffer.data as Float32Array));
        if (mesh.indices) damagedHelmetGeometry.index = new IndexAttribute(new Uint32Array(mesh.indices.data));

        console.log(damagedHelmetGeometry);



        // const loader = new GLTFLoader();
        // const model = await loader.loadAsync("./assets/modular_mecha_doll_neon_mask/scene.gltf")

        // let g = [];
        // model.scene.traverse(t => {
        //     if (t.isMesh) {
        //         g.push(t.geometry);
        //     }
        // })
        // console.log(mergeGeometries(g))
        // // const meshT = model.scene.children[0].children[0].children[0].children[0].children[0].geometry;
        // const meshT = mergeGeometries(g);
        // console.log(meshT)

        // const pa = meshT.getAttribute("position");
        // const na = meshT.getAttribute("normal");
        // const ua = meshT.getAttribute("uv");
        // const ia = meshT.index;
        // if (!pa || !na || !ua || !ia) throw Error("To create meshlets need indices, position, normal and uv attributes");
        
        // const p = pa.array as Float32Array;
        // const n = na.array as Float32Array;
        // const u = ua.array as Float32Array;
        // const indices = ia.array as Uint32Array;

        // console.log("p", p);
        // console.log("n", n);
        // console.log("u", u);
        // console.log("indices", indices);

        // damagedHelmetGeometry.attributes.set("position", new VertexAttribute(p));
        // if (mesh.normals) damagedHelmetGeometry.attributes.set("normal", new VertexAttribute(n));
        // if (mesh.texCoord) damagedHelmetGeometry.attributes.set("uv", new VertexAttribute(u));
        // if (mesh.indices) damagedHelmetGeometry.index = new IndexAttribute(new Uint32Array(indices));


        await damagedHelmetMesh.SetGeometry(damagedHelmetGeometry);

        // const material = damagedHelmet.materials[meshId];
        // if (material) {
        //     console.log(material)
        //     // const d = document.createElement("img");

        //     const params: DeferredMeshMaterialParams = {
        //         albedoColor: new Color(material.baseColorFactor[0], material.baseColorFactor[1], material.baseColorFactor[2], material.baseColorFactor[3]),
        //         emissiveColor: new Color(material.emissiveFactor[0], material.emissiveFactor[1], material.emissiveFactor[2], 0),
        //         roughness: material.roughnessFactor,
        //         metalness: material.metallicFactor,
        //         unlit: false
        //     };
        //     if (material.baseColorTexture) params.albedoMap = await Texture.LoadImageSource(material.baseColorTexture);
        //     if (material.normalTexture) params.normalMap = await Texture.LoadImageSource(material.normalTexture);
        //     if (material.metallicRoughnessTexture) params.metalnessMap = await Texture.LoadImageSource(material.metallicRoughnessTexture);
        //     if (material.emissiveTexture) params.emissiveMap = await Texture.LoadImageSource(material.emissiveTexture);
        
        //     const mat = new DeferredMeshMaterial(params);
        //     damagedHelmetMesh.AddMaterial(mat);

        // }
        break;
    }


    scene.Start();
};

Application();