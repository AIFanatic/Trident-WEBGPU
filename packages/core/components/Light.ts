import { EventSystem, EventSystemLocal } from "../Events";
import { Color } from "../math/Color";
import { Matrix4 } from "../math/Matrix4";
import { Vector3 } from "../math/Vector3";
import { Vector4 } from "../math/Vector4";
import { Renderer } from "../renderer/Renderer";
import { DepthTexture, RenderTexture } from "../renderer/Texture";
import { SerializeField } from "../utils/SerializeField";
import { Camera } from "./Camera";
import { Component } from "./Component";
import { TransformEvents } from "./Transform";

export class LightEvents {
    public static Updated = (light: Light) => {};
}

export class Light extends Component {
    public camera: Camera;
    @SerializeField
    public color: Color = new Color(1,1,1);
    @SerializeField
    public intensity: number = 1;
    @SerializeField
    public range: number = 10;
    @SerializeField
    public castShadows: boolean = true;

    public Start(): void {
        this.camera = new Camera(this.gameObject);
        // this.camera = this.gameObject.AddComponent(Camera);
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
        this.camera.SetPerspective(this.angle / Math.PI * 180 * 2, Renderer.width / Renderer.height, 0.01, 1000);
    }

    // public Update(): void {
    //     this.camera.SetPerspective(this.angle / Math.PI * 180 * 2, Renderer.width / Renderer.height, 0.01, 1000);
    // }
}

export class PointLight extends Light {
    public Start(): void {
        super.Start();
        this.camera.SetPerspective(60, Renderer.width / Renderer.height, 0.01, 1000);
    }
}

// TODO: Harder, maybe can be faked with a perspective camera and some scale hacks
export class AreaLight extends Light {
    public Start(): void {
        super.Start();
        // TODO: Ortographic camera
        this.camera.SetPerspective(60, Renderer.width / Renderer.height, 0.01, 1000);
    }
}

export class DirectionalLight extends Light {
    @SerializeField
    public direction = new Vector3(0,1,0);

    public Start(): void {
        super.Start();
        const size = 1;
        this.camera.SetOrthographic(-size, size, -size, size, 0.1, 100);
    }
}