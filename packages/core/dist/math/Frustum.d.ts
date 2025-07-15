import { Matrix4 } from "./Matrix4";
import { Plane } from "./Plane";
export declare class Frustum {
    planes: Plane[];
    constructor(p0?: Plane, p1?: Plane, p2?: Plane, p3?: Plane, p4?: Plane, p5?: Plane);
    setFromProjectionMatrix(m: Matrix4): Frustum;
}
//# sourceMappingURL=Frustum.d.ts.map