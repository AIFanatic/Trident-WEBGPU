import { Components, Mathf, GameObject, PlayerRuntime, Geometry, PBRMaterial, AudioClip } from "@trident/core";

import { OrbitControls } from "@trident/plugins/OrbitControls";

async function Application(canvas: HTMLCanvasElement) {
    await PlayerRuntime.Create(canvas);
    const scene = PlayerRuntime.SceneManager.CreateScene("DefaultScene");
    PlayerRuntime.SceneManager.SetActiveScene(scene);

    const mainCameraGameObject = new GameObject();
    mainCameraGameObject.transform.position.set(0, 0, -15);
    mainCameraGameObject.name = "MainCamera";
    const camera = mainCameraGameObject.AddComponent(Components.Camera);
    camera.SetPerspective(60, canvas.width / canvas.height, 0.05, 10000);

    mainCameraGameObject.transform.position.set(0, 0, 2);
    mainCameraGameObject.transform.LookAt(new Mathf.Vector3(0, 0, 0));
    mainCameraGameObject.AddComponent(OrbitControls);

    const lightGameObject = new GameObject();
    lightGameObject.transform.position.set(1.2, 1.4, 1.6);
    lightGameObject.transform.LookAt(new Mathf.Vector3(0, 0, 0));
    const light = lightGameObject.AddComponent(Components.DirectionalLight);

    const cube = new GameObject();
    const cubeMesh = cube.AddComponent(Components.Mesh);
    cubeMesh.geometry = Geometry.Cube();
    cubeMesh.material = new PBRMaterial();


    mainCameraGameObject.AddComponent(Components.AudioListener);

    const audioSource = cube.AddComponent(Components.AudioSource);
    audioSource.clip = await AudioClip.Deserialize("./assets/sounds/Click1.wav");

    const button = document.createElement("button");
    button.textContent = "Play";
    button.style = "position: absolute; top: 50%; left: 50%";
    button.addEventListener("click", () => {
        audioSource.Play();
    })
    document.body.appendChild(button);
};

Application(document.querySelector("canvas"));