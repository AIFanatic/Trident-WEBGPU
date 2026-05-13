import { IVector3 } from "../math/IVector3";
import { IComponent } from "./IComponent";

export interface ITransform extends IComponent {
    id: string;
    position: IVector3;
    localPosition: IVector3;
    scale: IVector3;
    eulerAngles: IVector3;
    localEulerAngles: IVector3;
    parent: ITransform | null;
    children: ITransform[];

    LookAt(target: IVector3);
    LookAtV1(target: IVector3);
};