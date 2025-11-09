import {
    Components,
    Scene,
    Mathf,
    GPU,
    GameObject,
    PBRMaterial,
    Geometry,
    Input,
} from "@trident/core";

import { PhysicsRapier } from "@trident/plugins/PhysicsRapier/PhysicsRapier";
import { PlaneCollider } from "@trident/plugins/PhysicsRapier/colliders/PlaneCollider";
import { CapsuleCollider } from "@trident/plugins/PhysicsRapier/colliders/CapsuleCollider";
import { BoxCollider } from "@trident/plugins/PhysicsRapier/colliders/BoxCollider";
import { ThirdPersonController } from "@trident/plugins/PhysicsRapier/ThirdPersonController";
import { RigidBody } from "@trident/plugins/PhysicsRapier/RigidBody";
import { Debugger } from "@trident/plugins/Debugger";
import { HDRParser } from "@trident/plugins/HDRParser";
import { GLTFLoader } from "@trident/plugins/GLTF/GLTFLoader";
import { UIFolder, UIVecStat } from "@trident/plugins/ui/UIStats";
import { OrbitControls } from "@trident/plugins/OrbitControls";
import { PhysicsDebugger } from "@trident/plugins/PhysicsRapier/PhysicsDebugger";

async function Application(canvas: HTMLCanvasElement) {
    const renderer = GPU.Renderer.Create(canvas, "webgpu");
    const scene = new Scene(renderer);

    const mainCameraGameObject = new GameObject(scene);
    mainCameraGameObject.transform.position.set(0,0,5);
    mainCameraGameObject.name = "MainCamera";
    const camera = mainCameraGameObject.AddComponent(Components.Camera);
    camera.SetPerspective(70, canvas.width / canvas.height, 0.01, 100);
    mainCameraGameObject.transform.LookAtV1(new Mathf.Vector3(0, 0, 0));

    const lightGameObject = new GameObject(scene);
    lightGameObject.transform.position.set(4, 4, 4);
    lightGameObject.transform.LookAtV1(new Mathf.Vector3(0, 0, 0));
    const light = lightGameObject.AddComponent(Components.DirectionalLight);

    const physicsWorld = new GameObject(scene);
    const physicsComponent = physicsWorld.AddComponent(PhysicsRapier);
    await physicsComponent.Load();

    const floorGameObject = new GameObject(scene);
    floorGameObject.transform.eulerAngles.x = -90;
    floorGameObject.transform.scale.set(100, 100, 100);
    const floorMesh = floorGameObject.AddComponent(Components.Mesh);
    floorMesh.geometry = Geometry.Plane();
    floorMesh.material = new PBRMaterial({roughness: 1});
    const planeCollider = floorGameObject.AddComponent(PlaneCollider);

    {
        {
                const floorGameObject = new GameObject(scene);
                floorGameObject.transform.position.y = 0.5;
                floorGameObject.transform.position.x = 2;
                const floorMesh = floorGameObject.AddComponent(Components.Mesh);
                floorMesh.geometry = Geometry.Cube();
                floorMesh.material = new PBRMaterial({albedoColor: new Mathf.Color(1, 0, 0, 1)});
        }

        {
            const floorGameObject = new GameObject(scene);
            floorGameObject.transform.position.y = 1.5;
            floorGameObject.transform.position.x = 2;
            const floorMesh = floorGameObject.AddComponent(Components.Mesh);
            floorMesh.geometry = Geometry.Cube();
            floorMesh.material = new PBRMaterial({albedoColor: new Mathf.Color(0, 1, 0, 1)});

            const playerCollider = floorGameObject.AddComponent(BoxCollider);
            const playerRigidbody = floorGameObject.AddComponent(RigidBody);
        }
    }
    
    // const playerGameObject = new GameObject(scene);
    // playerGameObject.transform.position.y = 1;
    // const playerCollider = playerGameObject.AddComponent(CapsuleCollider);
    // const playerRigidbody = playerGameObject.AddComponent(RigidBody);
    // playerRigidbody.Create("dynamic");
    // const firstPersonController = playerGameObject.AddComponent(ThirdPersonController);

    const hdr = await HDRParser.Load("./assets/textures/HDR/autumn_field_puresky_1k.hdr");
    const sky = await HDRParser.ToCubemap(hdr);

    const skyIrradiance = await HDRParser.GetIrradianceMap(sky);
    const prefilterMap = await HDRParser.GetPrefilterMap(sky);
    const brdfLUT = await HDRParser.GetBRDFLUT(1);

    scene.renderPipeline.skybox = sky;
    scene.renderPipeline.skyboxIrradiance = skyIrradiance;
    scene.renderPipeline.skyboxPrefilter = prefilterMap;
    scene.renderPipeline.skyboxBRDFLUT = brdfLUT;


    function traverse(gameObjects: GameObject[], fn: (gameObject: GameObject) => void) {
        for (const gameObject of gameObjects) {
            fn(gameObject);
            for (const child of gameObject.transform.children) {
                traverse([child.gameObject], fn);
            }
        }
    }

    const sceneGameObject = await GLTFLoader.loadAsGameObjects(scene, "./assets/models/Shadow.glb");
    // sceneGameObject.transform.position.z = -3;
    // sceneGameObject.transform.eulerAngles.y = 180;



    // const cube = new GameObject(scene);
    // cube.transform.position.y = 0.5;
    // const cubeMesh = cube.AddComponent(Components.Mesh);
    // cubeMesh.geometry = Geometry.Cube();
    // cubeMesh.material = new PBRMaterial();

    // sceneGameObject.transform.eulerAngles.y = 180;
    // sceneGameObject.transform.parent = playerGameObject.transform;
    // camera.transform.parent = playerGameObject.transform;
        


    const waterSettingsFolder = new UIFolder(Debugger.ui, "Light");
    waterSettingsFolder.Open();
    new UIVecStat(waterSettingsFolder, "Position:",
        {min: -5, max: 5, value: sceneGameObject.transform.position.x, step: 0.1},
        {min: -5, max: 5, value: sceneGameObject.transform.position.y, step: 0.1},
        {min: -5, max: 5, value: sceneGameObject.transform.position.z, step: 0.1},
        undefined,
        value => {
            sceneGameObject.transform.position.x = value.x;
            sceneGameObject.transform.position.y = value.y;
            sceneGameObject.transform.position.z = value.z;
        }
    );
    // sceneGameObject.transform.scale.mul(0.1);

    let animator: Components.Animator = undefined;
    traverse([sceneGameObject], gameObject => {
        const _animator = gameObject.GetComponent(Components.Animator);
        if (_animator) animator = _animator;
    })

    if (!animator) throw Error("Could not find an animator component");

    // animator.SetClipByIndex(1);

    function GetClipIndexByName(animator: Components.Animator, name: string, partialMatch = true): number {
        for (let i = 0; i < animator.clips.length; i++) {
            const clip = animator.clips[i];
            if (partialMatch && animator.clips[i].name.toLowerCase().includes(name.toLocaleLowerCase())) return i;
            else if (animator.clips[i].name === name) return i;
        }
        return -1;
    }


    const playerGameObject = new GameObject(scene);
    // playerGameObject.transform.position.y = 1;
    const playerCollider = playerGameObject.AddComponent(CapsuleCollider);
    const playerRigidbody = playerGameObject.AddComponent(RigidBody);
    playerRigidbody.Create("dynamic");
    playerRigidbody.rigidBody.lockRotations(true, true);
    const firstPersonController = playerGameObject.AddComponent(ThirdPersonController);
    firstPersonController._controller = playerRigidbody;
    firstPersonController._model = sceneGameObject;
    firstPersonController._mainCamera = camera.gameObject;
    firstPersonController._animator = animator;
    firstPersonController._animationIDS = { idle: GetClipIndexByName(animator, "Rig|Rig|Idle_Loop", false), walk: GetClipIndexByName(animator, "walk"), sprint: GetClipIndexByName(animator, "sprint"), jump: GetClipIndexByName(animator, "Jump_Start"), fall: GetClipIndexByName(animator, "fall") };

    console.log(animator)

    const physicsDebuggerGO = new GameObject(scene);
    physicsDebuggerGO.AddComponent(PhysicsDebugger);

    Debugger.Enable();

    scene.Start();
};

Application(document.querySelector("canvas"));