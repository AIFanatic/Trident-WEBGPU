import {
    Components,
    GPU,
    Mathf,
    GameObject,
    Geometry,
    PBRMaterial,
    Runtime,
    Renderer,
} from "@trident/core";

// Runtime.Create is protected; expose it without starting PlayerRuntime's
// internal loop, since we drive our own multi-view loop below.
class MultiCanvasRuntime extends Runtime {
    public static async Create(canvas: HTMLCanvasElement): Promise<Runtime> {
        return await Runtime.Create(canvas);
    }
}

async function Application(canvasA: HTMLCanvasElement) {
    // Lay the main canvas and a second canvas out side by side.
    // Do this before Runtime.Create so "fit" resolution measures the half-width parent.
    const container = document.createElement("div");
    container.style.cssText = "display: flex; width: 100vw; height: 100vh;";

    const slotA = document.createElement("div");
    const slotB = document.createElement("div");
    slotA.style.cssText = "flex: 1; min-width: 0;";
    slotB.style.cssText = "flex: 1; min-width: 0;";
    container.append(slotA, slotB);
    document.body.appendChild(container);

    slotA.appendChild(canvasA);

    const canvasB = document.createElement("canvas");
    canvasB.style.cssText = "width: 100%; height: 100%; user-select: none;";
    slotB.appendChild(canvasB);

    await MultiCanvasRuntime.Create(canvasA);

    // Configure the second canvas against the same GPUDevice.
    // The pipeline presents to whatever Renderer.context points at, so this is
    // all that's needed to make canvasB a valid render target.
    canvasB.width = Math.max(1, Math.floor(slotB.clientWidth));
    canvasB.height = Math.max(1, Math.floor(slotB.clientHeight));
    const contextB = canvasB.getContext("webgpu");
    if (!contextB) throw Error("Could not get WEBGPU context");
    contextB.configure({ device: Renderer.device, format: Renderer.SwapChainFormat, alphaMode: "opaque" });

    // Scene A: a cube
    const sceneA = Runtime.SceneManager.CreateScene("CubeScene");
    Runtime.SceneManager.SetActiveScene(sceneA);

    const cameraAGameObject = new GameObject(sceneA);
    cameraAGameObject.name = "CameraA";
    const cameraA = cameraAGameObject.AddComponent(Components.Camera);
    cameraA.SetPerspective(60, canvasA.width / canvasA.height, 0.1, 100);
    cameraAGameObject.transform.position.set(0, 1, 5);
    cameraAGameObject.transform.LookAt(new Mathf.Vector3(0, 0, 0));

    const lightAGameObject = new GameObject(sceneA);
    lightAGameObject.transform.position.set(5, 5, 5);
    lightAGameObject.transform.LookAt(new Mathf.Vector3(0, 0, 0));
    const lightA = lightAGameObject.AddComponent(Components.DirectionalLight);
    lightA.castShadows = false;

    const cubeGameObject = new GameObject(sceneA);
    cubeGameObject.name = "Cube";
    const cubeMesh = cubeGameObject.AddComponent(Components.Mesh);
    cubeMesh.geometry = Geometry.Cube();
    cubeMesh.material = new PBRMaterial({ albedoColor: new Mathf.Color(1, 0.3, 0.3, 1) });

    // Scene B: a sphere
    const sceneB = Runtime.SceneManager.CreateScene("SphereScene");

    const cameraBGameObject = new GameObject(sceneB);
    cameraBGameObject.name = "CameraB";
    const cameraB = cameraBGameObject.AddComponent(Components.Camera);
    cameraB.SetPerspective(60, canvasB.width / canvasB.height, 0.1, 100);
    cameraBGameObject.transform.position.set(0, 1, 5);
    cameraBGameObject.transform.LookAt(new Mathf.Vector3(0, 0, 0));

    const lightBGameObject = new GameObject(sceneB);
    lightBGameObject.transform.position.set(-5, 5, 5);
    lightBGameObject.transform.LookAt(new Mathf.Vector3(0, 0, 0));
    const lightB = lightBGameObject.AddComponent(Components.DirectionalLight);
    lightB.castShadows = false;

    const sphereGameObject = new GameObject(sceneB);
    sphereGameObject.name = "Sphere";
    const sphereMesh = sphereGameObject.AddComponent(Components.Mesh);
    sphereMesh.geometry = Geometry.Sphere();
    sphereMesh.material = new PBRMaterial({ albedoColor: new Mathf.Color(0.3, 0.5, 1, 1) });

    // First-constructed camera became mainCamera; make it explicit anyway.
    Components.Camera.mainCamera = cameraA;

    const loop = () => {
        // SceneManager only updates the active scene (sceneA); tick sceneB manually.
        Runtime.Tick();
        sceneB.Update();

        cubeGameObject.transform.eulerAngles.y += 0.5;
        sphereGameObject.transform.eulerAngles.y -= 0.5;

        // View A: normal render with the default statics (canvasA + cameraA).
        Runtime.Render();

        // View B: repoint the presentation context and camera, run the whole
        // pipeline again, then restore. The scene comes along for free because
        // SceneExtractPass reads it from Camera.mainCamera.gameObject.scene.
        const prevContext = Renderer.context;
        const prevCamera = Components.Camera.mainCamera;

        Renderer.context = contextB;
        Components.Camera.mainCamera = cameraB;
        Runtime.Renderer.RenderPipeline.Render();

        Renderer.context = prevContext;
        Components.Camera.mainCamera = prevCamera;

        requestAnimationFrame(loop);
    };
    loop();
}

Application(document.querySelector("canvas") as HTMLCanvasElement);