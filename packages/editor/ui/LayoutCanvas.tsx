import { IComponents } from "../engine-api/trident/components";
import { createElement, Component } from "../gooact";
import { BaseProps } from "./Layout";

import { OrbitControls } from "@trident/plugins/OrbitControls.js";
import { Debugger } from "@trident/plugins/Debugger.js";
import { HDRParser } from "@trident/plugins/HDRParser.js";
import { ParticleSystem } from "@trident/plugins/ParticleSystem.js";

import { GLTFLoader } from '@trident/plugins/GLTF/GLTFLoader.js';
import { GPU } from "@trident/core";

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
    
        // const floorGameObject = EngineAPI.createGameObject(EngineAPI.currentScene);
        // floorGameObject.name = "Floor"
        // floorGameObject.transform.eulerAngles.x = -90;
        // floorGameObject.transform.position.y = -2;
        // floorGameObject.transform.scale.set(100, 100, 100);
        // const floorMesh = floorGameObject.AddComponent(IComponents.Mesh);
        // floorMesh.SetGeometry(EngineAPI.createPlaneGeometry());
        // floorMesh.AddMaterial(EngineAPI.createPBRMaterial());


        // const cubeGameObject = EngineAPI.createGameObject(EngineAPI.currentScene);
        // cubeGameObject.name = "Cube"
        // const cubeMesh = cubeGameObject.AddComponent(IComponents.Mesh);
        // cubeMesh.SetGeometry(EngineAPI.createCubeGeometry());
        // cubeMesh.AddMaterial(EngineAPI.createPBRMaterial());








    
        const gameObjects = await GLTFLoader.loadAsGameObjects(currentScene, "/examples/assets/models/Fox.glb");
        gameObjects[0].transform.scale.mul(0.1);


    
        const particleSystemGameObject = EngineAPI.createGameObject(currentScene);
        particleSystemGameObject.name = "ParticleSystem";
        const particleSystem = particleSystemGameObject.AddComponent(ParticleSystem);
        particleSystem.texture = await GPU.Texture.Load("/examples/assets/textures/TXT_Fire_01.png");

        particleSystem.startLifetime = 2.5;
        particleSystem.startSpeed.set(1.5, 1.5, 1.5);
        particleSystem.startSize = 2.5;
        // particleSystem.shapeType = "cone"
        particleSystem.coneAngle = 5 * Math.PI / 180;
        particleSystem.radius = 0.1;
        
        particleSystem.rateOverTime = 10;
        // particleSystem.frameOvertime = "random";
    
        particleSystem.textureTiles.set(2,2);
    
        particleSystem.colorOverLifetime0.set(1, 0.9013662, 0, 1);
        particleSystem.colorOverLifetime1.set(1, 0.558496, 0.3176471, 0.1);
    

        currentScene.Start();
    }

    render() {
        return (
            <canvas ref={(canvas) => this.canvasRef(canvas)}></canvas>
        );
    }
}