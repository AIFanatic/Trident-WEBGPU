import { GameObject, Mathf } from "@trident/core";
import { PhysicsRapier } from "../PhysicsRapier";
import { Collider } from "./Collider";

export class TerrainCollider extends Collider {
    constructor(gameObject: GameObject) {
        super(gameObject);
    }

    public SetTerrainData(nrows: number, ncols: number, heights: Float32Array, scale: Mathf.Vector3) {
        const terrainScale = scale.clone().mul(new Mathf.Vector3(nrows, 1, ncols));
        this.colliderDesc = PhysicsRapier.Physics.ColliderDesc.heightfield(nrows, ncols, heights, terrainScale);
        this.collider = PhysicsRapier.PhysicsWorld.createCollider(this.colliderDesc);
        // const p = this.transform.position.clone().add(new Mathf.Vector3(nrows * 0.5, 0, ncols * 0.5));
        const p = this.transform.position.clone().add(terrainScale.mul(0.5));
        p.sub(new Mathf.Vector3(0, scale.y * 0.5, 0));
        // console.log(nrows, ncols, heights, scale);
        // p.add(scale.clone().mul(0.5)).sub(100)
        this.collider.setTranslation(p);
        this.collider.setRotation(this.transform.rotation);
    }

    // public SetTerrainDataTrimesh(vertices: Float32Array, indices: Uint32Array) {
    //     this.colliderDesc = PhysicsRapier.Physics.ColliderDesc.trimesh(vertices, indices);
    //     this.collider = PhysicsRapier.PhysicsWorld.createCollider(this.colliderDesc);
    //     // const p = this.transform.position.clone().add(new Mathf.Vector3(nrows * 0.5, 0, ncols * 0.5));
    //     this.collider.setTranslation(this.transform.position);
    //     this.collider.setRotation(this.transform.rotation);
    // }
}