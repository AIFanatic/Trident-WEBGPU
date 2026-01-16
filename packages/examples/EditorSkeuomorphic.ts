import { Components, Scene, GPU, Mathf, GameObject, Geometry, IndexAttribute, PBRMaterial, VertexAttribute } from "@trident/core";

import { OrbitControls } from "@trident/plugins/OrbitControls";
import { GLTFLoader } from "@trident/plugins/GLTF/GLTFLoader";
import { Debugger } from "@trident/plugins/Debugger";
import { HDRParser } from "@trident/plugins/HDRParser";
import { Environment } from "@trident/plugins/Environment/Environment";
import { PhysicsRapier } from "@trident/plugins/PhysicsRapier/PhysicsRapier";
import { BoxCollider } from "@trident/plugins/PhysicsRapier/colliders/BoxCollider";
import { PhysicsDebugger } from "@trident/plugins/PhysicsRapier/PhysicsDebugger";
import { PlaneCollider } from "@trident/plugins/PhysicsRapier/colliders/PlaneCollider";
import { RigidBody } from "@trident/plugins/PhysicsRapier/RigidBody";
import { SphereCollider } from "@trident/plugins/PhysicsRapier/colliders/SphereCollider";
import { MeshCollider } from "@trident/plugins/PhysicsRapier/colliders/MeshCollider";
import { SpotLightHelper } from "@trident/plugins/SpotLightHelper";

async function Application(canvas: HTMLCanvasElement) {
    const renderer = GPU.Renderer.Create(canvas, "webgpu", 2);
    const scene = new Scene(renderer);

    const mainCameraGameObject = new GameObject(scene);
    mainCameraGameObject.transform.position.set(1.3214703183015142, 1.204350593000603, 0.8880642037210573);
    mainCameraGameObject.transform.rotation.set(-0.22277136531362418, 0.4210578424541847, 0.10748743891250674, 0.8726566693609583);
    mainCameraGameObject.name = "MainCamera";
    const camera = mainCameraGameObject.AddComponent(Components.Camera);
    camera.SetPerspective(60, canvas.width / canvas.height, 0.05, 100);

    // mainCameraGameObject.transform.position.set(0, 0, 2);
    // mainCameraGameObject.transform.LookAtV1(new Mathf.Vector3(0, 0, 0));

    const controls = new OrbitControls(canvas, camera);

    const lightGameObject = new GameObject(scene);
    lightGameObject.transform.position.set(0, 2, 0);
    lightGameObject.transform.LookAt(new Mathf.Vector3(0, 0, 0));
    const light = lightGameObject.AddComponent(Components.SpotLight);
    light.castShadows = true;
    light.intensity = 0.01

    const lightHelper = lightGameObject.AddComponent(SpotLightHelper);
    lightHelper.light = light;

    const hdr = await HDRParser.Load("/extra/test-assets/editor/brown_photostudio_01_1k.hdr");
    const skyTexture = await HDRParser.ToCubemap(hdr);

    const environment = new Environment(scene, skyTexture);
    await environment.init();

    // const prefab = await GLTFLoader.LoadFromURL("./assets/models/DamagedHelmet/DamagedHelmet.gltf");
    const prefab = await GLTFLoader.LoadFromURL("/extra/test-assets/editor/room.glb");
    console.log(prefab)

    const rootGameObject = scene.Instantiate(prefab);
    rootGameObject.transform.Update();
    
    function traverse(gameObjects: GameObject[], fn: (gameObject: GameObject) => void) {
        for (const gameObject of gameObjects) {
            fn(gameObject);
            for (const child of gameObject.transform.children) {
                traverse([child.gameObject], fn);
            }
        }
    }

    let modelsGameObject: GameObject = undefined;
    traverse([rootGameObject], gameObject => {
        if (gameObject.name === "ModelsBox_Prim_0") {
            modelsGameObject = gameObject;
        }
    });

    console.log(modelsGameObject.transform.position)

    const physicsGameObject = new GameObject(scene);
    const physics = physicsGameObject.AddComponent(PhysicsRapier);
    await physics.Load();

    const physicsDebuggerGO = new GameObject(scene);
    physicsDebuggerGO.AddComponent(PhysicsDebugger);

    const p = new Mathf.Vector3();
    const q = new Mathf.Quaternion();
    const s = new Mathf.Vector3();
    modelsGameObject.transform.localToWorldMatrix.decompose(p, q, s);
    
    modelsGameObject.AddComponent(MeshCollider);
    const rigid = modelsGameObject.AddComponent(RigidBody);
    // rigid.Create("kinematicPosition");
    
    setTimeout(() => {
        const v = p
        v.z += 0.1;

        rigid.rigidBody.setNextKinematicTranslation(v);

        console.log(rigid)
    }, 2000);
    
    Debugger.Enable();
    scene.Start();
};

Application(document.querySelector("canvas"));