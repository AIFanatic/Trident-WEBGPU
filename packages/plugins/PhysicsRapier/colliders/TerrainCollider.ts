import { GameObject } from "../../../GameObject";
import { Vector3 } from "../../../math/Vector3";
import { PhysicsRapier } from "../PhysicsRapier";
import { Collider } from "./Collider";

export class TerrainCollider extends Collider {
    constructor(gameObject: GameObject) {
        super(gameObject);
    }

    public SetTerrainData(nrows: number, ncols: number, heights: Float32Array, scale: Vector3) {
        this.colliderDesc = PhysicsRapier.Physics.ColliderDesc.heightfield(nrows, ncols, heights, scale);
        this.collider = PhysicsRapier.PhysicsWorld.createCollider(this.colliderDesc);
        const p = this.transform.position.clone().add(new Vector3(nrows * 0.5, 0, ncols * 0.5));
        this.collider.setTranslation(p);
        this.collider.setRotation(this.transform.rotation);
    }

    public SetTerrainDataTrimesh(vertices: Float32Array, indices: Uint32Array) {
        this.colliderDesc = PhysicsRapier.Physics.ColliderDesc.trimesh(vertices, indices);
        this.collider = PhysicsRapier.PhysicsWorld.createCollider(this.colliderDesc);
        // const p = this.transform.position.clone().add(new Vector3(nrows * 0.5, 0, ncols * 0.5));
        this.collider.setTranslation(this.transform.position);
        this.collider.setRotation(this.transform.rotation);
    }

}