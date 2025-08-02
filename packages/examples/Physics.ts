import { GameObject } from "../GameObject";
import { Camera } from "../components/Camera";
import { Scene } from "../Scene";
import { Geometry, IndexAttribute, VertexAttribute } from "../Geometry";
import { Renderer } from "../renderer/Renderer";
import { OrbitControls } from "../plugins/OrbitControls";

import { Material, PBRMaterial } from "../renderer/Material";

import { Mesh } from "../components/Mesh";

import { Color } from "../math/Color";
import { Vector3 } from "../math/Vector3";
import { DirectionalLight } from "../components/Light";
import { PhysicsRapier } from "../plugins/PhysicsRapier/PhysicsRapier";
import { SphereCollider } from "../plugins/PhysicsRapier/colliders/SphereCollider";
import { RigidBody } from "../plugins/PhysicsRapier/RigidBody";

import { TerrainCollider } from "../plugins/PhysicsRapier/colliders/TerrainCollider";

import { Texture } from "../renderer/Texture";
import { FirstPersonController } from "../plugins/PhysicsRapier/FirstPersonController";
import { TerrainGenerator } from "../plugins/TerrainGenerator";
import { GLTFLoader } from "../plugins/GLTF/gltf";
import { InstancedMesh } from "../components/InstancedMesh";
import { Matrix4 } from "../math/Matrix4";
import { Quaternion } from "../math/Quaternion";
import { MeshletMesh } from "../plugins/meshlets/MeshletMesh";
import { ImpostorMesh } from "../plugins/Impostors/ImpostorMesh";
import { Debugger } from "../plugins/Debugger";
import { UIFolder, UISliderStat } from "../plugins/ui/UIStats";
import { MeshletDraw } from "../plugins/meshlets/passes/MeshletDraw";
import { RenderPassOrder } from "../renderer/RenderingPipeline";


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
    mainCameraGameObject.transform.LookAtV1(new Vector3(0, 0, 0));
    mainCameraGameObject.name = "MainCamera";
    const camera = mainCameraGameObject.AddComponent(Camera);
    camera.SetPerspective(72, canvas.width / canvas.height, 0.5, 500);

    const controls = new OrbitControls(canvas, camera);

    {
        const lightGameObject = new GameObject(scene);
        lightGameObject.transform.position.set(-4, 4, -4);
        lightGameObject.transform.LookAtV1(new Vector3(0, 0, 0));
        const light = lightGameObject.AddComponent(DirectionalLight);
        light.intensity = 1;
        light.color.set(1, 1, 1, 1);

        const sphereMesh = lightGameObject.AddComponent(Mesh);
        sphereMesh.enableShadows = false;
        await sphereMesh.SetGeometry(Geometry.Sphere());
        sphereMesh.AddMaterial(new PBRMaterial({unlit: true}));

        const lightPositionDebug = new UIFolder(Debugger.ui, "Light position");
        const lightPositionDebugX = new UISliderStat(lightPositionDebug, "X:", -10, 10, 1, 0, value => {lightGameObject.transform.position.x = value});
        const lightPositionDebugY = new UISliderStat(lightPositionDebug, "Y:", -10, 10, 1, 0, value => {lightGameObject.transform.position.y = value});
        const lightPositionDebugZ = new UISliderStat(lightPositionDebug, "Z:", -10, 10, 1, 0, value => {lightGameObject.transform.position.z = value});
        lightPositionDebug.Open();
        setInterval(() => {
            lightGameObject.transform.LookAtV1(new Vector3(0, 0, 0));
        }, 100);
    }
    
    const physicsWorld = new GameObject(scene);
    const physicsComponent = physicsWorld.AddComponent(PhysicsRapier);
    await physicsComponent.Load();

    
    const terrainSize = 128;
    const terrain = new TerrainGenerator(terrainSize);
    const gameObject = new GameObject(scene);
    // gameObject.transform.eulerAngles.x = 180;
    gameObject.transform.position.z -= terrainSize * 0.5;
    gameObject.transform.position.x -= terrainSize * 0.5;
    gameObject.transform.position.y = -5;

    const terrainAlbedo = await Texture.Load("./assets/textures/rocky_terrain_02_2k.gltf/textures/rocky_terrain_02_diff_2k.jpg");
    const terrainNormal = await Texture.Load("./assets/textures/rocky_terrain_02_2k.gltf/textures/rocky_terrain_02_nor_gl_2k.jpg");
    const terrainSpec = await Texture.Load("./assets/textures/rocky_terrain_02_2k.gltf/textures/rocky_terrain_02_spec_2k.jpg");
    const material = new PBRMaterial({albedoMap: terrainAlbedo, normalMap: terrainNormal, metalnessMap: terrainSpec});
    const mesh = gameObject.AddComponent(Mesh);
    await mesh.SetGeometry(terrain.geometry);
    mesh.AddMaterial(material);

    const collider = gameObject.AddComponent(TerrainCollider);

    collider.SetTerrainData(
        terrainSize,
        terrainSize,
        terrain.heights,
        new Vector3(terrainSize, 1, terrainSize)
    );

    {
        // const c = 10;
        // for (let i = 0; i < c; i++) {
        //     const sphereGO = new GameObject(scene);
        //     sphereGO.transform.position.x = Math.random() * 10;
        //     sphereGO.transform.position.z = Math.random() * 10;
        //     sphereGO.transform.position.y = 10;
        //     // sphereGO.transform.eulerAngles.x = -90;
        //     const sphereMesh = sphereGO.AddComponent(Mesh);
        //     await sphereMesh.SetGeometry(Geometry.Sphere());
        //     sphereMesh.AddMaterial(new PBRMaterial({albedoColor: new Color(1, 0, 0, 1)}));
        //     sphereGO.AddComponent(SphereCollider);
        //     const rigid = sphereGO.AddComponent(RigidBody);
        //     rigid.Create("dynamic");
        // }
        const sphereGO = new GameObject(scene);
        sphereGO.transform.position.y = 5;
        sphereGO.transform.position.x = 2.1;
        // sphereGO.transform.eulerAngles.x = -90;
        const sphereMesh = sphereGO.AddComponent(Mesh);
        await sphereMesh.SetGeometry(Geometry.Sphere());
        sphereMesh.AddMaterial(new PBRMaterial({albedoColor: new Color(1, 0, 0, 1)}));
        sphereGO.AddComponent(SphereCollider);
        const r = sphereGO.AddComponent(RigidBody);
        r.Create("dynamic")
    }

    {
        const playerGameObject = new GameObject(scene);
        playerGameObject.transform.position.y = 30;
        playerGameObject.transform.position.x = 2.1;
        // playerGameObject.transform.eulerAngles.x = -90;
        const sphereMesh = playerGameObject.AddComponent(Mesh);
        await sphereMesh.SetGeometry(Geometry.Sphere());
        sphereMesh.AddMaterial(new PBRMaterial({albedoColor: new Color(1, 0, 0, 1)}));

        playerGameObject.AddComponent(SphereCollider);
        const rigidbody = playerGameObject.AddComponent(RigidBody);
        rigidbody.Create("kinematicPosition");
        // const firstPersonController = playerGameObject.AddComponent(FirstPersonController);
        // firstPersonController.camera = camera;
    }



    const terrainGeometryPositions = terrain.geometry.attributes.get("position");
    if (!terrainGeometryPositions) throw Error("Uh oh");

    const pine = await GLTFLoader.load("./assets/models/quiver_tree_02/quiver_tree_02.gltf");
    // const pine = await GLTFLoader.load("./assets/models/tree_small_02_2k.gltf/tree_small_02_2k.gltf");
    // const pine = await GLTFLoader.load(".//assets/terrain/models/grass_medium_01_2k.gltf/grass_medium_01_2k.gltf");
    let instances = 0;

    // // Instances
    // const pinesGO = new GameObject(scene);
    // const instancedMesh = pinesGO.AddComponent(InstancedMesh);
    // await instancedMesh.SetGeometry(pine[0].geometry);
    // instancedMesh.AddMaterial(pine[0].material);

    // const m = new Matrix4();
    // const p = new Vector3();
    // const q = new Quaternion();
    // const s = new Vector3(5,5,5);
    
    // for (let i = 0; i < terrainGeometryPositions.array.length; i+=3) {
    //     const generate = Math.random() > 0.99;

    //     if (generate === true) {
    //         p.set(terrainGeometryPositions.array[i + 0], terrainGeometryPositions.array[i + 1] - 5.5, terrainGeometryPositions.array[i + 2]);
    //         p.z -= terrainSize * 0.5;
    //         p.x -= terrainSize * 0.5;
    //         m.compose(p, q, s);
    //         instancedMesh.SetMatrixAt(instances, m);
    //         instances++;
    //     }
    // }



    // // Meshlets
    // scene.renderPipeline.AddPass(new MeshletDraw(), RenderPassOrder.BeforeGBuffer);
    // for (let i = 0; i < terrainGeometryPositions.array.length; i+=3) {
    //     const generate = Math.random() > 0.99;

    //     if (generate === true) {
    //         const p = new Vector3();
    //         p.set(terrainGeometryPositions.array[i + 0], terrainGeometryPositions.array[i + 1], terrainGeometryPositions.array[i + 2]);
    //         p.z -= terrainSize * 0.5;
    //         p.x -= terrainSize * 0.5;

    //         const pinesGO = new GameObject(scene);
    //         pinesGO.transform.position.copy(p);
    //         // pinesGO.transform.scale.set(5, 5, 5);
    //         const meshletMesh = pinesGO.AddComponent(MeshletMesh);
    //         await meshletMesh.SetGeometry(pine[0].geometry);
    //         meshletMesh.AddMaterial(pine[0].material);
    //         instances++;
    //     }
    // }

    // // Impostors
    // const pinesGO = new GameObject(scene);
    // const bunnyImpostor = pinesGO.AddComponent(ImpostorMesh);
    // await bunnyImpostor.Create(pine);

    // const instancedMeshGameObject = new GameObject(scene);
    // const instancedMesh = instancedMeshGameObject.AddComponent(InstancedMesh);
    // instancedMesh.enableShadows = false;
    // await instancedMesh.SetGeometry(bunnyImpostor.impostorGeometry);
    // const m = new Material();
    // m.shader = bunnyImpostor.impostorShader;
    // instancedMesh.AddMaterial(m);

    // const mat = new Matrix4();
    // const p = new Vector3();
    // const r = new Quaternion();
    // const s = new Vector3(3,3,3);
    
    // for (let i = 0; i < terrainGeometryPositions.array.length; i+=3) {
    //     const generate = Math.random() > 0.99;

    //     if (generate === true) {
    //         p.set(terrainGeometryPositions.array[i + 0], terrainGeometryPositions.array[i + 1] - 3.5, terrainGeometryPositions.array[i + 2]);
    //         p.z -= terrainSize * 0.5;
    //         p.x -= terrainSize * 0.5;
    //         p.z += Math.random();
    //         p.x += Math.random();
    //         // p.y += 2;

    //         mat.compose(p, r, s);
    //         instancedMesh.SetMatrixAt(instances, mat);

    //         instances++;
    //     }
    // }

    // console.log(instances);



    scene.Start();
};

Application();