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


        const t = await GPU.Texture.Load("./assets/textures/HDR/drakensberg_solitary_mountain_puresky_1k.png")
        const c = GPU.CubeTexture.Create(1024, 1024, 6);
    
        GPU.Renderer.BeginRenderFrame();
        // +X face (Right)
        GPU.RendererContext.CopyTextureToTextureV3( { texture: t, origin: [2048, 1024, 0] }, { texture: c, origin: [0, 0, 0] }, [1024, 1024, 1]);
        // -X face (Left)
        GPU.RendererContext.CopyTextureToTextureV3( { texture: t, origin: [0, 1024, 0] }, { texture: c, origin: [0, 0, 1] }, [1024, 1024, 1]);
        // +Y face (Top)
        GPU.RendererContext.CopyTextureToTextureV3( { texture: t, origin: [1024, 0, 0] }, { texture: c, origin: [0, 0, 2] }, [1024, 1024, 1]);
        // -Y face (Bottom)
        GPU.RendererContext.CopyTextureToTextureV3( { texture: t, origin: [1024, 2048, 0] }, { texture: c, origin: [0, 0, 3] }, [1024, 1024, 1]);
        // +Z face (Front)
        GPU.RendererContext.CopyTextureToTextureV3( { texture: t, origin: [1024, 1024, 0] }, { texture: c, origin: [0, 0, 4] }, [1024, 1024, 1]);
        // -Z face (Back)
        GPU.RendererContext.CopyTextureToTextureV3( { texture: t, origin: [3072, 1024, 0] }, { texture: c, origin: [0, 0, 5] }, [1024, 1024, 1]);
        GPU.Renderer.EndRenderFrame();

        currentScene.renderPipeline.skybox = c;

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