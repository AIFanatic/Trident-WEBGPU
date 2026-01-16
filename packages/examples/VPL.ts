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
import { BoxCollider } from "@trident/plugins/PhysicsRapier/colliders/BoxCollider";
import { Collider } from "@trident/plugins/PhysicsRapier/colliders/Collider";
import { VPLGenerator, FakeGI } from "@trident/plugins/VPLGenerator";
import { Debugger } from "@trident/plugins/Debugger";
import { SpotLightHelper } from "@trident/plugins/SpotLightHelper";

async function Application(canvas: HTMLCanvasElement) {
    const renderer = Renderer.Create(canvas, "webgpu");
    const scene = new Scene(renderer);

    const mainCameraGameObject = new GameObject(scene);
    mainCameraGameObject.transform.position.set(0, 6, 16);
    mainCameraGameObject.transform.LookAtV1(new Mathf.Vector3(0, 2, 0));
    mainCameraGameObject.name = "MainCamera";
    const camera = mainCameraGameObject.AddComponent(Components.Camera);
    camera.SetPerspective(60, canvas.width / canvas.height, 0.1, 200);

    new OrbitControls(canvas, camera);

    const lightGameObject = new GameObject(scene);
    lightGameObject.transform.position.set(-4, 4, 4);
    lightGameObject.transform.LookAtV1(new Mathf.Vector3(0, 0, 0));
    const light = lightGameObject.AddComponent(Components.DirectionalLight);
    light.castShadows = true;
    light.intensity = 1

    const sourceLightGO = new GameObject(scene);
    sourceLightGO.transform.position.set(0, 6, 6);
    sourceLightGO.transform.LookAtV1(new Mathf.Vector3(0, 2, 0));
    const sourceLight = sourceLightGO.AddComponent(Components.SpotLight);
    sourceLight.color.set(1.0, 0.95, 0.9, 1.0);
    sourceLight.intensity = 500.0;
    sourceLight.range = 25;
    sourceLight.angle = 80 * Mathf.Deg2Rad * 0.5;
    const fakeGI = sourceLightGO.AddComponent(FakeGI);
    fakeGI.useRaycasting = false;
    fakeGI.secondaryBounce = false;
    fakeGI.useIndirectShadows = false;
    fakeGI.automaticWeights = false;
    fakeGI.distanceScale = 5.0;
    fakeGI.minIntensity = 0.05;
    fakeGI.forceEnable = true;
    fakeGI.avgRefl = 0.4;
    fakeGI.avgSecondaryDistance = 1.0;

    const physicsWorld = new GameObject(scene);
    const physicsComponent = physicsWorld.AddComponent(PhysicsRapier);
    await physicsComponent.Load();



    {
        const floor = new GameObject(scene);
        floor.transform.scale.set(5, 5, 5);
        floor.transform.position.y = -5;
        floor.transform.eulerAngles.x = -90;
        const meshbottom = floor.AddComponent(Components.Mesh);
        meshbottom.geometry = Geometry.Plane();
        meshbottom.material = new PBRMaterial({ albedoColor: new Mathf.Color(1, 1, 1, 1), roughness: 0.7, metalness: 0.1 });
        floor.AddComponent(BoxCollider);

        const left = new GameObject(scene);
        left.transform.scale.set(0.05, 10, 10);
        left.transform.position.x = -5;
        const meshleft = left.AddComponent(Components.Mesh);
        meshleft.geometry = Geometry.Cube();
        meshleft.material = new PBRMaterial({ albedoColor: new Mathf.Color(1, 0, 0, 1), roughness: 0.7, metalness: 0.1 });
        left.AddComponent(BoxCollider);


        const right = new GameObject(scene);
        right.transform.scale.set(0.05, 10, 10);
        right.transform.position.x = 5;
        right.transform.eulerAngles.y = -180;
        const meshright = right.AddComponent(Components.Mesh);
        meshright.geometry = Geometry.Cube();
        meshright.material = new PBRMaterial({ albedoColor: new Mathf.Color(0, 1, 0, 1), roughness: 0.7, metalness: 0.1 });
        right.AddComponent(BoxCollider);

        const back = new GameObject(scene);
        back.transform.scale.set(10, 10, 0.05);
        back.transform.position.z = -5;
        const meshback = back.AddComponent(Components.Mesh);
        meshback.geometry = Geometry.Cube();
        meshback.material = new PBRMaterial({ albedoColor: new Mathf.Color(1, 1, 1, 1), roughness: 0.7, metalness: 0.1 });
        back.AddComponent(BoxCollider);

        const top = new GameObject(scene);
        top.transform.scale.set(5, 5, 5);
        top.transform.position.y = 5;
        top.transform.eulerAngles.x = 90;
        const meshtop = top.AddComponent(Components.Mesh);
        meshtop.geometry = Geometry.Plane();
        meshtop.material = new PBRMaterial({ albedoColor: new Mathf.Color(1, 1, 1, 1), roughness: 0.7, metalness: 0.1 });
        top.AddComponent(BoxCollider);


        const cube = new GameObject(scene);
        cube.transform.scale.set(2, 4, 2);
        cube.transform.position.set(-2, -3, -2);
        cube.transform.eulerAngles.y = 20;
        const cubeMesh = cube.AddComponent(Components.Mesh);
        cubeMesh.geometry = Geometry.Cube();
        cubeMesh.material = new PBRMaterial({ albedoColor: new Mathf.Color(1, 1, 1, 1), roughness: 0.7, metalness: 0.1 });
        cube.AddComponent(BoxCollider);

        const cube2 = new GameObject(scene);
        cube2.transform.scale.set(2, 2, 2);
        cube2.transform.position.set(2, -4, 2);
        cube2.transform.eulerAngles.y = 65;
        const cubeMesh2 = cube2.AddComponent(Components.Mesh);
        cubeMesh2.geometry = Geometry.Cube();
        cubeMesh2.material = new PBRMaterial({ emissiveColor: new Mathf.Color(1, 0, 0, 1), albedoColor: new Mathf.Color(1, 1, 1, 1), roughness: 0.7, metalness: 0.1 });
        cube2.AddComponent(BoxCollider);
    }

    PhysicsRapier.PhysicsWorld.step();

    const vplGen = new VPLGenerator({
        maxNumVPLs: 40,
        maxLevel: 2,
        spacing: 1.5,
        maxDistance: 40
    });

    const colliderColorMap: Map<number, Mathf.Color> = new Map();
    for (const go of scene.GetGameObjects()) {
        const collider = go.GetComponent(Collider);
        const mesh = go.GetComponent(Components.Mesh);
        if (!collider || !mesh || !mesh.material) continue;
        if (!(mesh.material instanceof PBRMaterial)) continue;
        const handle = (collider.collider as any)?.handle;
        if (handle === undefined) continue;
        colliderColorMap.set(handle, mesh.material.params.albedoColor.clone());
    }

    const vpls = vplGen.GenerateFromLight(sourceLight, {
        sampleColor: (hit) => {
            const handle = (hit.collider as any)?.handle;
            const color = handle !== undefined ? colliderColorMap.get(handle) : undefined;
            return color ? color.clone() : sourceLight.color.clone();
        }
    });
    const lightGameObjects = vplGen.CreateLights(scene, vpls, { enabled: false, spotAngleDeg: 160 });
    fakeGI.RefreshVPLs();

    console.log(vpls)
    // for (const gameObject of lightGameObjects) {
    //     const spotLight = gameObject.GetComponent(Components.SpotLight);
    //     if (spotLight) {
    //         const spotLightHelper = gameObject.AddComponent(SpotLightHelper);
    //         spotLightHelper.light = spotLight;
    //     }
    // }

    Debugger.Enable();

    scene.Start();
};

Application(document.querySelector("canvas"));
