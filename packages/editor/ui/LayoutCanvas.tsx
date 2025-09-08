import { IComponents } from "../engine-api/trident/components";
import { createElement, Component } from "../gooact";
import { BaseProps } from "./Layout";

import { OrbitControls } from "@trident/plugins/OrbitControls.js";
import { Debugger } from "@trident/plugins/Debugger.js";

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
    
    
        mainCameraGameObject.transform.position.set(0, 0, 10);
        mainCameraGameObject.transform.LookAtV1(EngineAPI.createVector3(0, 0, 0));
    
        const controls = new OrbitControls(canvas, camera);
    
        const lightGameObject = EngineAPI.createGameObject(EngineAPI.currentScene);
        lightGameObject.name = "Light";
        lightGameObject.transform.position.set(-10, 10, 10);
        lightGameObject.transform.LookAtV1(EngineAPI.createVector3(0, 0, 0));
        const light = lightGameObject.AddComponent(IComponents.DirectionalLight);
        light.castShadows = true;
    
        const floorGameObject = EngineAPI.createGameObject(EngineAPI.currentScene);
        floorGameObject.name = "Floor"
        floorGameObject.transform.eulerAngles.x = -90;
        floorGameObject.transform.position.y = -2;
        floorGameObject.transform.scale.set(100, 100, 100);
        const floorMesh = floorGameObject.AddComponent(IComponents.Mesh);
        floorMesh.SetGeometry(EngineAPI.createPlaneGeometry());
        floorMesh.AddMaterial(EngineAPI.createPBRMaterial());


        const cubeGameObject = EngineAPI.createGameObject(EngineAPI.currentScene);
        cubeGameObject.name = "Cube"
        const cubeMesh = cubeGameObject.AddComponent(IComponents.Mesh);
        cubeMesh.SetGeometry(EngineAPI.createCubeGeometry());
        cubeMesh.AddMaterial(EngineAPI.createPBRMaterial());


        Debugger.Enable();





        const test = EngineAPI.createGameObject(EngineAPI.currentScene);
        test.name = "test"
        test.transform.parent = floorGameObject.transform;


        currentScene.Start();
    }

    render() {
        return (
            <canvas ref={(canvas) => this.canvasRef(canvas)}></canvas>
        );
    }
}