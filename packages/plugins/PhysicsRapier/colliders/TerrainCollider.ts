import { GameObject, Mathf } from "@trident/core";
import { PhysicsRapier } from "../PhysicsRapier";
import { Collider } from "./Collider";

export class TerrainCollider extends Collider {
    public static type = "@trident/plugins/PhysicsRapier/Colliders/TerrainCollider";

    constructor(gameObject: GameObject) {
        super(gameObject);
    }

    public SetTerrainData(nrows: number, ncols: number, heights: Float32Array, scale: Mathf.Vector3) {
        if (this.collider) PhysicsRapier.PhysicsWorld.removeCollider(this.collider, true);
        this.colliderDesc = PhysicsRapier.Physics.ColliderDesc.heightfield(nrows, ncols, heights, scale);
        this.collider = PhysicsRapier.PhysicsWorld.createCollider(this.colliderDesc);
        this.collider.setTranslation(this.transform.position);
        this.collider.setRotation(this.transform.rotation);
    }
}