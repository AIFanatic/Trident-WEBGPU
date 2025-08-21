import { IVector3 } from "../math/IVector3";

export interface ITransform {
    id: string;
    position: IVector3;
    scale: IVector3;
    eulerAngles: IVector3;
    parent: ITransform | null;

    LookAt(target: IVector3);
    LookAtV1(target: IVector3);
};