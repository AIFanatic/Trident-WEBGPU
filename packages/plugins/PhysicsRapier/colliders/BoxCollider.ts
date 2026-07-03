import { Components, EventSystemLocal, GameObject, Mathf, SerializeField } from "@trident/core";
import { PhysicsRapier } from "../PhysicsRapier";
import { Collider } from "./Collider";

export class BoxCollider extends Collider {
    public static type = "@trident/plugins/PhysicsRapier/Colliders/BoxCollider";

    @SerializeField(Mathf.Vector3) public center = new Mathf.Vector3(0, 0, 0);
    @SerializeField(Mathf.Vector3) public size = new Mathf.Vector3(1, 1, 1);

    constructor(gameObject: GameObject) {
        super(gameObject);

        const mesh = gameObject.GetComponent(Components.Mesh);
        if (mesh?.geometry?.attributes?.has("position")) {
            const bv = mesh.geometry.boundingVolume;
            this.center.copy(bv.center);
            this.size.set(bv.halfExtents.x * 2, bv.halfExtents.y * 2, bv.halfExtents.z * 2);
        }

        EventSystemLocal.on(Components.TransformEvents.Updated, this.transform, () => {
            if (!this.collider || this.collider.parent()) return;
            this.collider.setTranslation(this.center.clone().mul(this.transform.scale).applyQuaternion(this.transform.rotation).add(this.transform.position));
            this.collider.setRotation(this.transform.rotation);
        });

        EventSystemLocal.on(Components.TransformEvents.Updated, this.transform, () => {
        })
    }

    public Start() {
        this.CreateCollider();
    }

    private CreateCollider() {
        if (!PhysicsRapier.hasLoaded) { console.warn("PhysicsRapier not loaded"); return; }

        const p = new Mathf.Vector3();
        const q = new Mathf.Quaternion();
        const s = new Mathf.Vector3();
        this.transform.localToWorldMatrix.decompose(p, q, s);

        const halfX = Math.abs(this.size.x * 0.5 * s.x);
        const halfY = Math.abs(this.size.y * 0.5 * s.y);
        const halfZ = Math.abs(this.size.z * 0.5 * s.z);

        if (this.collider) PhysicsRapier.PhysicsWorld.removeCollider(this.collider, true);
        this.colliderDesc = PhysicsRapier.Physics.ColliderDesc.cuboid(halfX, halfY, halfZ);
        this.collider = PhysicsRapier.CreateCollider(this, this.colliderDesc);

        // Apply center offset (rotated into world space)
        const offset = new Mathf.Vector3(this.center.x * s.x, this.center.y * s.y, this.center.z * s.z).applyQuaternion(q);
        this.collider.setTranslation({ x: p.x + offset.x, y: p.y + offset.y, z: p.z + offset.z });
        this.collider.setRotation(q);
    }

    public Destroy(): void {
        if (this.collider && PhysicsRapier.PhysicsWorld) PhysicsRapier.PhysicsWorld.removeCollider(this.collider, true);
    }
}