import { Geometry } from "./Geometry";
import { Matrix4 } from "./math/Matrix4";
import { PBRMaterial } from "./renderer/Material";

export interface Object3D {
    geometry: Geometry | null;
    material: PBRMaterial | null;
    children: number[];
    localMatrix: Matrix4 | null;
};