import { Utils, Runtime, Deserializer, Component, Assets, Components } from "@trident/core";

import { OrbitControls } from "@trident/plugins/OrbitControls";
import { Debugger } from "@trident/plugins/Debugger";

import { Terrain } from "@trident/plugins/Terrain/Terrain";
import { PhysicsRapier } from "@trident/plugins/PhysicsRapier/PhysicsRapier";
import { TerrainCollider } from "@trident/plugins/PhysicsRapier/colliders/TerrainCollider";

async function Application(canvas: HTMLCanvasElement) {
    await Runtime.Create(canvas);
    const scene = Runtime.SceneManager.CreateScene("DefaultScene");
    Runtime.SceneManager.SetActiveScene(scene);

    Runtime.AddSystem(PhysicsRapier);
    Component.Registry.set(TerrainCollider.type, TerrainCollider);
    Component.Registry.set(Terrain.type, Terrain);


    const PROJECT_ROOT = "/extra/SampleProject";

    Assets.ResourceFetchFn = (input, init) => {
        const url = typeof input === "string" && !input.startsWith("http")
            ? PROJECT_ROOT + (input.startsWith("/") ? input : "/" + input)
            : input;
        return fetch(url, init);
    };

    const data = await fetch("/extra/SampleProject/TestScene.scene").then(response => response.json());
    await Deserializer.deserializeScene(scene, data);
    Debugger.Enable();


    const controls = new OrbitControls(canvas, Components.Camera.mainCamera);

    Runtime.Play();

};

Application(document.querySelector("canvas"));