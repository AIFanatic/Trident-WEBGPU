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
}

export class Light extends Component {
    public static type = "@trident/core/components/Light";

    @SerializeField
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
}

export class SpotLight extends Light {
    public static type = "@trident/core/components/SpotLight";
    public direction = new Vector3(0,-1,0);

    private _angle: number = 1;
    @SerializeField
    public get angle(): number { return this._angle };
    public set angle(angle: number) {
        this._angle = angle;
        this.UpdateLight();
    };

    private _range: number = 10;
    @SerializeField
    public get range(): number { return this._range };
    public set range(range: number) {
        this._range = range;
        this.UpdateLight();
    };

    protected UpdateLight() {
        const radius = Math.tan(this.angle) * this.range; // if angle is full cone angle
         this.transform.scale.set(radius, this.range, radius);
    }

    public Start(): void {
        super.Start();
        this.camera.SetPerspective(this.angle / Math.PI * 180 * 2, Renderer.width / Renderer.height, 0.01, 1000);
        this.UpdateLight();
    }
}

export class PointLight extends Light {
    public static type = "@trident/core/components/PointLight";
    private _range: number = 10;
    @SerializeField
    public get range(): number { return this._range };
    public set range(range: number) {
        this._range = range;
        this.UpdateLight();
    };
    
    protected UpdateLight(): void {
        this.transform.scale.set(this.range, this.range, this.range);
    }

    public Start(): void {
        super.Start();
        this.camera.SetPerspective(60, Renderer.width / Renderer.height, 0.01, 1000);
        this.UpdateLight();
    }
}

// TODO: Harder, maybe can be faked with a perspective camera and some scale hacks
export class AreaLight extends Light {
    public static type = "@trident/core/components/AreaLight";
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
}

Component.Registry.set(SpotLight.type, SpotLight);
Component.Registry.set(PointLight.type, PointLight);
Component.Registry.set(DirectionalLight.type, DirectionalLight);