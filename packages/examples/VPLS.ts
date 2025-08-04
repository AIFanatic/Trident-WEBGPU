import {
    GameObject,
    Geometry,
    Scene,
    Components,
    Mathf,
    PBRMaterial,
    GPU
} from "@trident/core";

import { OrbitControls } from "@trident/plugins/OrbitControls";
import { Line } from "@trident/plugins/Line";
import { OBJLoaderIndexed } from "@trident/plugins/OBJLoader";
import { RSMIndirectLighting } from "@trident/plugins/RSMIndirectLighting";

// import { Line } from "../plugins/Line";
// import { Debugger } from "../plugins/Debugger";
// import { UIFolder, UISliderStat, UIVecStat } from "../plugins/ui/UIStats";
// import { RSMIndirectLighting } from "../plugins/RSMIndirectLighting";
// import { Texture } from "../renderer/Texture";
// import { GLTFParser } from "../plugins/GLTF/GLTF_Parser";
// import { Object3D } from "../Object3D";
// import { OBJLoaderIndexed } from "../plugins/OBJLoader";

const canvas = document.createElement("canvas");
const aspectRatio = 1;
canvas.width = window.innerWidth * aspectRatio;
canvas.height = window.innerHeight * aspectRatio;
canvas.style.width = `${window.innerWidth}px`;
canvas.style.height = `${window.innerHeight}px`;
document.body.appendChild(canvas);


async function Application() {
    const renderer = GPU.Renderer.Create(canvas, "webgpu");

    const scene = new Scene(renderer);

    const mainCameraGameObject = new GameObject(scene);
    mainCameraGameObject.transform.position.set(0, 0, 20);
    mainCameraGameObject.name = "MainCamera";
    const camera = mainCameraGameObject.AddComponent(Components.Camera);
    camera.SetPerspective(72, canvas.width / canvas.height, 0.05, 512);


    const controls = new OrbitControls(canvas, camera);

    const lightGameObject = new GameObject(scene);
    lightGameObject.transform.position.set(2, 5, 10);
    lightGameObject.transform.LookAtV1(new Mathf.Vector3(0, 0, 0));
    // const light = lightGameObject.AddComponent(DirectionalLight);
    const light = lightGameObject.AddComponent(Components.SpotLight);
    light.range = 200;
    light.angle = 90;
    light.intensity = 100;
    light.color.set(1, 1, 1, 1);
    light.castShadows = true;
    const l = new Line(scene, lightGameObject.transform.position, new Mathf.Vector3(0, 0, 0));


    // {
    //     const lightFolder = new UIFolder(Debugger.ui, "Light");
    //     lightFolder.Open();

    //     new UIVecStat(lightFolder, "Position:", light.transform.position, value => {
    //         const p = new Mathf.Vector3(value.x, value.y, value.z)
    //         light.transform.position.copy(p);
    //         l.SetFrom(p);
    //     });

    //     new UISliderStat(lightFolder, "Intensity:", 0, 100, 0.1, light.intensity, state => {light.intensity = state});
    // }

    const top = new GameObject(scene);
    top.transform.scale.set(100, 100, 1);
    top.transform.position.y = -5.1;
    top.transform.eulerAngles.x = -90;
    const meshtop = top.AddComponent(Components.Mesh);
    meshtop.SetGeometry(Geometry.Plane());
    meshtop.AddMaterial(new PBRMaterial());


    const roughness = 0.7;
    const metalness = 0.1;

    const topMaterial = new PBRMaterial({ albedoColor: new Mathf.Color(1, 1, 1, 1), roughness: roughness, metalness: metalness });
    const floorMaterial = new PBRMaterial({ albedoColor: new Mathf.Color(1, 1, 1, 1), roughness: roughness, metalness: metalness });
    
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
    //     // albedoColor: new Mathf.Color(1, 1, 1, 1), roughness: roughness, metalness: metalness
    // });

    const backMaterial = new PBRMaterial({ albedoColor: new Mathf.Color(1, 1, 1, 1), roughness: roughness, metalness: metalness });

    const leftMaterial = new PBRMaterial({ albedoColor: new Mathf.Color(1, 0, 0, 1), roughness: roughness, metalness: metalness });
    const rightMaterial = new PBRMaterial({ albedoColor: new Mathf.Color(0, 1, 0, 1), roughness: roughness, metalness: metalness });
    // const leftMaterial = new PBRMaterial({ albedoMap: await Texture.Load("./test-assets/textures/brick-wall-unity/brick-wall_normal-ogl.png"), roughness: roughness, metalness: metalness });
    // const rightMaterial = new PBRMaterial({ albedoMap: await Texture.Load("./test-assets/textures/brick-wall-unity/brick-wall_albedo.png"), roughness: roughness, metalness: metalness });

    const planeGeometry = Geometry.Plane();
    const cubeGeometry = Geometry.Cube();

    const floor = new GameObject(scene);
    floor.transform.scale.set(5, 5, 5);
    floor.transform.position.y = -5;
    floor.transform.eulerAngles.x = -90;
    const meshbottom = floor.AddComponent(Components.Mesh);
    meshbottom.SetGeometry(planeGeometry);
    meshbottom.AddMaterial(floorMaterial);

    const left = new GameObject(scene);
    left.transform.scale.set(0.05, 10, 10);
    left.transform.position.x = -5;
    // left.transform.eulerAngles.y = 90;
    const meshleft = left.AddComponent(Components.Mesh);
    meshleft.SetGeometry(cubeGeometry);
    meshleft.AddMaterial(leftMaterial);


    const right = new GameObject(scene);
    right.transform.scale.set(0.05, 10, 10);
    right.transform.position.x = 5;
    // right.transform.eulerAngles.y = -90;
    const meshright = right.AddComponent(Components.Mesh);
    meshright.SetGeometry(cubeGeometry);
    meshright.AddMaterial(rightMaterial);

    const back = new GameObject(scene);
    back.transform.scale.set(10, 10, 0.05);
    back.transform.position.z = -5;
    const meshback = back.AddComponent(Components.Mesh);
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
    const cubeMesh = cube.AddComponent(Components.Mesh);
    cubeMesh.SetGeometry(cubeGeometry);
    cubeMesh.AddMaterial(new PBRMaterial({ albedoColor: new Mathf.Color(1, 1, 1, 1), roughness: roughness, metalness: metalness }));

    const cube2 = new GameObject(scene);
    cube2.transform.scale.set(2, 2, 2);
    cube2.transform.position.set(2, -4, 2);
    cube2.transform.eulerAngles.y = 65;
    const cubeMesh2 = cube2.AddComponent(Components.Mesh);
    cubeMesh2.SetGeometry(cubeGeometry);
    cubeMesh2.AddMaterial(new PBRMaterial({ 
        emissiveColor: new Mathf.Color(1, 0, 0, 1),
        albedoColor: new Mathf.Color(1, 1, 1, 1), roughness: roughness, metalness: metalness }));




    const bunny = (await OBJLoaderIndexed.load("./assets/models/bunny.obj"))[0];
    const gameObject = new GameObject(scene);
    const mesh = gameObject.AddComponent(Components.Mesh)
    mesh.SetGeometry(bunny.geometry);

    // const albedoMap = await GPU.Texture.Load("./test-assets/textures/brick-wall-unity/brick-wall_albedo.png");
    // const normalMap = await GPU.Texture.Load("./test-assets/textures/brick-wall-unity/brick-wall_normal-ogl.png");
    // const metalnessMap = await GPU.Texture.Load("./test-assets/textures/brick-wall-unity/brick-wall_metallic.png");
    // albedoMap.GenerateMips();
    // normalMap.GenerateMips();
    // metalnessMap.GenerateMips();
    const m = new PBRMaterial({
        // albedoMap: albedoMap,
        // normalMap: normalMap,
        // metalnessMap: metalnessMap,
        roughness: 0.1, metalness: 1
        // albedoColor: new Color(1, 1, 1, 1), roughness: roughness, metalness: metalness
    });

    mesh.AddMaterial(m);
    // {

    //     // GLTFParser.Load("./test-assets/GLTF/scenes/Sponza/sponza.gltf").then(sceneObject3D => {
    //     GLTFParser.Load("./test-assets/DamagedHelmet/DamagedHelmet.gltf").then(sceneObject3D => {
    //         console.log(sceneObject3D)

    //         function AddObject3D(obj: Object3D): GameObject {
    //             const gameObject = new GameObject(scene);
    //             gameObject.name = obj.name ? obj.name : "GameObject";

    //             if (obj.localMatrix) {
    //                 obj.localMatrix.decompose(gameObject.transform.position, gameObject.transform.rotation, gameObject.transform.scale)
    //             }

    //             if (obj.geometry && obj.material) {
    //                 if (obj.extensions) {
    //                     // const instancesExtension: ExtensionInstanced = obj.extensions[0];
    //                     // console.log(instancesExtension)

    //                     // const instancedMesh = gameObject.AddComponent(InstancedMesh);
    //                     // instancedMesh.SetGeometry(obj.geometry);
    //                     // instancedMesh.AddMaterial(obj.material);

    //                     // let c = 0;
    //                     // for (const matrix of instancesExtension.instanceMatrices) {
    //                     //     instancedMesh.SetMatrixAt(c, matrix);
    //                     //     c++;
    //                     // }
    //                 }
    //                 else {
    //                     const mesh = gameObject.AddComponent(Mesh);
    //                     mesh.SetGeometry(obj.geometry);
    //                     mesh.AddMaterial(obj.material);
    //                 }
    //             }

    //             return gameObject;
    //         }

    //         function p(obj: Object3D, d = "", parent?: GameObject) {
    //             function generateAdvancedUVs(vertices: Float32Array, indices: Uint32Array): Float32Array {
    //                 let uvArray = new Float32Array((indices.length / 3) * 6); // Creating a UV for each vertex index in every triangle
                
    //                 for (let i = 0; i < indices.length; i += 3) {
    //                     const index1 = indices[i];
    //                     const index2 = indices[i + 1];
    //                     const index3 = indices[i + 2];
                
    //                     // Assuming you are projecting UVs from top (using x, z coordinates)
    //                     uvArray[i * 2] = vertices[index1 * 3] / 10; // Normalize based on your model size or bounds
    //                     uvArray[i * 2 + 1] = vertices[index1 * 3 + 2] / 10;
                
    //                     uvArray[i * 2 + 2] = vertices[index2 * 3] / 10;
    //                     uvArray[i * 2 + 3] = vertices[index2 * 3 + 2] / 10;
                
    //                     uvArray[i * 2 + 4] = vertices[index3 * 3] / 10;
    //                     uvArray[i * 2 + 5] = vertices[index3 * 3 + 2] / 10;
    //                 }
                
    //                 return uvArray;
    //             }

    //             console.log(d, obj.name, obj.geometry ? "G: 1" : "G: 0", parent ? "P: " + parent.name : "P: none");
    //             const gameObject = AddObject3D(obj);

    //             if (parent && gameObject) {
    //                 gameObject.transform.parent = parent.transform;
    //             }

    //             for (const child of obj.children) {
    //                 // if (child.material) child.material.params.albedoColor.set(1, 0, 0, 1);
    //                 // if (child.material) child.material.params.emissiveColor.set(1, 0, 0, 1);
    //                 if (child.geometry && child.geometry.attributes.get("uv") === undefined) {
    //                     const positions = child.geometry.attributes.get("position");
    //                     const indices = child.geometry.index;
    //                     if (!positions || !indices) throw Error("Needs positions and indices");
    //                     const uvs = generateAdvancedUVs(positions.array as Float32Array, indices.array as Uint32Array);
    //                     child.geometry.attributes.set("uv", new VertexAttribute(uvs))
    //                 }
    //                 p(child, d + "\t", gameObject ? gameObject : undefined);
    //             }

    //             return gameObject;
    //         }
    //         p(sceneObject3D)
    //     })

    //     console.log(scene)
    //     // const sponza = await GLTFLoader.load("./test-assets/GLTFScenes/Sponza/sponza.gltf");

    //     // for (const obj of sponza) {
    //     //     const gameObject = new GameObject(scene);
    //     //     // pinesGO.transform.position.set(4, 1, 0);
    //     //     gameObject.transform.scale.set(0.01, 0.01, 0.01);
    //     //     // gameObject.transform.eulerAngles.x = 180;
    //     //     if (!obj.geometry) continue;
    //     //     if (!obj.material) continue;

    //     //     // if (obj.localMatrix) {
    //     //     //     obj.localMatrix.decompose(gameObject.transform.position, gameObject.transform.rotation, gameObject.transform.scale)
    //     //     // }

    //     //     const mesh = gameObject.AddComponent(Mesh);
    //     //     mesh.SetGeometry(obj.geometry);
    //     //     mesh.AddMaterial(obj.material);
    //     //     // // await instancedMesh.SetGeometry(bunnyGeometry[0].geometry);
    //     //     // // instancedMesh.AddMaterial(bunnyGeometry[0].material);

    //     //     // console.log("Adding", obj)
    //     // }


    // }





    {

        const rsmLight = new RSMIndirectLighting(light, 128, 64);
        scene.renderPipeline.AddPass(rsmLight, GPU.RenderPassOrder.AfterLighting);

        const viewerGO = new GameObject(scene);
        const viewerMesh = viewerGO.AddComponent(Components.Mesh);
        viewerMesh.SetGeometry(Geometry.Plane());
        // viewerMesh.AddMaterial(new PBRMaterial({albedoMap: rsmLight.RSMGenerator.rsmDepth, unlit: true}));

        viewerMesh.AddMaterial(new PBRMaterial({ albedoMap: rsmLight.indirectLighting, unlit: true }));
    }

    // scene.renderPipeline.AddPass(new DeferredGBufferPass(), RenderPassOrder.BeforeGBuffer);

    scene.Start();
};

Application();