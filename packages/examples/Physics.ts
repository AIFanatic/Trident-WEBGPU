import {
    Geometry,
    Components,
    Scene,
    Renderer,
    Mathf,
    GameObject,
    PBRMaterial,
} from "@trident/core";

import { OrbitControls } from "@trident/plugins/OrbitControls";
import { PhysicsRapier } from "@trident/plugins/PhysicsRapier/PhysicsRapier";
import { SphereCollider } from "@trident/plugins/PhysicsRapier/colliders/SphereCollider";
import { PlaneCollider } from "@trident/plugins/PhysicsRapier/colliders/PlaneCollider";
import { RigidBody } from "@trident/plugins/PhysicsRapier/RigidBody";
import { PhysicsDebugger } from "@trident/plugins/PhysicsRapier/PhysicsDebugger";

async function Application(canvas: HTMLCanvasElement) {
    const renderer = Renderer.Create(canvas, "webgpu");
    const scene = new Scene(renderer);

    const mainCameraGameObject = new GameObject(scene);
    mainCameraGameObject.transform.position.set(0, 0, 20);
    mainCameraGameObject.transform.LookAtV1(new Mathf.Vector3(0, 0, 0));
    mainCameraGameObject.name = "MainCamera";
    const camera = mainCameraGameObject.AddComponent(Components.Camera);
    camera.SetPerspective(72, canvas.width / canvas.height, 0.5, 500);

    const controls = new OrbitControls(canvas, camera);

    const lightGameObject = new GameObject(scene);
    lightGameObject.transform.position.set(-4, 4, -4);
    lightGameObject.transform.LookAtV1(new Mathf.Vector3(0, 0, 0));
    const light = lightGameObject.AddComponent(Components.DirectionalLight);
    
    const physicsWorld = new GameObject(scene);
    const physicsComponent = physicsWorld.AddComponent(PhysicsRapier);
    await physicsComponent.Load();

    const sphereGO = new GameObject(scene);
    sphereGO.transform.position.y = 5;
    const sphereMesh = sphereGO.AddComponent(Components.Mesh);
    await sphereMesh.SetGeometry(Geometry.Sphere());
    sphereMesh.AddMaterial(new PBRMaterial({albedoColor: new Mathf.Color(1, 0, 0, 1)}));
    sphereGO.AddComponent(SphereCollider);
    const sphereRigidbody = sphereGO.AddComponent(RigidBody);
    sphereRigidbody.Create("dynamic");

    const floor = new GameObject(scene);
    floor.transform.eulerAngles.x = -90;
    floor.transform.scale.set(10, 10, 0.01);
    const floorMesh = floor.AddComponent(Components.Mesh);
    await floorMesh.SetGeometry(Geometry.Plane());
    floorMesh.AddMaterial(new PBRMaterial());
    floor.AddComponent(PlaneCollider);
    const floorRigidbody = floor.AddComponent(RigidBody);
    floorRigidbody.Create("fixed");


    const physicsDebuggerGO = new GameObject(scene);
    physicsDebuggerGO.AddComponent(PhysicsDebugger);

    scene.Start();
};

Application(document.querySelector("canvas"));