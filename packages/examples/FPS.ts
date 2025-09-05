import {
    Components,
    Scene,
    Mathf,
    GPU,
    GameObject,
    PBRMaterial,
} from "@trident/core";

import { OrbitControls } from "@trident/plugins/OrbitControls";
import { TerrainBuilder } from "@trident/plugins/TerrainGenerator/TerrainBuilder";
import { PhysicsRapier } from "@trident/plugins/PhysicsRapier/PhysicsRapier";
import { PhysicsDebugger } from "@trident/plugins/PhysicsRapier/PhysicsDebugger";
import { SphereCollider } from "@trident/plugins/PhysicsRapier/colliders/SphereCollider";
import { PlaneCollider } from "@trident/plugins/PhysicsRapier/colliders/PlaneCollider";
import { CapsuleCollider } from "@trident/plugins/PhysicsRapier/colliders/CapsuleCollider";
import { TerrainCollider } from "@trident/plugins/PhysicsRapier/colliders/TerrainCollider";
import { FirstPersonController } from "@trident/plugins/PhysicsRapier/FirstPersonController";
import { RigidBody } from "@trident/plugins/PhysicsRapier/RigidBody";
import { Debugger } from "@trident/plugins/Debugger";
import { LineRenderer } from "@trident/plugins/LineRenderer";

async function Application(canvas: HTMLCanvasElement) {
    const renderer = GPU.Renderer.Create(canvas, "webgpu");
    const scene = new Scene(renderer);

    const mainCameraGameObject = new GameObject(scene);
    mainCameraGameObject.transform.position.set(0,0,-15);
    mainCameraGameObject.name = "MainCamera";
    const camera = mainCameraGameObject.AddComponent(Components.Camera);
    camera.SetPerspective(72, canvas.width / canvas.height, 0.5, 5000);


    mainCameraGameObject.transform.position.set(0, 0, 20);
    mainCameraGameObject.transform.LookAtV1(new Mathf.Vector3(0, 0, 0));

    const controls = new OrbitControls(canvas, camera);

    const lightGameObject = new GameObject(scene);
    lightGameObject.transform.position.set(-4, 4, -4);
    lightGameObject.transform.LookAtV1(new Mathf.Vector3(0, 0, 0));
    const light = lightGameObject.AddComponent(Components.DirectionalLight);

    const physicsWorld = new GameObject(scene);
    const physicsComponent = physicsWorld.AddComponent(PhysicsRapier);
    await physicsComponent.Load();


    const terrainSize = 128;
    const terrain = new TerrainBuilder(terrainSize);

    const terrainGameObject = new GameObject(scene);
    terrainGameObject.transform.scale.set(10, 10, 10);
    terrainGameObject.transform.position.z -= terrainSize * 0.5;
    terrainGameObject.transform.position.x -= terrainSize * 0.5;
    terrainGameObject.transform.position.y = -5;

    // terrainGameObject.transform.position.x -= 5 * 10;

    const terrainAlbedo = await GPU.Texture.Load("./assets/textures/rocky_terrain_02_2k/rocky_terrain_02_diff_2k.jpg");
    const terrainNormal = await GPU.Texture.Load("./assets/textures/rocky_terrain_02_2k/rocky_terrain_02_nor_gl_2k.jpg");
    const terrainSpec = await GPU.Texture.Load("./assets/textures/rocky_terrain_02_2k/rocky_terrain_02_spec_2k.jpg");
    const material = new PBRMaterial({albedoMap: terrainAlbedo, normalMap: terrainNormal, metalnessMap: terrainSpec});
    // const material = new PBRMaterial();
    const terrainMesh = terrainGameObject.AddComponent(Components.Mesh);
    const terrainCollider = terrainGameObject.AddComponent(TerrainCollider);
    // terrainCollider.SetTerrainDataTrimesh(terrain.geometry.attributes.get("position").array, terrain.geometry.index.array)
    terrainCollider.SetTerrainData(
        terrainSize,
        terrainSize,
        terrain.heights,
        terrainGameObject.transform.scale
    );
    terrainMesh.SetGeometry(terrain.geometry);
    terrainMesh.AddMaterial(material);

    // const playerGameObject = new GameObject(scene);
    // playerGameObject.transform.position.y = 100;
    // const playerCollider = playerGameObject.AddComponent(CapsuleCollider);
    // const playerRigidbody = playerGameObject.AddComponent(RigidBody);
    // playerRigidbody.Create("dynamic");
    // const firstPersonController = playerGameObject.AddComponent(FirstPersonController);
    // firstPersonController.camera = Components.Camera.mainCamera;


    // const physicsDebuggerGO = new GameObject(scene);
    // physicsDebuggerGO.AddComponent(PhysicsDebugger);

    Debugger.Enable();

    scene.Start();
};

Application(document.querySelector("canvas"));