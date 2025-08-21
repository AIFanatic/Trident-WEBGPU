import { IComponent } from "./IComponent";
import { IColor } from "../math/IColor";
import { IMatrix4 } from "../math/IMatrix4";

export interface ICamera extends IComponent {
    backgroundColor: IColor;
    projectionMatrix: IMatrix4;
    viewMatrix: IMatrix4;
    mainCamera: ICamera;

    fov: number;
    aspect: number;
    near: number;
    far: number;

    SetPerspective(fov: number, aspect: number, near: number, far: number);
    SetOrthographic(left: number, right: number, top: number, bottom: number, near: number, far: number);
}