import { PhysicsRapier } from '../PhysicsRapier.js';
import { Collider } from './Collider.js';

class SphereCollider extends Collider {
  constructor(gameObject) {
    super(gameObject);
    this.colliderDesc = PhysicsRapier.Physics.ColliderDesc.ball(this.transform.scale.x * 0.5);
    this.collider = PhysicsRapier.PhysicsWorld.createCollider(this.colliderDesc);
    this.collider.setTranslation(new PhysicsRapier.Physics.Vector3(this.transform.position.x, this.transform.position.y, this.transform.position.z));
  }
}

export { SphereCollider };
