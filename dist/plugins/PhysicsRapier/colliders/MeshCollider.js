import { EventSystemLocal, Components, Mathf } from '@trident/core';
import { PhysicsRapier } from '../PhysicsRapier.js';
import { Collider } from './Collider.js';

class MeshCollider extends Collider {
  static type = "@trident/plugins/PhysicsRapier/Colliders/MeshCollider";
  constructor(gameObject) {
    super(gameObject);
    EventSystemLocal.on(Components.RenderableEvents.GeometryUpdated, this.transform, (gameObject2, geometry) => {
      let meshes2 = this.gameObject.GetComponentsInChildren(Components.Mesh);
      if (meshes2.length === 0) {
        console.warn("No mesh");
        return;
      }
      const mesh = meshes2[0];
      if (!mesh.geometry) {
        console.warn("No mesh or mesh.geometry");
        return;
      }
      this.CreateCollider(mesh.geometry);
    });
    const meshes = this.gameObject.GetComponentsInChildren(Components.Mesh);
    if (meshes.length > 0 && meshes[0].geometry?.attributes?.has("position")) {
      this.CreateCollider(meshes[0].geometry);
    }
  }
  CreateCollider(geometry) {
    const p = new Mathf.Vector3();
    const q = new Mathf.Quaternion();
    const s = new Mathf.Vector3();
    this.transform.localToWorldMatrix.decompose(p, q, s);
    const verts = geometry.attributes.get("position").array;
    const idxAny = geometry.index.array;
    const idx32 = idxAny instanceof Uint32Array ? idxAny : new Uint32Array(idxAny);
    const baked = new Float32Array(verts.length);
    for (let i = 0; i < verts.length; i += 3) {
      baked[i + 0] = verts[i + 0] * s.x;
      baked[i + 1] = verts[i + 1] * s.y;
      baked[i + 2] = verts[i + 2] * s.z;
    }
    if (this.collider) PhysicsRapier.PhysicsWorld.removeCollider(this.collider, true);
    this.colliderDesc = PhysicsRapier.Physics.ColliderDesc.trimesh(baked, idx32);
    this.collider = PhysicsRapier.PhysicsWorld.createCollider(this.colliderDesc);
    this.collider.setTranslation(p);
    this.collider.setRotation(q);
  }
}

export { MeshCollider };
