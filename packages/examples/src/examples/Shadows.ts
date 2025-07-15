import { GameObject } from "../GameObject";
import { Camera } from "../components/Camera";
import { Scene } from "../Scene";
import { Geometry, IndexAttribute, VertexAttribute } from "../Geometry";
import { Renderer } from "../renderer/Renderer";
import { OrbitControls } from "../plugins/OrbitControls";

import { Material, PBRMaterial, PBRMaterialParams } from "../renderer/Material";

import { Mesh } from "../components/Mesh";

import { Vector3 } from "../math/Vector3";
import { DirectionalLight, PointLight } from "../components/Light";
import { Quaternion } from "../math/Quaternion";

import { WEBGPUInspector } from "../plugins/WEBGPUInspector";
import { Debugger } from "../plugins/Debugger";
import { Shader } from "../renderer/Shader";
import { Buffer } from "../renderer/Buffer";
import { Texture as TridentTexture } from "../renderer/Texture";
import { Matrix4 } from "../math/Matrix4";
import { TextureSampler } from "../renderer/TextureSampler";
import { DepthTarget, RenderTarget, RendererContext } from "../renderer/RendererContext";
import { TextureViewer } from "../plugins/TextureViewer";
import { PassParams, RenderPassOrder } from "../renderer/RenderingPipeline";
import { InstancedMesh } from "../components/InstancedMesh";

import { MeshletMesh } from "../plugins/meshlets/MeshletMesh";
import { OBJLoaderIndexed } from "../plugins/OBJLoader";
// import { GLTFLoader } from "../plugins/GLTF/gltf";
import { PostProcessingPass } from "../plugins/PostProcessing/PostProcessingPass";
import { PostProcessingFXAA } from "../plugins/PostProcessing/effects/FXAA";
import { MeshletDraw } from "../plugins/meshlets/passes/MeshletDraw";
import { DeferredGBufferPass } from "../renderer/passes/DeferredGBufferPass";
import { UIButtonStat, UIFolder, UISliderStat } from "../plugins/ui/UIStats";

import { TerrainGenerator } from "../plugins/TerrainGenerator";
import { ImpostorMesh } from "../plugins/Impostors/ImpostorMesh";
// import { glTFLoader } from "../plugins/GLTF/GLTFLoader_Minimal";
import {GLTFLoader, GLTF, MeshPrimitive, Texture, Node, AccessorComponentType, Accessor} from '../plugins/GLTF/GLTFLoader_Minimal'

import { ExtensionInstanced, Object3D } from "../Object3D";
import { Color } from "../math/Color";
import { Transform } from "../components/Transform";
import { Vector2 } from "../math/Vector2";
import { PostProcessingSMAA } from "../plugins/PostProcessing/effects/SMAA";
import { GLTFParser } from "../plugins/GLTF/GLTF_Parser";


// import { WebIO } from '@gltf-transform/core';


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

    // WEBGPUInspector.Load();

    const mainCameraGameObject = new GameObject(scene);
    mainCameraGameObject.transform.position.set(0,0,-15);
    mainCameraGameObject.name = "MainCamera";
    const camera = mainCameraGameObject.AddComponent(Camera);
    camera.SetPerspective(72, canvas.width / canvas.height, 0.5, 500);



    // const camera = mainCameraGameObject.AddComponent(Camera);
    // const size = 10;
    // camera.SetOrthographic(-size, size, -size, size, 0.1, 100);
    // camera.SetPerspective(72, canvas.width / canvas.height, 0.5, 50000);

    // camera.near = 0.01;
    // camera.far = 100;
    // camera.SetPerspective(60, Renderer.width / Renderer.height, camera.near, camera.far);

    // this.camera.projectionMatrix.perspectiveZO(60, Renderer.width / Renderer.height, this.camera.near, this.camera.far);
    mainCameraGameObject.transform.position.set(0, 0, 20);
    mainCameraGameObject.transform.LookAtV1(new Vector3(0, 0, 0));

    // lightGameObject.transform.position.set(4, 4, 4);
    // lightGameObject.transform.LookAtV1(new Vector3(0, 0, 0));

    const controls = new OrbitControls(canvas, camera);

    {
        const lightGameObject = new GameObject(scene);
        lightGameObject.transform.position.set(-4, 4, -4);
        lightGameObject.transform.LookAtV1(new Vector3(0, 0, 0));
        const light = lightGameObject.AddComponent(DirectionalLight);
        light.intensity = 1;
        light.color.set(1, 1, 1, 1);
        light.castShadows = true;

        // let objs: GameObject[] = [];
        // for (let i = 0; i < 4; i++) {
        //     const lightGameObject = new GameObject(scene);
        //     lightGameObject.transform.scale.set(0.25, 0.25, 0.25);
        //     lightGameObject.transform.position.set(Math.random() * 10 - 5, Math.random() * 10, Math.random() * 10 - 5);
        //     lightGameObject.transform.LookAtV1(new Vector3(0, 0, 0));
        //     const light = lightGameObject.AddComponent(PointLight);
        //     light.intensity = 1;
        //     light.range = 10;
        //     light.color.set(Math.random(), Math.random(), Math.random(), 1);
        //     light.castShadows = false;

        //     let lightHelperMesh = lightGameObject.AddComponent(Mesh);
        //     lightHelperMesh.SetGeometry(Geometry.Sphere());
        //     lightHelperMesh.AddMaterial(new PBRMaterial({unlit: true, albedoColor: light.color}));
        //     lightHelperMesh.enableShadows = false;

        //     objs.push(lightGameObject);
        // }

        // setInterval(() => {
        //     for (const obj of objs) {
        //         obj.transform.position.add(0.01);
        //     }
        // }, 100);

        const sphereMesh = lightGameObject.AddComponent(Mesh);
        sphereMesh.enableShadows = false;
        await sphereMesh.SetGeometry(Geometry.Sphere());
        sphereMesh.AddMaterial(new PBRMaterial({unlit: true}));

        const sunlightAngle = new Vector3(64, 64, 10);
        const lightPositionDebug = new UIFolder(Debugger.ui, "Light position");
        new UISliderStat(lightPositionDebug, "Altitude:", 0, 1000, 1, sunlightAngle.z, value => {sunlightAngle.z = value});
        new UISliderStat(lightPositionDebug, "Theta:", 0, 360, 1, sunlightAngle.x, value => {sunlightAngle.x = value});
        new UISliderStat(lightPositionDebug, "Phi:", 0, 360, 1, sunlightAngle.y, value => {sunlightAngle.y = value});
        new UIButtonStat(lightPositionDebug, "Cast shadows:", value => {light.castShadows = value}, light.castShadows);
        lightPositionDebug.Open();
        setInterval(() => {
            const theta = sunlightAngle.x * Math.PI / 180;
            const phi = sunlightAngle.y * Math.PI / 180;
            const x = Math.sin(theta) * Math.cos(phi);
            const y = Math.sin(theta) * Math.sin(phi);
            const z = Math.cos(theta);
            lightGameObject.transform.position.set(x, y, z).mul(sunlightAngle.z);
            lightGameObject.transform.LookAtV1(new Vector3(0, 0, 0));
        }, 100);
    }



    // {
    //     const lightGameObject = new GameObject(scene);
    //     lightGameObject.transform.position.set(4, 4, 4);
    //     lightGameObject.transform.LookAtV1(new Vector3(0, 0, 0));
    //     const light = lightGameObject.AddComponent(DirectionalLight);
    //     light.intensity = 1;
    //     light.color.set(1, 1, 1, 1);

    //     const sphereMesh = lightGameObject.AddComponent(Mesh);
    //     sphereMesh.enableShadows = false;
    //     await sphereMesh.SetGeometry(Geometry.Sphere());
    //     sphereMesh.AddMaterial(new PBRMaterial({unlit: true}));
    // }

    // {
    //     const lightGameObject = new GameObject(scene);
    //     lightGameObject.transform.position.set(-4, 4, -4);
    //     lightGameObject.transform.LookAtV1(new Vector3(0, 0, 0))
    //     const light = lightGameObject.AddComponent(DirectionalLight);
    //     light.intensity = 1;
    //     light.color.set(1, 1, 1, 1);

    //     const sphereMesh = lightGameObject.AddComponent(Mesh);
    //     await sphereMesh.SetGeometry(Geometry.Sphere());
    //     sphereMesh.AddMaterial(new PBRMaterial({unlit: true}));
    // }

    // {
    //     const planeGO = new GameObject(scene);
    //     planeGO.transform.scale.set(100, 100, 1);
    //     // planeGO.transform.position.x = 2.1;
    //     planeGO.transform.eulerAngles.x = -90;
    //     const sphereMesh = planeGO.AddComponent(Mesh);
    //     await sphereMesh.SetGeometry(Geometry.Plane());
    //     // const checkerboard = await TridentTexture.Load("./test-assets/checkerboard.png");
    //     // checkerboard.GenerateMips();
    //     sphereMesh.AddMaterial(new PBRMaterial({
    //         // albedoMap: checkerboard
    //     }));
    // }

    {
        const sphereGO = new GameObject(scene);
        sphereGO.transform.position.y = 2;
        const sphereMesh = sphereGO.AddComponent(Mesh);
        await sphereMesh.SetGeometry(Geometry.Sphere());
        sphereMesh.AddMaterial(new PBRMaterial());
    }


    {
        const sphereGO = new GameObject(scene);
        sphereGO.transform.position.x = 50;
        sphereGO.transform.position.y = 2;
        const sphereMesh = sphereGO.AddComponent(Mesh);
        await sphereMesh.SetGeometry(Geometry.Sphere());
        sphereMesh.AddMaterial(new PBRMaterial());
    }

    {
        const sphereGO = new GameObject(scene);
        sphereGO.transform.position.x = -2;
        sphereGO.transform.position.y = 1;
        const sphereMesh = sphereGO.AddComponent(Mesh);
        await sphereMesh.SetGeometry(Geometry.Cube());
        sphereMesh.AddMaterial(new PBRMaterial());
    }



    {
        // Instances
        const pinesGO = new GameObject(scene);
        const instancedMesh = pinesGO.AddComponent(InstancedMesh);
        await instancedMesh.SetGeometry(Geometry.Sphere());
        instancedMesh.AddMaterial(new PBRMaterial());
    
        const m = new Matrix4();
        const p = new Vector3();
        const q = new Quaternion();
        const s = new Vector3(1,1,1);
        const o = 2;
    
        let instances = 0;
        const count = 2;
        for (let x = 0; x < count; x++) {
            for (let z = 0; z < count; z++) {
                p.set(x + o, 2, z + o);
                m.compose(p, q, s);
                instancedMesh.SetMatrixAt(instances, m);
                instances++;
            }
        }
    }

    // {
    //     // Instances
    //     const pinesGO = new GameObject(scene);
    //     const instancedMesh = pinesGO.AddComponent(InstancedMesh);
    //     await instancedMesh.SetGeometry(Geometry.Sphere());
    //     instancedMesh.AddMaterial(new PBRMaterial());
    
    //     const m = new Matrix4();
    //     const p = new Vector3();
    //     const q = new Quaternion();
    //     const s = new Vector3(1,1,1);
    //     const o = -2;
    
    //     let instances = 0;
    //     const count = 2;
    //     for (let x = 0; x < count; x++) {
    //         for (let z = 0; z < count; z++) {
    //             p.set(x + o, 2, z + o);
    //             m.compose(p, q, s);
    //             instancedMesh.SetMatrixAt(instances, m);
    //             instances++;
    //         }
    //     }
    // }

    // scene.renderPipeline.AddPass(new MeshletDraw(), RenderPassOrder.BeforeGBuffer);
    // scene.renderPipeline.AddPass(new DeferredGBufferPass(), RenderPassOrder.BeforeGBuffer);
    // {
    //     const bunnyGeometry = await OBJLoaderIndexed.load("./assets/bunny.obj");
    //     const pinesGO = new GameObject(scene);
    //     pinesGO.transform.position.set(4, 1, 0);
    //     pinesGO.transform.scale.set(0.01, 0.01, 0.01);
    //     const instancedMesh = pinesGO.AddComponent(MeshletMesh);
    //     await instancedMesh.SetGeometry(bunnyGeometry[0].geometry);
    //     instancedMesh.AddMaterial(bunnyGeometry[0].material);
    // }




    {

        GLTFParser.Load("./test-assets/GLTF/scenes/Sponza/sponza.gltf").then(sceneObject3D => {
            console.log(sceneObject3D)

            function AddObject3D(obj: Object3D): GameObject {
                const gameObject = new GameObject(scene);
                gameObject.name = obj.name ? obj.name : "GameObject";

                if (obj.localMatrix) {
                    obj.localMatrix.decompose(gameObject.transform.position, gameObject.transform.rotation, gameObject.transform.scale)
                }

                if (obj.geometry && obj.material) {
                    if (obj.extensions) {
                        const instancesExtension: ExtensionInstanced = obj.extensions[0];
                        console.log(instancesExtension)

                        const instancedMesh = gameObject.AddComponent(InstancedMesh);
                        instancedMesh.SetGeometry(obj.geometry);
                        instancedMesh.AddMaterial(obj.material);

                        let c = 0;
                        for (const matrix of instancesExtension.instanceMatrices) {
                            instancedMesh.SetMatrixAt(c, matrix);
                            c++;
                        }
                    }
                    else {
                        const mesh = gameObject.AddComponent(Mesh);
                        mesh.SetGeometry(obj.geometry);
                        mesh.AddMaterial(obj.material);
                    }
                }

                return gameObject;
            }

            function p(obj: Object3D, d = "", parent?: GameObject) {
                function generateAdvancedUVs(vertices: Float32Array, indices: Uint32Array): Float32Array {
                    let uvArray = new Float32Array((indices.length / 3) * 6); // Creating a UV for each vertex index in every triangle
                
                    for (let i = 0; i < indices.length; i += 3) {
                        const index1 = indices[i];
                        const index2 = indices[i + 1];
                        const index3 = indices[i + 2];
                
                        // Assuming you are projecting UVs from top (using x, z coordinates)
                        uvArray[i * 2] = vertices[index1 * 3] / 10; // Normalize based on your model size or bounds
                        uvArray[i * 2 + 1] = vertices[index1 * 3 + 2] / 10;
                
                        uvArray[i * 2 + 2] = vertices[index2 * 3] / 10;
                        uvArray[i * 2 + 3] = vertices[index2 * 3 + 2] / 10;
                
                        uvArray[i * 2 + 4] = vertices[index3 * 3] / 10;
                        uvArray[i * 2 + 5] = vertices[index3 * 3 + 2] / 10;
                    }
                
                    return uvArray;
                }

                console.log(d, obj.name, obj.geometry ? "G: 1" : "G: 0", parent ? "P: " + parent.name : "P: none");
                const gameObject = AddObject3D(obj);

                if (parent && gameObject) {
                    gameObject.transform.parent = parent.transform;
                }

                for (const child of obj.children) {
                    // if (child.material) child.material.params.albedoColor.set(1, 0, 0, 1);
                    // if (child.material) child.material.params.emissiveColor.set(1, 0, 0, 1);
                    if (child.geometry && child.geometry.attributes.get("uv") === undefined) {
                        const positions = child.geometry.attributes.get("position");
                        const indices = child.geometry.index;
                        if (!positions || !indices) throw Error("Needs positions and indices");
                        const uvs = generateAdvancedUVs(positions.array as Float32Array, indices.array as Uint32Array);
                        child.geometry.attributes.set("uv", new VertexAttribute(uvs))
                    }
                    p(child, d + "\t", gameObject ? gameObject : undefined);
                }

                return gameObject;
            }
            p(sceneObject3D)
        })

        console.log(scene)
        // const sponza = await GLTFLoader.load("./test-assets/GLTFScenes/Sponza/sponza.gltf");

        // for (const obj of sponza) {
        //     const gameObject = new GameObject(scene);
        //     // pinesGO.transform.position.set(4, 1, 0);
        //     gameObject.transform.scale.set(0.01, 0.01, 0.01);
        //     // gameObject.transform.eulerAngles.x = 180;
        //     if (!obj.geometry) continue;
        //     if (!obj.material) continue;

        //     // if (obj.localMatrix) {
        //     //     obj.localMatrix.decompose(gameObject.transform.position, gameObject.transform.rotation, gameObject.transform.scale)
        //     // }

        //     const mesh = gameObject.AddComponent(Mesh);
        //     mesh.SetGeometry(obj.geometry);
        //     mesh.AddMaterial(obj.material);
        //     // // await instancedMesh.SetGeometry(bunnyGeometry[0].geometry);
        //     // // instancedMesh.AddMaterial(bunnyGeometry[0].material);

        //     // console.log("Adding", obj)
        // }


    }



    // const postProcessing = new PostProcessingPass();
    // postProcessing.effects.push(new PostProcessingFXAA());

    // scene.renderPipeline.AddPass(postProcessing, RenderPassOrder.AfterLighting);








    // const io = new WebIO({credentials: 'include'});

    // // Read.
    // let document = await io.read("./test-assets/GLTFScenes/Sponza/sponza.gltf");  // → Document
    // console.log(document)

    scene.Start();
};

Application();