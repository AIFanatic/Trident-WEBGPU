import { PhysicsRapier } from '../PhysicsRapier.js';
import { Collider } from './Collider.js';

class CapsuleCollider extends Collider {
  constructor(gameObject) {
    super(gameObject);
    this.colliderDesc = PhysicsRapier.Physics.ColliderDesc.capsule(this.transform.scale.y * 0.5, this.transform.scale.x * 0.5);
    this.collider = PhysicsRapier.PhysicsWorld.createCollider(this.colliderDesc);
    this.collider.setTranslation(new PhysicsRapier.Physics.Vector3(this.transform.position.x, this.transform.position.y, this.transform.position.z));
    this.collider.setRotation(this.transform.rotation);
  }
}

export { CapsuleCollider };
