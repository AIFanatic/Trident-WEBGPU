import { Color } from "../math/Color";
import { Matrix4 } from "../math/Matrix4";
import { Component } from "./Component";
export declare class CameraEvents {
    static Updated: (camera: Camera) => void;
}
export declare class Camera extends Component {
    backgroundColor: Color;
    projectionMatrix: Matrix4;
    viewMatrix: Matrix4;
    static mainCamera: Camera;
    fov: number;
    aspect: number;
    near: number;
    far: number;
    SetPerspective(fov: number, aspect: number, near: number, far: number): void;
    SetOrthographic(left: number, right: number, top: number, bottom: number, near: number, far: number): void;
    Start(): void;
    Update(): void;
}
