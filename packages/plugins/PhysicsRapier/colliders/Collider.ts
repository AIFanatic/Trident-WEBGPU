import { Component, HideInInspector, SerializeField } from "@trident/core";
import RAPIER from "../rapier/rapier";
import { PhysicsRapier } from "../PhysicsRapier";

export class Collider extends Component {
    public collider: RAPIER.Collider;
    public colliderDesc: RAPIER.ColliderDesc;

    protected _enabled: boolean = true;
    @SerializeField @HideInInspector public get enabled(): boolean { return this._enabled }
    public set enabled(value: boolean) {
        this._enabled = value;
        if (this.collider) this.collider.setEnabled(this._enabled);
    }

    public Destroy(): void {
        if (this.collider && PhysicsRapier.PhysicsWorld) PhysicsRapier.RemoveCollider(this.collider, true);
    }
}