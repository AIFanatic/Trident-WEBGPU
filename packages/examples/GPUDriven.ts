import { GameObject } from "../GameObject";
import { Camera } from "../components/Camera";
import { Scene } from "../Scene";
import { Geometry, IndexAttribute, InterleavedVertexAttribute, VertexAttribute } from "../Geometry";
import { Renderer } from "../renderer/Renderer";
import { OrbitControls } from "../plugins/OrbitControls";

import { OBJLoaderIndexed } from "../plugins/OBJLoader";
import { MeshletMesh } from "../components/MeshletMesh";
import { Vector3 } from "../math/Vector3";
import { Mesh } from "../components/Mesh";
import { InstancedMesh } from "../components/InstancedMesh";
import { Quaternion } from "../math/Quaternion";
import { Matrix4 } from "../math/Matrix4";
import { Assets } from "../Assets";
import { Utils } from "../Utils";
import { DeferredMeshMaterial } from "../renderer/Material";
import { Color } from "../math/Color";
import { Texture } from "../renderer/Texture";
import { DirectionalLight } from "../components/Light";
import { Meshoptimizer } from "../plugins/meshlets/Meshoptimizer";
import { Meshlet } from "../plugins/meshlets/Meshlet";
import { Meshletizer } from "../plugins/meshlets/Meshletizer";
import { InstancedMeshlet } from "../components/InstancedMeshlet";

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

    const controls = new OrbitControls(camera);
    controls.connect(canvas);

    const lightGameObject = new GameObject(scene);
    lightGameObject.transform.position.set(4, 4, 0);
    lightGameObject.transform.LookAt(new Vector3(0, 0, 0))
    const light = lightGameObject.AddComponent(DirectionalLight);
    light.intensity = 1;
    light.range = 100;
    light.color.set(1, 1, 1, 1);

    const sphereGeometry = Geometry.Sphere();
    const cubeGeometry = Geometry.Cube();

    const bunnyObj = await OBJLoaderIndexed.load("./bunny.obj");
    const bunnyGeometry = new Geometry();
    bunnyGeometry.attributes.set("position", new VertexAttribute(bunnyObj.vertices));
    bunnyGeometry.attributes.set("normal", new VertexAttribute(bunnyObj.normals));
    bunnyGeometry.attributes.set("uv", new VertexAttribute(bunnyObj.uvs));
    bunnyGeometry.index = new IndexAttribute(bunnyObj.indices);
    console.log("bunnyObj", bunnyObj);
    console.log("bunnyGeometry", bunnyGeometry);

    // const kittenObj = await OBJLoaderIndexed.load("./assets/PickupCrate.obj");
    // const kittenGeometry = new Geometry();
    // kittenGeometry.attributes.set("position", new VertexAttribute(kittenObj.vertices));
    // kittenGeometry.attributes.set("normal", new VertexAttribute(kittenObj.normals));
    // kittenGeometry.attributes.set("uv", new VertexAttribute(new Float32Array(kittenObj.vertices.length)));
    // // kittenGeometry.attributes.set("uv", new VertexAttribute(kittenObj.uvs));
    // kittenGeometry.index = new IndexAttribute(kittenObj.indices);

    // console.log("kittenObj", kittenObj);
    // console.log("kittenGeometry", kittenGeometry);


    // {
    //     const geometry = kittenGeometry;
    //     const pa = geometry.attributes.get("position");
    //     const na = geometry.attributes.get("normal");
    //     const ua = geometry.attributes.get("uv");
    //     const ia = geometry.index;
    //     if (!pa || !na || !ua || !ia) throw Error("To create meshlets need indices, position, normal and uv attributes");
        
    //     const p = pa.array as Float32Array;
    //     const n = na.array as Float32Array;
    //     const u = ua.array as Float32Array;
    //     const indices = ia.array as Uint32Array;

    //     const interleavedBufferAttribute = InterleavedVertexAttribute.fromArrays([p, n, u], [3, 3, 2]);
    //     const interleavedVertices = interleavedBufferAttribute.array as Float32Array;

    //     await Meshoptimizer.load();
    //     const meshlet = new Meshlet(interleavedVertices, indices);
    //     const out = Meshoptimizer.meshopt_simplify(meshlet, 128, 1.0);
    //     console.log(indices.length / 3, out.meshlet.indices.length / 3)
    // }
    // // Meshoptimizer.meshopt_simplify()
    // return;

    // const albedoMap = await Texture.Load("./assets/textures/UVCheckerMaps/UVCheckerMap01-1024.png");
    
    // From: freepbr.com
    const albedoMap = await Texture.Load("./brick-wall-unity/brick-wall_albedo.png");
    const normalMap = await Texture.Load("./brick-wall-unity/brick-wall_normal-ogl.png");
    const heightMap = await Texture.Load("./brick-wall-unity/brick-wall_height.png");

    // const albedoMap = await Texture.Load("./assets/textures/metal-compartments-unity/metal-compartments_albedo.png");
    // const normalMap = await Texture.Load("./assets/textures/metal-compartments-unity/metal-compartments_normal-ogl.png");
    // const heightMap = await Texture.Load("./assets/textures/metal-compartments-unity/metal-compartments_height.png");
    const mat = new DeferredMeshMaterial({
        albedoMap: albedoMap,
        normalMap: normalMap,
        heightMap: heightMap,
    });

    let lastMesh;
    const n = 2;
    for (let x = 0; x < n; x++) {
        for (let y = 0; y < n; y++) {
            for (let z = 0; z < n; z++) {
                const cube = new GameObject(scene);
                cube.transform.scale.set(0.1, 0.1, 0.1);

                cube.transform.position.set(x * 20, y * 20, z * 20);
                const cubeMesh = cube.AddComponent(MeshletMesh);

                const which = Math.random() > 0.5;
                await cubeMesh.SetGeometry(bunnyGeometry);
                await cubeMesh.AddMaterial(mat);
                lastMesh = cube;
            }
        }
    }

    setTimeout(() => {
        console.log("Updating")
        lastMesh.transform.position.x += 2;

        setTimeout(() => {
            console.log("Destroying")
            lastMesh.transform.gameObject.Destroy();

            setTimeout(() => {
                console.log("Updating")
                lastMesh.transform.position.x += 2;
            }, 5000);
        }, 5000);
    }, 5000);



    // const cube = new GameObject(scene);
    // // cube.transform.scale.set(0.1, 0.1, 0.1);

    // cube.transform.position.set(20, 20, 20);
    // const cubeMesh = cube.AddComponent(InstancedMeshlet);

    // await cubeMesh.SetGeometry(sphereGeometry);
    // await cubeMesh.AddMaterial(mat);

    // let matrix = new Matrix4();
    // let position = new Vector3();
    // let rotation = new Quaternion();
    // let scale = new Vector3(1,1,1);
    // let i = 0;
    // for (let x = 0; x < n; x++) {
    //     for (let y = 0; y < n; y++) {
    //         for (let z = 0; z < n; z++) {
    //             position.set(x * 20, y * 20, z * 20);
    //             matrix.compose(position, rotation, scale);
    //             cubeMesh.SetMatrixAt(i, matrix);
    //             i++;
    //         }
    //     }
    // }




    // {
    //     const cube = new GameObject(scene);
    //     // cube.transform.scale.set(0.1, 0.1, 0.1);
    //     cube.transform.scale.set(10, 10, 10);

    //     cube.transform.position.set(0, 0, 0);
    //     const cubeMesh = cube.AddComponent(MeshletMesh);

    //     await cubeMesh.SetGeometry(cubeGeometry);
    //     await cubeMesh.AddMaterial(mat);
    // }

    // {
    //     const cube = new GameObject(scene);
    //     cube.transform.scale.set(10, 10, 10);

    //     cube.transform.position.set(10, 0, 0);
    //     const cubeMesh = cube.AddComponent(MeshletMesh);

    //     await cubeMesh.SetGeometry(kittenGeometry);
    //     await cubeMesh.AddMaterial(mat);
    // }



    // const vertices = cubeGeometry.attributes.get("position").array;
    // const indices = cubeGeometry.index.array;
    // const verticesNonIndexed = Geometry.ToNonIndexed(vertices, indices);

    // const l = 128;
    // const vertices_gpu = new Float32Array(l * 3);
    // vertices_gpu.set(verticesNonIndexed.slice(0, l * 3));
    // // const verticesGPU: number[] = [] // vec4
    // // for (let i = 0; i < verticesNonIndexed.length; i+=3) {
    // //     verticesGPU.push(verticesNonIndexed[i + 0], verticesNonIndexed[i + 1], verticesNonIndexed[i + 2], 0);
    // // }

    // // const vertices_gpu = new Float32Array(128 * 4);
    // // vertices_gpu.set(verticesGPU.slice(0, 128 * 4));


    // const cubeGeometryNonIndexed = new Geometry();
    // cubeGeometryNonIndexed.attributes.set("position", new VertexAttribute(verticesNonIndexed));

    // const cubeGeometry128x4 = new Geometry();
    // cubeGeometry128x4.attributes.set("position", new VertexAttribute(vertices_gpu));

    // console.log("cubeGeometry", vertices, indices);
    // console.log("cubeGeometryNonIndexed", verticesNonIndexed);
    // console.log("cubeGeometry128x4", vertices_gpu);

    // // cubeGeometry             = 80^3 = 13ms
    // // cubeGeometryNonIndexed   = 80^3 = 15ms
    // // cubeGeometry128x4        = 80^3 = 24.7ms    50^3 = 3.7ms

    // // Instanced
    // const cube = new GameObject(scene);
    // cube.transform.scale.set(1, 1, 1);
    // const cubeMeshInstanced = cube.AddComponent(InstancedMesh);
    // await cubeMeshInstanced.SetGeometry(cubeGeometry128x4);
    // const position = new Vector3(0,0,0);
    // const rotation = new Quaternion();
    // const scale = new Vector3(1,1,1);
    // const m = new Matrix4();
    // let i = 0;
    // for (let x = 0; x < n; x++) {
    //     for (let y = 0; y < n; y++) {
    //         for (let z = 0; z < n; z++) {
    //             position.set(x * 10, y * 10, z * 10);
    //             m.compose(position, rotation, scale);
    //             cubeMeshInstanced.SetMatrixAt(i, m);
    //             i++;
    //         }
    //     }
    // }



    // const g = cubeGeometry;
    // const s = new Vector3(1, 1, 1);

    // {
    //     const cube = new GameObject(scene);
    //     cube.transform.scale.copy(s);
    //     cube.transform.position.set(-3, 0, 0);
    //     const cubeMesh = cube.AddComponent(MeshletMesh);
    //     await cubeMesh.SetGeometry(g);
    // }

    // {
    //     const cube = new GameObject(scene);
    //     cube.transform.scale.copy(s);
    //     cube.transform.position.set(3, 0, 0);
    //     const cubeMesh = cube.AddComponent(MeshletMesh);
    //     await cubeMesh.SetGeometry(g);
    // }

    // {
    //     const cube = new GameObject(scene);
    //     cube.transform.scale.copy(s);
    //     cube.transform.position.set(0, 0, -5);
    //     const cubeMesh = cube.AddComponent(MeshletMesh);
    //     await cubeMesh.SetGeometry(g);
    // }

    // {
    //     const cube = new GameObject(scene);
    //     cube.transform.scale.copy(s);
    //     cube.transform.position.set(0, 0, 0);
    //     const cubeMesh = cube.AddComponent(MeshletMesh);
    //     await cubeMesh.SetGeometry(g);
    // }

    scene.Start();
}

Application();