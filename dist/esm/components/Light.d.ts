import { Color } from "../math/Color";
import { Vector3 } from "../math/Vector3";
import { Camera } from "./Camera";
import { Component } from "./Component";
export declare class LightEvents {
    static Updated: (light: Light) => void;
}
export declare class Light extends Component {
    camera: Camera;
    color: Color;
    intensity: number;
    range: number;
    castShadows: boolean;
    Start(): void;
}
export declare class SpotLight extends Light {
    direction: Vector3;
    angle: number;
    Start(): void;
}
export declare class PointLight extends Light {
    Start(): void;
}
export declare class AreaLight extends Light {
    Start(): void;
}
export declare class DirectionalLight extends Light {
    direction: Vector3;
    Start(): void;
}
