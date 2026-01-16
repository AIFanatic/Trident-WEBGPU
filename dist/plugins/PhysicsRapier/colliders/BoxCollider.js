import { Mathf } from '@trident/core';
import { PhysicsRapier } from '../PhysicsRapier.js';
import { Collider } from './Collider.js';

class BoxCollider extends Collider {
  constructor(gameObject) {
    super(gameObject);
    const p = new Mathf.Vector3();
    const q = new Mathf.Quaternion();
    const s = new Mathf.Vector3();
    this.transform.localToWorldMatrix.decompose(p, q, s);
    this.colliderDesc = PhysicsRapier.Physics.ColliderDesc.cuboid(s.x, s.y, s.z);
    this.collider = PhysicsRapier.PhysicsWorld.createCollider(this.colliderDesc);
    this.collider.setTranslation(p);
    this.collider.setRotation(q);
  }
}

export { BoxCollider };
