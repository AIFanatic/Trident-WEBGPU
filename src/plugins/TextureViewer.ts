import { GameObject } from "../GameObject";
import { Scene } from "../Scene";
import { Camera } from "../components/Camera";
import { Renderer } from "../renderer/Renderer";
import { Texture } from "../renderer/Texture";

export class TextureViewer {
    constructor(texture: Texture) {
        this.init(texture);
    }

    private async init(texture: Texture) {
        const canvas = document.createElement("canvas");
        document.body.appendChild(canvas);
        const renderer = Renderer.Create(canvas, "webgpu");
        const scene = new Scene(renderer);
        
        // const mainCameraGameObject = new GameObject(scene);
        // mainCameraGameObject.transform.position.set(0,0,-15);
        // mainCameraGameObject.name = "MainCamera";
        // const camera = mainCameraGameObject.AddComponent(Camera);
        // camera.SetPerspective(72, canvas.width / canvas.height, 0.5, 50000);
    
        
        
        // const camera = mainCameraGameObject.AddComponent(Camera);
        // // const size = 10;
        // // camera.SetOrthographic(-size, size, -size, size, 0.1, 100);
        // // camera.SetPerspective(72, canvas.width / canvas.height, 0.5, 50000);
    
        // camera.near = 0.01;
        // camera.far = 100;
        // camera.SetPerspective(60, Renderer.width / Renderer.height, camera.near, camera.far);
    }
}