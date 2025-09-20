import { IComponents } from "../engine-api/trident/components";
import { createElement, Component } from "../gooact";
import { BaseProps } from "./Layout";

import { OrbitControls } from "@trident/plugins/OrbitControls.js";
import { Debugger } from "@trident/plugins/Debugger.js";
import { HDRParser } from "@trident/plugins/HDRParser.js";

import { GLTFLoader } from '@trident/plugins/GLTF/GLTFLoader.js';
import { Components, GameObject, IndexAttribute, Object3D, VertexAttribute } from "@trident/core";

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









        async function traverse(object3D: Object3D, func: (o: Object3D) => void | Promise<void>): Promise<void> {
            await func(object3D);
            for (const child of object3D.children) await traverse(child, func);
        }
    
        // const helmet = await GLTFLoader.Load("./assets/models/DamagedHelmet/DamagedHelmet.gltf");
        // const helmet = await GLTFLoader.Load("./assets/models/AnimatedTriangle/AnimatedTriangle.gltf");
        const helmet = await GLTFLoader.Load("/dist/examples/assets/models/Fox.glb");
        // const helmet = await GLTFLoader.Load("./assets/models/AnimatedCube/AnimatedCube.gltf");
    
        const nodeGameObjectMap = new Map<number, GameObject>();
        await traverse(helmet, async object3D => {
            // Create GameObject for EVERY node (bones, empties, meshes, etc.)
            const gameObject = new GameObject(currentScene);
            gameObject.name = object3D.name || "Node";
            const nodeId = object3D.metadata.get("gltfNodeId");
            gameObject.transform.metadata.set("gltfNodeId", nodeId);
            nodeGameObjectMap.set(nodeId, gameObject);
      
            // Apply transform
            object3D.localMatrix.decompose(
                gameObject.transform.position,
                gameObject.transform.rotation,
                gameObject.transform.scale
            );
      
            // Only add mesh component if this node has geometry
            if (object3D.geometry && object3D.material) {
                const positionsArray = object3D.geometry.attributes.get("position").array;
                if (!object3D.geometry.index) {
                    let indexBuffer = new Uint32Array(positionsArray.length);
                    for (let i = 0; i < indexBuffer.length; i++) {
                        indexBuffer[i] = i;
                    }
                    object3D.geometry.index = new IndexAttribute(indexBuffer);
                    object3D.geometry.ComputeNormals();
                }
                if (!object3D.geometry.attributes.get("normal")) {
                    object3D.geometry.ComputeNormals();
                }
                if (!object3D.geometry.attributes.get("uv")) {
                    object3D.geometry.attributes.set("uv", new VertexAttribute(new Float32Array(positionsArray.length / 3 * 2)));
                }
      
                const mesh = object3D.skins && object3D.skins.length > 0
                    ? gameObject.AddComponent(Components.SkinnedMesh)
                    : gameObject.AddComponent(Components.Mesh);
      
                if (mesh instanceof Components.SkinnedMesh) {
                    mesh.skin = object3D.skins[0];
                }
      
                mesh.SetGeometry(object3D.geometry);
                mesh.AddMaterial(object3D.material);
            }
      
            // Add animator to the ROOT object (not individual nodes)
            if (object3D.animations && object3D.animations.length > 0) {
                const animator = gameObject.AddComponent(Components.Animator);
                for (const animation of object3D.animations) {
                    animator.Add(animation);
                }
                setTimeout(() => {
                    animator.Play("Run");
                }, 2000);
            }
        })
    
        function setupHierarchy(object3D: Object3D) {
            const nodeId = object3D.metadata.get("gltfNodeId");
            const currentGameObject = nodeGameObjectMap.get(nodeId);
      
            for (const child of object3D.children) {
                const childNodeId = child.metadata.get("gltfNodeId");
                const childGameObject = nodeGameObjectMap.get(childNodeId);
      
                if (currentGameObject && childGameObject) {
                    childGameObject.transform.parent = currentGameObject.transform;
                }
      
                setupHierarchy(child); // Recursive
            }
        }
      
        setupHierarchy(helmet);


        // // {
        // //     const hdr = await HDRParser.Load("./resources/autumn_field_puresky_1k.hdr");
        // //     const sky = await HDRParser.ToCubemap(hdr);
    
        // //     const skyIrradiance = await HDRParser.GetIrradianceMap(sky);
        // //     const prefilterMap = await HDRParser.GetPrefilterMap(sky);
        // //     const brdfLUT = await HDRParser.GetBRDFLUT(1);
        
        // //     EngineAPI.currentScene.renderPipeline.skybox = sky;
        // //     EngineAPI.currentScene.renderPipeline.skyboxIrradiance = skyIrradiance;
        // //     EngineAPI.currentScene.renderPipeline.skyboxPrefilter = prefilterMap;
        // //     EngineAPI.currentScene.renderPipeline.skyboxBRDFLUT = brdfLUT;
        // // }


        // // Debugger.Enable();





        // // function traverse(object3D, func) {
        // //     func(object3D);
        // //     for (const child of object3D.children) traverse(child, func);
        // //   }
        // //   const helmet = await GLTFParser.Load("../../dist/examples/assets/models/DamagedHelmet/DamagedHelmet.gltf");
        // //   traverse(helmet, (object3D) => {
        // //     if (object3D.geometry && object3D.material) {
        // //       console.log(object3D);
        // //       const gameObject = EngineAPI.createGameObject(currentScene);
        // //       const mesh = gameObject.AddComponent(IComponents.Mesh);
        // //       object3D.localMatrix.decompose(gameObject.transform.position, gameObject.transform.rotation, gameObject.transform.scale);
        // //       mesh.SetGeometry(object3D.geometry);
        // //       mesh.AddMaterial(object3D.material);
        // //     }
        // //   });

        // const test = EngineAPI.createGameObject(EngineAPI.currentScene);
        // test.name = "test"
        // test.transform.parent = floorGameObject.transform;


        currentScene.Start();
    }

    render() {
        return (
            <canvas ref={(canvas) => this.canvasRef(canvas)}></canvas>
        );
    }
}