import { EventSystem, EventSystemLocal } from "../Events";
import { Color } from "../math/Color";
import { Vector3 } from "../math/Vector3";
import { Renderer } from "../renderer/Renderer";
import { SerializeField } from "../utils/SerializeField";
import { Camera } from "./Camera";
import { Component } from "./Component";
import { TransformEvents } from "./Transform";

export class LightEvents {
    public static Updated = (light: Light) => {};
    public static Destroyed = (light: Light) => {};
}

export class Light extends Component {
    public static type = "@trident/core/components/Light/Light";

    public camera: Camera = new Camera(this.gameObject);
    @SerializeField
    public color: Color = new Color(1,1,1);
    @SerializeField
    public intensity: number = 1;
    @SerializeField
    public castShadows: boolean = true;

    public Start(): void {
        EventSystemLocal.on(TransformEvents.Updated, this.transform, () => {
            EventSystem.emit(LightEvents.Updated, this);
        })
    }

    public Destroy(): void {
        EventSystem.emit(LightEvents.Destroyed, this);
    }
}

export class SpotLight extends Light {
    public static type = "@trident/core/components/Light/SpotLight";
    public direction = new Vector3(0,-1,0);

    @SerializeField
    public angle: number = 1;

    @SerializeField
    public range: number = 10;

    public Start(): void {
        super.Start();
        this.camera.SetPerspective(this.angle / Math.PI * 180 * 2, Renderer.width / Renderer.height, 0.01, 1000);
    }
}

export class PointLight extends Light {
    public static type = "@trident/core/components/Light/PointLight";
    @SerializeField(Number)
    public range: number = 10;
    
    public Start(): void {
        super.Start();
        this.camera.SetPerspective(60, Renderer.width / Renderer.height, 0.01, 1000);
    }
}

// TODO: Harder, maybe can be faked with a perspective camera and some scale hacks
export class AreaLight extends Light {
    public static type = "@trident/core/components/Light/AreaLight";
    public Start(): void {
        super.Start();
        // TODO: Ortographic camera
        this.camera.SetPerspective(60, Renderer.width / Renderer.height, 0.01, 1000);
    }
}

export class DirectionalLight extends Light {
    public static type = "@trident/core/components/Light/DirectionalLight";

    @SerializeField
    public direction = new Vector3(0,1,0);

    public Start(): void {
        super.Start();
        const size = 1;
        this.camera.SetOrthographic(-size, size, -size, size, 0.1, 100);
    }
}

Component.Registry.set(SpotLight.type, SpotLight);
Component.Registry.set(PointLight.type, PointLight);
Component.Registry.set(DirectionalLight.type, DirectionalLight);