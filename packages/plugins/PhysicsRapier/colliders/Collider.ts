import { Component, Components, EventSystemLocal, GameObject, HideInInspector, Mathf, SerializeField, Utils } from "@trident/core";
import RAPIER from "../rapier/rapier";
import { PhysicsRapier } from "../PhysicsRapier";

export class ColliderEvents {
    public static Created = (collider: Collider) => {};
}

export class Collider extends Component {
    public collider: RAPIER.Collider;
    public colliderDesc: RAPIER.ColliderDesc;
    public runInEditMode: boolean = true;

    @SerializeField(Mathf.Vector3) public center = new Mathf.Vector3(0, 0, 0);

    protected _enabled: boolean = true;
    @SerializeField @HideInInspector public get enabled(): boolean { return this._enabled }
    public set enabled(value: boolean) {
        this._enabled = value;
        if (this.collider) this.collider.setEnabled(this._enabled);
    }

    @SerializeField public get update(): boolean {return false}
    public set update(value: boolean) {
        if (this.isDeserializing) return;
        this.CreateCollider()
    }

    public Start(): void {
        EventSystemLocal.on(Components.TransformEvents.Updated, this.transform, () => {
            if (!this.collider || this.collider.parent()) return;
            this.UpdateTRS();
        });
    }

    protected CreateCollider() {}

    protected UpdateTRS() {
        this.collider.setTranslation(this.center.clone().mul(this.transform.scale).applyQuaternion(this.transform.rotation).add(this.transform.position));
        this.collider.setRotation(this.transform.rotation);
    }

    public Destroy(): void {
        if (this.collider && PhysicsRapier.PhysicsWorld) PhysicsRapier.RemoveCollider(this.collider, true);
    }
}