import { Components, Scene, GPU, Mathf, GameObject, Geometry, IndexAttribute, PBRMaterial, VertexAttribute, Runtime, PlayerRuntime } from "@trident/core";

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
    await PlayerRuntime.Create(canvas);
    const scene = PlayerRuntime.SceneManager.CreateScene("DefaultScene");
    PlayerRuntime.SceneManager.SetActiveScene(scene);
    
    const mainCameraGameObject = new GameObject();
    mainCameraGameObject.transform.position.set(1.3214703183015142, 1.204350593000603, 0.8880642037210573);
    mainCameraGameObject.transform.rotation.set(-0.22277136531362418, 0.4210578424541847, 0.10748743891250674, 0.8726566693609583);
    mainCameraGameObject.name = "MainCamera";
    const camera = mainCameraGameObject.AddComponent(Components.Camera);
    camera.SetPerspective(60, canvas.width / canvas.height, 0.05, 100);
    mainCameraGameObject.AddComponent(OrbitControls);

    const lightGameObject = new GameObject();
    lightGameObject.transform.position.set(0, 2, 0);
    lightGameObject.transform.LookAt(new Mathf.Vector3(0, 0, 0));
    const light = lightGameObject.AddComponent(Components.SpotLight);
    light.castShadows = true;
    light.intensity = 10

    const rootGameObject = await GLTFLoader.Load("/extra/test-assets/editor/room.glb", scene);
    console.log(rootGameObject)
    
    Debugger.Enable();
};

Application(document.querySelector("canvas"));