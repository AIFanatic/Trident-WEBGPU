import { IComponents } from "../engine-api/trident/components";
import { createElement, Component } from "../gooact";
import { BaseProps } from "./Layout";

import { OrbitControls } from "@trident/plugins/OrbitControls.js";

import { GLTFLoader } from '@trident/plugins/GLTF/GLTFLoader.js';
import { EventSystem, GameObjectEvents } from "../Events";
import { IGameObject } from "../engine-api/trident/components/IGameObject";

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

    

        currentScene.Start();
    }

    render() {
        return (
            <canvas ref={(canvas) => this.canvasRef(canvas)}></canvas>
        );
    }
}