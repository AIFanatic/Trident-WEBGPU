import { Mathf } from '@trident/core';
import { PhysicsRapier } from '../PhysicsRapier.js';
import { Collider } from './Collider.js';

class TerrainCollider extends Collider {
  constructor(gameObject) {
    super(gameObject);
  }
  SetTerrainData(nrows, ncols, heights, scale) {
    this.colliderDesc = PhysicsRapier.Physics.ColliderDesc.heightfield(nrows, ncols, heights, scale);
    this.collider = PhysicsRapier.PhysicsWorld.createCollider(this.colliderDesc);
    const p = this.transform.position.clone().add(scale.clone().mul(0.5));
    p.sub(new Mathf.Vector3(0, scale.y * 0.5, 0));
    this.collider.setTranslation(p);
    this.collider.setRotation(this.transform.rotation);
  }
}

export { TerrainCollider };
