import { EventSystem, EventSystemLocal } from "../Events";
import { Color } from "../math/Color";
import { Vector3 } from "../math/Vector3";
import { Renderer } from "../renderer/Renderer";
import { DepthTexture, RenderTexture } from "../renderer/Texture";
import { Camera } from "./Camera";
import { Component } from "./Component";
import { TransformEvents } from "./Transform";

export class LightEvents {
    public static Updated = (light: Light) => {};
}

export class Light extends Component {
    public camera: Camera;
    public color: Color = new Color(1,1,1);
    public intensity: number = 1;
    public range: number = 1000;

    public Start(): void {
        EventSystemLocal.on(TransformEvents.Updated, this.transform, () => {
            EventSystem.emit(LightEvents.Updated, this);
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
        const size = 1;
        this.camera.SetOrthographic(-size, size, -size, size, 0.1, 100);
        // this.camera.SetPerspective(30 / Math.PI * 180 * 2, Renderer.width / Renderer.height, 0.01, 1000);


        // this.camera.near = 0.01;
        // this.camera.far = 100;
        // this.camera.SetPerspective(60, Renderer.width / Renderer.height, this.camera.near, this.camera.far);
        // this.camera.projectionMatrix.perspectiveLH(60 * (Math.PI / 180), Renderer.width / Renderer.height, this.camera.near, this.camera.far);
    }
}