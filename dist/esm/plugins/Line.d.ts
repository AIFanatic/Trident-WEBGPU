import { Scene } from "../Scene";
import { Vector3 } from "../math/Vector3";
export declare class Line {
    private geometry;
    constructor(scene: Scene, from: Vector3, to: Vector3, color?: Vector3);
    private Create;
    SetFrom(from: Vector3): void;
    SetTo(to: Vector3): void;
    SetColor(color: Vector3): void;
}
