import { Mathf } from '@trident/core';
import { PhysicsRapier } from '../PhysicsRapier.js';
import { Collider } from './Collider.js';

class TerrainCollider extends Collider {
  constructor(gameObject) {
    super(gameObject);
  }
  SetTerrainData(nrows, ncols, heights, scale) {
    const terrainScale = scale.clone().mul(new Mathf.Vector3(nrows, 1, ncols));
    this.colliderDesc = PhysicsRapier.Physics.ColliderDesc.heightfield(nrows, ncols, heights, terrainScale);
    this.collider = PhysicsRapier.PhysicsWorld.createCollider(this.colliderDesc);
    const p = this.transform.position.clone().add(terrainScale.mul(0.5));
    p.sub(new Mathf.Vector3(0, scale.y * 0.5, 0));
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

export { TerrainCollider };
