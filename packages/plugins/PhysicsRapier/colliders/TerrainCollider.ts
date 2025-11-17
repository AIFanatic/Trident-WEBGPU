import { GameObject, Mathf } from "@trident/core";
import { PhysicsRapier } from "../PhysicsRapier";
import { Collider } from "./Collider";

export class TerrainCollider extends Collider {
    constructor(gameObject: GameObject) {
        super(gameObject);
    }

    public SetTerrainData(nrows: number, ncols: number, heights: Float32Array, scale: Mathf.Vector3) {
        this.colliderDesc = PhysicsRapier.Physics.ColliderDesc.heightfield(nrows, ncols, heights, scale);
        this.collider = PhysicsRapier.PhysicsWorld.createCollider(this.colliderDesc);
        const p = this.transform.position.clone().add(scale.clone().mul(0.5));
        p.sub(new Mathf.Vector3(0, scale.y * 0.5, 0));
        this.collider.setTranslation(p);
        this.collider.setRotation(this.transform.rotation);
    }
}