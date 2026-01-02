
import {
    Components,
    Scene,
    GPU,
    Mathf,
    GameObject,
    Geometry,
    PBRMaterial,
    Renderer,
} from "@trident/core";

import { OrbitControls } from "@trident/plugins/OrbitControls";
import { Debugger } from "@trident/plugins/Debugger";

import { VirtualTexturingPass } from "@trident/plugins/VirtualTexturing/VirtualTexturingPass";
import { UITextureViewer } from "@trident/plugins/ui/UIStats";
import { TilesGenerator } from "@trident/plugins/VirtualTexturing/TilesGenerator";

async function Application(canvas: HTMLCanvasElement) {
    document.body.style.width = "1024px";
    document.body.style.height = "1024px";

    const renderer = GPU.Renderer.Create(canvas, "webgpu");
    const scene = new Scene(renderer);

    const mainCameraGameObject = new GameObject(scene);
    mainCameraGameObject.name = "MainCamera";
    const camera = mainCameraGameObject.AddComponent(Components.Camera);
    camera.SetPerspective(60, canvas.width / canvas.height, 0.01, 100);


    mainCameraGameObject.transform.position.set(0, 0, 4);
    mainCameraGameObject.transform.LookAtV1(new Mathf.Vector3(0, 0, 0));

    const controls = new OrbitControls(canvas, camera);

    const lightGameObject = new GameObject(scene);
    lightGameObject.transform.position.set(-10, 10, 10);
    lightGameObject.transform.LookAtV1(new Mathf.Vector3(0, 0, 0));
    const light = lightGameObject.AddComponent(Components.DirectionalLight);
    light.castShadows = true;


    const tilesMap: Map<string, ImageData> = new Map();
    
    const virtualTexturingPass = new VirtualTexturingPass();

    virtualTexturingPass.page_manager.ImageRequest = (request) => {
        const key = `${request.lod}|${request.x}|${request.y}`;
        console.log(key)
        return tilesMap.get(key);
    }

    async function Load(materialIndex: number, url: string) {
        const response = await fetch(url);
        const imageBitmap = await createImageBitmap(await response.blob());

        const tiles = TilesGenerator.generate(TilesGenerator.imageBitmapToImageData(imageBitmap), 512, 512, 2);
        for (const tile of tiles) tilesMap.set(`${tile.lod}|${tile.tile_x}|${tile.tile_y}`, tile.data);
    }

    await Load(0, "/extra/test-assets/8k/UV-CheckerMap_Maurus_01_8K.png");
    // await Load(1, "/extra/test-assets/brick.png");
    // await Load(2, "/extra/test-assets/stone.png");

    console.log(tilesMap)

    scene.renderPipeline.AddPass(virtualTexturingPass, GPU.RenderPassOrder.BeforeScreenOutput);


    const t = new UITextureViewer(Debugger.ui, "Atlas", virtualTexturingPass.page_manager.atlas_);
    const t1 = new UITextureViewer(Debugger.ui, "Feedback", virtualTexturingPass.vtFeedbackPass.renderTarget);
    const t2 = new UITextureViewer(Debugger.ui, "PageTable", virtualTexturingPass.page_manager.PageTables());
    Debugger.Enable();

    setInterval(() => {
        t.Update();
        t1.Update();
        t2.Update();
    }, 1000);

    let vtRenderables: Components.Renderable[] = [];
    {
        const floorGameObject = new GameObject(scene);
        // floorGameObject.transform.eulerAngles.x = -90;
        // floorGameObject.transform.position.y = -2;
        // floorGameObject.transform.scale.set(100, 100, 100);
        const floorMesh = floorGameObject.AddComponent(Components.Mesh);
        floorMesh.geometry = Geometry.Plane();
        floorMesh.material = new PBRMaterial();

        vtRenderables.push(floorMesh);
    }

    {
        const floorGameObject = new GameObject(scene);
        const floorMesh = floorGameObject.AddComponent(Components.Mesh);
        floorMesh.transform.position.x = -2;
        floorMesh.geometry = Geometry.Cube();
        floorMesh.material = new PBRMaterial(); // new PBRMaterial({albedoMap: await GPU.Texture.Load("/extra/test-assets/brick.png")});

        vtRenderables.push(floorMesh);
    }

    {
        const floorGameObject = new GameObject(scene);
        const floorMesh = floorGameObject.AddComponent(Components.Mesh);
        floorMesh.transform.position.x = 2;
        floorMesh.geometry = Geometry.Sphere();
        floorMesh.material = new PBRMaterial(); // new PBRMaterial({albedoMap: await GPU.Texture.Load("/extra/test-assets/stone.png")});

        vtRenderables.push(floorMesh);
    }


    scene.Start();
};

Application(document.querySelector("canvas"));