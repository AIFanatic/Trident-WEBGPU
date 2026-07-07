import { GameObject, Geometry, Components, Mathf, PBRMaterial, GPU, PlayerRuntime } from "@trident/core";
import { OrbitControls } from "@trident/plugins/OrbitControls";
import { Debugger } from "@trident/plugins/Debugger";

async function Application(canvas: HTMLCanvasElement) {
    await PlayerRuntime.Create(canvas);
    const scene = PlayerRuntime.SceneManager.CreateScene("DefaultScene");
    PlayerRuntime.SceneManager.SetActiveScene(scene);

    const mainCameraGameObject = new GameObject();
    mainCameraGameObject.transform.position.set(0, 0, 3);
    mainCameraGameObject.name = "MainCamera";
    const camera = mainCameraGameObject.AddComponent(Components.Camera);
    camera.SetPerspective(70, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.transform.position.set( 60, 60, 0 );
    
    
    mainCameraGameObject.AddComponent(OrbitControls);
    camera.transform.LookAt(new Mathf.Vector3(-100, 10, 0))

    const lightGameObject = new GameObject();
    lightGameObject.transform.position.set(-1, -1, -1).normalize().mul(-200);
    lightGameObject.transform.LookAt(new Mathf.Vector3(0, 0, 0));
    const light = lightGameObject.AddComponent(Components.DirectionalLight);

    const floor = new GameObject();
    floor.transform.scale.set(10000, 10000, 10000);
    floor.transform.eulerAngles.x = -90;
    const meshbottom = floor.AddComponent(Components.Mesh);
    meshbottom.geometry = Geometry.Plane();
    meshbottom.material = new PBRMaterial();

    const cube = new GameObject();
    cube.transform.position.y = 0.5;
    const cubeMesh = cube.AddComponent(Components.Mesh);
    cubeMesh.geometry = Geometry.Cube();

    const texture = await GPU.Texture.Load("./assets/textures/32x32.png")
    cubeMesh.material = new PBRMaterial({ albedoMap: texture, roughness: 0.7, metalness: 0.1} );

    const material1 = new PBRMaterial({albedoColor: Mathf.Color.fromHex(0x08d9d6)});
    const material2 = new PBRMaterial({albedoColor: Mathf.Color.fromHex(0xff2e63)});

    const geometry = Geometry.Cube();

    for ( let i = 0; i < 40; i ++ ) {
        const gameObject1 = new GameObject();
        const cube1 = gameObject1.AddComponent(Components.Mesh);
        cube1.geometry = geometry;
        cube1.material = i % 2 === 0 ? material1 : material2;
        cube1.transform.position.set( - i * 25, 20, 30 );
        cube1.transform.scale.y = Math.random() * 2 + 6;
        cube1.transform.scale.mul(10);

        const gameObject2 = new GameObject();
        const cube2 = gameObject2.AddComponent(Components.Mesh);
        cube2.geometry = geometry;
        cube2.material = i % 2 === 0 ? material2 : material1;

        cube2.transform.position.set( - i * 25, 20, - 30 );
        cube2.transform.scale.y = Math.random() * 2 + 6;
        cube2.transform.scale.mul(10);
    }

    setTimeout(() => {
        console.log("CHANGED");
        // material1.Set("albedoColor", new Mathf.Color(0.5, 0.5, 0.5));
        // material2.params.albedoColor = new Mathf.Color(0.5, 0.5, 0.5);

        material2.params.albedoColor.r = 0.5;
    }, 5000);

    Debugger.Enable();

};

Application(document.querySelector("canvas") as HTMLCanvasElement);