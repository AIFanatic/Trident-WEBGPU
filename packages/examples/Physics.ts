import { Geometry, Components, Mathf, GameObject, PBRMaterial, Runtime, PlayerRuntime } from "@trident/core";

import { OrbitControls } from "@trident/plugins/OrbitControls";
import { PhysicsRapier } from "@trident/plugins/PhysicsRapier/PhysicsRapier";
import { SphereCollider } from "@trident/plugins/PhysicsRapier/colliders/SphereCollider";
import { PlaneCollider } from "@trident/plugins/PhysicsRapier/colliders/PlaneCollider";
import { RigidBody } from "@trident/plugins/PhysicsRapier/RigidBody";
import { PhysicsDebugger } from "@trident/plugins/PhysicsRapier/PhysicsDebugger";

async function Application(canvas: HTMLCanvasElement) {
    await PlayerRuntime.Create(canvas);
    const scene = PlayerRuntime.SceneManager.CreateScene("DefaultScene");
    PlayerRuntime.SceneManager.SetActiveScene(scene);

    const mainCameraGameObject = new GameObject();
    mainCameraGameObject.transform.position.set(0, 0, 20);
    mainCameraGameObject.transform.LookAtV1(new Mathf.Vector3(0, 0, 0));
    mainCameraGameObject.name = "MainCamera";
    const camera = mainCameraGameObject.AddComponent(Components.Camera);
    camera.SetPerspective(72, canvas.width / canvas.height, 0.5, 500);

    mainCameraGameObject.AddComponent(OrbitControls);

    const lightGameObject = new GameObject();
    lightGameObject.transform.position.set(-4, 4, -4);
    lightGameObject.transform.LookAtV1(new Mathf.Vector3(0, 0, 0));
    lightGameObject.AddComponent(Components.DirectionalLight);
    

    await Runtime.AddSystem(PhysicsRapier);

    const sphereGO = new GameObject();
    sphereGO.transform.position.y = 5;
    const sphereMesh = sphereGO.AddComponent(Components.Mesh);
    sphereMesh.geometry = Geometry.Sphere();
    sphereMesh.material = new PBRMaterial({albedoColor: new Mathf.Color(1, 0, 0, 1)});
    sphereGO.AddComponent(SphereCollider);
    const sphereRigidbody = sphereGO.AddComponent(RigidBody);
    sphereRigidbody.Create("dynamic");
    sphereRigidbody.isKinematic = false;

    const floor = new GameObject();
    floor.transform.eulerAngles.x = -90;
    floor.transform.scale.set(10, 10, 0.01);
    const floorMesh = floor.AddComponent(Components.Mesh);
    floorMesh.geometry = Geometry.Plane();
    floorMesh.material = new PBRMaterial();
    floor.AddComponent(PlaneCollider);
    const floorRigidbody = floor.AddComponent(RigidBody);
    floorRigidbody.Create("fixed");


    const physicsDebuggerGO = new GameObject();
    physicsDebuggerGO.AddComponent(PhysicsDebugger);
};

Application(document.querySelector("canvas") as HTMLCanvasElement);