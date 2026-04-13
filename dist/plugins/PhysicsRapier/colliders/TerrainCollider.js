import { PhysicsRapier } from '../PhysicsRapier.js';
import { Collider } from './Collider.js';

class TerrainCollider extends Collider {
  static type = "@trident/plugins/PhysicsRapier/Colliders/TerrainCollider";
  constructor(gameObject) {
    super(gameObject);
  }
  SetTerrainData(nrows, ncols, heights, scale) {
    this.colliderDesc = PhysicsRapier.Physics.ColliderDesc.heightfield(nrows, ncols, heights, scale);
    this.collider = PhysicsRapier.PhysicsWorld.createCollider(this.colliderDesc);
    this.collider.setTranslation(this.transform.position);
    this.collider.setRotation(this.transform.rotation);
  }
}

export { TerrainCollider };
