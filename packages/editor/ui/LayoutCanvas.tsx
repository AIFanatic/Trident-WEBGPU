import { IComponents } from "../engine-api/trident/components";
import { createElement, Component } from "../gooact";
import { BaseProps } from "./Layout";

import { EventSystem, GameObjectEvents, LayoutHierarchyEvents, SceneEvents } from "../Events";

import { Components } from "@trident/core";
import { OrbitControls } from "@trident/plugins/OrbitControls.js";
import { Raycaster } from "../helpers/Raycaster";

import { Environment } from "@trident/plugins/Environment/Environment";
import { Sky } from "@trident/plugins/Environment/Sky";
import { GLTFLoader } from "@trident/plugins/GLTF/GLTFLoader";
import { PostProcessingPass } from "@trident/plugins/PostProcessing/PostProcessingPass";
import { PostProcessingSMAA } from "@trident/plugins/PostProcessing/effects/SMAA";

import { GPU } from "@trident/core";

export class LayoutCanvas extends Component<BaseProps> {

    private async canvasRef(canvas: HTMLCanvasElement) {
        
        const resize = () => {
            canvas.style.width = "100%";
            canvas.style.height = "100%";
            canvas.width = canvas.parentElement.clientWidth;
            canvas.height = canvas.parentElement.clientHeight;
            camera.SetPerspective(72, canvas.width / canvas.height, 0.05, 10000);
        };
        new ResizeObserver(resize).observe(canvas);

        const EngineAPI = this.props.engineAPI;
        EngineAPI.createRenderer(canvas);


        const currentScene = EngineAPI.createScene();
        const mainCameraGameObject = EngineAPI.createGameObject(currentScene);
        mainCameraGameObject.name = "MainCamera";
        const camera = mainCameraGameObject.AddComponent(IComponents.Camera);
        camera.SetPerspective(72, canvas.width / canvas.height, 0.05, 10000);
        EventSystem.on(GPU.RendererEvents.Resized, () => {
            console.log(canvas.getBoundingClientRect(), canvas.width, canvas.height)
            camera.SetPerspective(72, canvas.width / canvas.height, 0.05, 10000);
        });

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

        let mouseDownPosition = { x: 0, y: 0 };
        let mouseUpPosition = { x: 0, y: 0 };
        let pickedGameObject = undefined

        canvas.addEventListener("mousedown", event => {
            mouseDownPosition = { x: event.clientX, y: event.clientY };
        });

        canvas.addEventListener("mouseup", async event => {
            mouseUpPosition = { x: event.clientX, y: event.clientY };
            const mouseDrif = { x: mouseDownPosition.x - mouseUpPosition.x, y: mouseDownPosition.y - mouseUpPosition.y };
            if (mouseDrif.x == 0 && mouseDrif.y == 0) {
                pickedGameObject = await raycaster.execute();
                if (pickedGameObject) {
                    EventSystem.emit(GameObjectEvents.Selected, pickedGameObject);
                }
            }
        });

        canvas.addEventListener("keydown", event => {
            if (event.key === "f") {
                if (pickedGameObject) {
                    controls.center.copy(pickedGameObject.transform.position);
                    const mainCamera = Components.Camera.mainCamera;
                    controls.orbit(0,0); // force update
                }
            }
        })

        EventSystem.on(LayoutHierarchyEvents.Selected, _pickedGameObject => {
            pickedGameObject = _pickedGameObject
        });

        EventSystem.on(SceneEvents.Loaded, scene => {
            const mainCamera = Components.Camera.mainCamera;
            const controls = new OrbitControls(canvas, mainCamera);
        })

        {
            canvas.addEventListener("dragover", (e) => {
                e.preventDefault(); // allow drop
            });

            canvas.addEventListener("drop", async (e) => {
                e.preventDefault();

                const file = e.dataTransfer?.files?.[0];
                if (!file) return;

                const url = URL.createObjectURL(file);
                const prefab = await GLTFLoader.LoadFromURL(url, "glb");
                const obj = currentScene.Instantiate(prefab);
            });
        }


        const postProcessing = new PostProcessingPass();
        const smaa = new PostProcessingSMAA();
        postProcessing.effects.push(smaa);
        currentScene.renderPipeline.AddPass(postProcessing, GPU.RenderPassOrder.BeforeScreenOutput);

        currentScene.Start();

        new ResizeObserver(resize).observe(canvas);
        


        console.warn(`
            TODO: Figure out better component registration, needs to be automatic or something.
                Importing/Creating scripts is not that easy..need above otherwise need to register everything.
                Also need to import @trident/core properly (this is a typescript pattern).
                Also need to make SerializeField work somehow
            `)
        class Test extends Components.Component {
            public static type = "@trident/core/components/Test";

            public static types = (() => {
                console.log("CALLED without new Test");
            })();
        }

        // cubeGameObject.AddComponent(Test);
        console.log(Components.Component.Registry.get("@trident/core/components/Test"))

    }

    render() {
        return (
            <canvas ref={(canvas) => this.canvasRef(canvas)}></canvas>
        );
    }
}