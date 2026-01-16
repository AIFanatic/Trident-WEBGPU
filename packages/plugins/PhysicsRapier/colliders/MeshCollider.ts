import { Components, EventSystem, EventSystemLocal, GameObject, Mathf, Component } from "@trident/core";
import { PhysicsRapier } from "../PhysicsRapier";
import { Collider } from "./Collider";
import { RigidBody } from "../RigidBody";

export class MeshCollider extends Collider {
    constructor(gameObject: GameObject) {
        super(gameObject);

        let meshes: Components.Mesh[] = this.gameObject.GetComponentsInChildren(Components.Mesh);
        console.log(meshes)
        if (meshes.length === 0) {
            console.warn("No mesh");
            return;
        }

        const mesh = meshes[0];
        if (!mesh.geometry) {
            console.warn("No mesh or mesh.geometry");
            return;
        }

        const p = new Mathf.Vector3();
        const q = new Mathf.Quaternion();
        const s = new Mathf.Vector3();
        this.transform.localToWorldMatrix.decompose(p, q, s);

        const verts = mesh.geometry.attributes.get("position").array as Float32Array;
        const idxAny = mesh.geometry.index.array as Uint16Array | Uint32Array;
        const idx32 = (idxAny instanceof Uint32Array) ? idxAny : new Uint32Array(idxAny);

        const baked = new Float32Array(verts.length);
        for (let i = 0; i < verts.length; i += 3) {
            baked[i + 0] = verts[i + 0] * s.x;
            baked[i + 1] = verts[i + 1] * s.y;
            baked[i + 2] = verts[i + 2] * s.z;
        }

        // this.rigidbodyDesc = PhysicsRapier.Physics.RigidBodyDesc.kinematicPositionBased();
        // this.rigidbody = PhysicsRapier.PhysicsWorld.createRigidBody(this.rigidbodyDesc);

        this.colliderDesc = PhysicsRapier.Physics.ColliderDesc.trimesh(baked, idx32);
        this.collider = PhysicsRapier.PhysicsWorld.createCollider(this.colliderDesc);
        // // this.collider.setTranslation(p);
        // // this.collider.setRotation(q);

        // EventSystemLocal.on(Components.TransformEvents.Updated, this.transform, () => {
        //     console.log("Trigger")
        //     this.transform.localToWorldMatrix.decompose(p, q, s);
        //     // this.collider.setTranslation(p);
        //     // this.collider.setRotation(q);

        //     this.rigidbody.setNextKinematicTranslation(p);
        //     this.rigidbody.setNextKinematicRotation(q);
        // })



        // this.buildDesc();
        // this.bind();

        // EventSystem.on(Components.ComponentEvents.AddedComponent, (component) => {
        //     if (component.gameObject !== this.gameObject) return;
        //     if (component instanceof RigidBody) {
        //         this.bind();
        //     }
        // });

        // EventSystem.on(Components.ComponentEvents.RemovedComponent, (component) => {
        //     if (component.gameObject !== this.gameObject) return;
        //     if (component instanceof RigidBody) {
        //         this.bind();
        //     }
        // });

        // EventSystemLocal.on(Components.TransformEvents.Updated, this.transform, () => {
        //     if (!this.collider) return;
        //     if (this.collider.parent()) return; // attached to rigidbody, don't push world transforms
        //     this.updateWorldTransform();
        // });
    }

    // private buildDesc() {
    //     // const hx = Math.abs(this.size.x * 0.5);
    //     // const hy = Math.abs(this.size.y * 0.5);
    //     // const hz = Math.abs(this.size.z * 0.5);
    //     // this.colliderDesc = PhysicsRapier.Physics.ColliderDesc.cuboid(hx, hy, hz);


    //     let meshes: Components.Mesh[] = this.gameObject.GetComponentsInChildren(Components.Mesh);
    //     console.log(meshes)
    //     if (meshes.length === 0) {
    //         console.warn("No mesh");
    //         return;
    //     }

    //     const mesh = meshes[0];
    //     if (!mesh.geometry) {
    //         console.warn("No mesh or mesh.geometry");
    //         return;
    //     }

    //     const p = new Mathf.Vector3();
    //     const q = new Mathf.Quaternion();
    //     const s = new Mathf.Vector3();
    //     this.transform.localToWorldMatrix.decompose(p, q, s);

    //     const verts = mesh.geometry.attributes.get("position").array as Float32Array;
    //     const idxAny = mesh.geometry.index.array as Uint16Array | Uint32Array;
    //     const idx32 = (idxAny instanceof Uint32Array) ? idxAny : new Uint32Array(idxAny);

    //     const baked = new Float32Array(verts.length);
    //     for (let i = 0; i < verts.length; i += 3) {
    //         baked[i + 0] = verts[i + 0] * s.x;
    //         baked[i + 1] = verts[i + 1] * s.y;
    //         baked[i + 2] = verts[i + 2] * s.z;
    //     }

    //     this.colliderDesc = PhysicsRapier.Physics.ColliderDesc.trimesh(baked, idx32);
    // }

    // private bind() {
    //     const rb = this.gameObject.GetComponent(RigidBody);
    //     if (rb?.rigidBody) {
    //         if (this.collider) PhysicsRapier.PhysicsWorld.removeCollider(this.collider, true);
    //         this.collider = PhysicsRapier.PhysicsWorld.createCollider(this.colliderDesc, rb.rigidBody);
    //         this.collider.setTranslationWrtParent(this.transform.position);
    //     } else {
    //         if (this.collider) PhysicsRapier.PhysicsWorld.removeCollider(this.collider, true);
    //         this.collider = PhysicsRapier.PhysicsWorld.createCollider(this.colliderDesc);
    //         this.updateWorldTransform();
    //     }
    // }

    // private updateWorldTransform() {
    //     let root = this.transform;
    //     while (root.parent) root = root.parent;
    //     // root.Update();

    //     const p = new Mathf.Vector3();
    //     const q = new Mathf.Quaternion();
    //     const s = new Mathf.Vector3();
    //     this.transform.localToWorldMatrix.decompose(p, q, s);

    //     const worldCenter = this.transform.position.clone().applyMatrix4(this.transform.localToWorldMatrix);
    //     this.collider.setTranslation(worldCenter);
    //     this.collider.setRotation(q);
    // }

    // public Destroy(): void {
    //     if (!this.collider) return;
    //     PhysicsRapier.PhysicsWorld.removeCollider(this.collider, true);
    //     this.collider = null;
    // }
}