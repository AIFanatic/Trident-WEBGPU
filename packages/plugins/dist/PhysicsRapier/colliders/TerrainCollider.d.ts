import { GameObject } from "../../../GameObject";
import { Vector3 } from "../../../math/Vector3";
import { Collider } from "./Collider";
export declare class TerrainCollider extends Collider {
    constructor(gameObject: GameObject);
    SetTerrainData(nrows: number, ncols: number, heights: Float32Array, scale: Vector3): void;
    SetTerrainDataTrimesh(vertices: Float32Array, indices: Uint32Array): void;
}
//# sourceMappingURL=TerrainCollider.d.ts.map