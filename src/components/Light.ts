import { EventSystem } from "../Events";
import { Color } from "../math/Color";
import { Vector3 } from "../math/Vector3";
import { Renderer } from "../renderer/Renderer";
import { Camera } from "./Camera";
import { Component } from "./Component";

export class Light extends Component {
    public camera: Camera;
    public color: Color = new Color(1,1,1);
    public intensity: number = 1;
    public range: number = 1000;

    public Start(): void {
        EventSystem.on("TransformUpdated", transform => {
            if (this.transform === transform) {
                EventSystem.emit("LightUpdated", this);
            }
        })
    }
}

export class SpotLight extends Light {
    public direction = new Vector3(0,-1,0);
    public angle: number = 1;

    public Start(): void {
        super.Start();
        this.camera = this.gameObject.AddComponent(Camera);
        this.camera.SetPerspective(this.angle / Math.PI * 180 * 2, Renderer.width / Renderer.height, 0.01, 1000);
    }
}

export class PointLight extends Light {
    public Start(): void {
        super.Start();
        this.camera = this.gameObject.AddComponent(Camera);
        this.camera.SetPerspective(60, Renderer.width / Renderer.height, 0.01, 1000);
    }
}

// TODO: Harder, maybe can be faked with a perspective camera and some scale hacks
export class AreaLight extends Light {
    public Start(): void {
        super.Start();
        // TODO: Ortographic camera
        this.camera = this.gameObject.AddComponent(Camera);
        this.camera.SetPerspective(60, Renderer.width / Renderer.height, 0.01, 1000);
    }
}

export class DirectionalLight extends Light {
    public direction = new Vector3(0,1,0);

    public Start(): void {
        super.Start();
        this.camera = this.gameObject.AddComponent(Camera);
        this.camera.SetOrthographic(-1, 1, -1, 1, 0.1, 100);
    }
}