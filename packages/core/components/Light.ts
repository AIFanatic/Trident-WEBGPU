import { EventSystem, EventSystemLocal } from "../Events";
import { GameObject } from "../GameObject";
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
    public static type = "@trident/core/components/Light";

    public camera: Camera;
    @SerializeField
    public color: Color = new Color(1,1,1);
    @SerializeField
    public intensity: number = 1;
    @SerializeField
    public range: number = 10;
    @SerializeField
    public castShadows: boolean = true;

    constructor(gameObject: GameObject) {
        super(gameObject);
        this.camera = new Camera(this.gameObject);
    }
    public Start(): void {
        // this.camera = this.gameObject.AddComponent(Camera);
        EventSystemLocal.on(TransformEvents.Updated, this.transform, () => {
            EventSystem.emit(LightEvents.Updated, this);
        })
    }

    public Serialize() {
        return {
            type: Light.type,
            camera: this.camera.Serialize(),
            color: this.color.Serialize(),
            intensity: this.intensity,
            range: this.range,
            castShadows: this.castShadows
        }
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
    public static type = "@trident/core/components/DirectionalLight";

    @SerializeField
    public direction = new Vector3(0,1,0);

    public Start(): void {
        super.Start();
        const size = 1;
        this.camera.SetOrthographic(-size, size, -size, size, 0.1, 100);
    }

    public Serialize() {
        return Object.assign(super.Serialize(), {
            type: DirectionalLight.type,
            direction: this.direction.Serialize(),
        });
    }

    public Deserialize(data: any): void {
        this.direction.Deserialize(data.direction);
        this.camera.Deserialize(data.camera);
        this.color.Deserialize(data.color);
        this.intensity = data.intensity;
        this.range = data.range;
        this.castShadows = data.castShadows;
    }
}

Component.Registry.set(SpotLight.type, SpotLight);
Component.Registry.set(PointLight.type, PointLight);
Component.Registry.set(DirectionalLight.type, DirectionalLight);