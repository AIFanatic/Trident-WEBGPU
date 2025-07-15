import { Geometry } from "./Geometry";
import { Matrix4 } from "./math/Matrix4";
import { PBRMaterial } from "./renderer/Material";

export interface ExtensionInstanced {
    instanceMatrices: Matrix4[];
    instanceCount: number;
};

export interface Object3D {
    name?: string;
    geometry?: Geometry;
    material?: PBRMaterial;
    localMatrix?: Matrix4;
    children: Object3D[];
    extensions?: ExtensionInstanced[];
};