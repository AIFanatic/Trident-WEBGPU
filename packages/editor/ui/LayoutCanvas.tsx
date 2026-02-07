import { IComponents } from "../engine-api/trident/components";
import { createElement, Component } from "../gooact";
import { BaseProps } from "./Layout";

import { EventSystem, GameObjectEvents, SceneEvents } from "../Events";

import { Components, Input, MouseCodes } from "@trident/core";
import { OrbitControls } from "@trident/plugins/OrbitControls.js";
import { Environment } from "@trident/plugins/Environment/Environment";
import { Sky } from "@trident/plugins/Environment/Sky";
import { Raycaster } from "../helpers/Raycaster";

import { Debugger } from "@trident/plugins/Debugger";
import { UITextureViewer } from "@trident/plugins/ui/UIStats";

export class LayoutCanvas extends Component<BaseProps> {

    private async canvasRef(canvas: HTMLCanvasElement) {
        canvas.style.width = "100%";
        canvas.style.height = "100%";
        canvas.width = 1280;
        canvas.height = 720;

        const EngineAPI = this.props.engineAPI;
        EngineAPI.createRenderer(canvas);


        const currentScene = EngineAPI.createScene();
        const mainCameraGameObject = EngineAPI.createGameObject(currentScene);
        mainCameraGameObject.name = "MainCamera";
        const camera = mainCameraGameObject.AddComponent(IComponents.Camera);
        camera.SetPerspective(72, canvas.width / canvas.height, 0.5, 500);

        const observer = new ResizeObserver(entries => {
            camera.SetPerspective(72, canvas.width / canvas.height, 0.05, 500);
        });
        observer.observe(canvas);

        mainCameraGameObject.transform.position.set(0, 0, 10);
        mainCameraGameObject.transform.LookAtV1(EngineAPI.createVector3(0, 0, 0));

        const controls = new OrbitControls(canvas, camera);

        const lightGameObject = EngineAPI.createGameObject(EngineAPI.currentScene);
        lightGameObject.name = "Light";
        lightGameObject.transform.position.set(-10, 10, 10);
        lightGameObject.transform.LookAtV1(EngineAPI.createVector3(0, 0, 0));
        const light = lightGameObject.AddComponent(IComponents.DirectionalLight);
        light.castShadows = true;

        // setInterval(() => {
        //     light.castShadows = !light.castShadows;
        // }, 1000);

        const floorGameObject = EngineAPI.createGameObject(EngineAPI.currentScene);
        floorGameObject.name = "Floor"
        floorGameObject.transform.eulerAngles.x = -90;
        floorGameObject.transform.position.y = -2;
        floorGameObject.transform.scale.set(100, 100, 100);
        const floorMesh = floorGameObject.AddComponent(IComponents.Mesh);
        floorMesh.geometry = EngineAPI.createPlaneGeometry();
        floorMesh.material = EngineAPI.createPBRMaterial();


        const cubeGameObject = EngineAPI.createGameObject(EngineAPI.currentScene);
        cubeGameObject.name = "Cube"
        const cubeMesh = cubeGameObject.AddComponent(IComponents.Mesh);
        cubeMesh.geometry = EngineAPI.createCubeGeometry();
        cubeMesh.material = EngineAPI.createPBRMaterial();





        const sky = new Sky();
        sky.SUN_ELEVATION_DEGREES = 60;
        await sky.init();
        const skyTexture = sky.skyTextureCubemap;
        const environment = new Environment(EngineAPI.currentScene, skyTexture);
        await environment.init();




        const raycaster = new Raycaster();

        let mouseDownPosition = {x: 0, y: 0};
        let mouseUpPosition = {x: 0, y: 0};

        canvas.addEventListener("mousedown", event => {
            mouseDownPosition = {x: event.clientX, y: event.clientY};
        });

        canvas.addEventListener("mouseup", async event => {
            mouseUpPosition = {x: event.clientX, y: event.clientY};
            const mouseDrif = {x: mouseDownPosition.x - mouseUpPosition.x, y: mouseDownPosition.y - mouseUpPosition.y};
            if (mouseDrif.x == 0 && mouseDrif.y == 0) {
                const pickedGameObject = await raycaster.execute();
                if (pickedGameObject) {
                    EventSystem.emit(GameObjectEvents.Selected, pickedGameObject);
                }
            }
        });

        // function traverse(gameObjects: IGameObject[], fn: (gameObject: IGameObject) => void) {
        //     for (const gameObject of gameObjects) {
        //         fn(gameObject);
        //         for (const child of gameObject.transform.children) {
        //             traverse([child.gameObject], fn);
        //         }
        //     }
        // }

        // const gameObjects = await GLTFLoader.loadAsGameObjects(currentScene, "/extra/dist_bak/test-assets/GLTF/scenes/JunkShop.glb");
        // // const gameObjects = await GLTFLoader.loadAsGameObjects(scene, "/extra/dist_bak/test-assets/GLTF/scenes/Sponza/Sponza.gltf");
        // console.log(gameObjects)

        // traverse(gameObjects, gameObject => {
        //     const mesh = gameObject.GetComponent(IComponents.Mesh);
        //     if (mesh) {
        //         mesh.enableShadows = false;
        //     }
        // })

        // const gameObjects = await GLTFLoader.loadAsGameObjects(currentScene, "/dist/examples/assets/models/glb/CommonTree_1.glb");
        // gameObjects[0].transform.scale.mul(0.1);

        // EventSystem.emit(GameObjectEvents.Created, gameObjects[0]);


        EventSystem.on(SceneEvents.Loaded, scene => {
            const mainCamera = Components.Camera.mainCamera;
            const controls = new OrbitControls(canvas, mainCamera);
        })

        currentScene.Start();
    }

    render() {
        return (
            <canvas ref={(canvas) => this.canvasRef(canvas)}></canvas>
        );
    }
}