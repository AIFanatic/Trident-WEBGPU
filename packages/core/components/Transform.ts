import { EventSystemLocal, EventSystem } from "../Events";
import { Matrix4 } from "../math/Matrix4";
import { ObservableQuaternion, Quaternion } from "../math/Quaternion";
import { ObservableVector3, Vector3 } from "../math/Vector3";
import { SerializeField } from "../utils";
import { Component } from "./Component";

export class TransformEvents {
    public static Updated = () => { };
}

export class Transform extends Component {
    public runInEditMode: boolean = true;
    public static type = "@trident/core/components/Transform";

    private tempPosition = new Vector3();
    private tempQuaternion = new Quaternion();
    private tempRotation = new Quaternion();

    private _up = new Vector3(0, 1, 0);
    private _forward = new Vector3(0, 0, -1);
    public get up(): Vector3 { this.resolve(); return this._up; }
    public get forward(): Vector3 { this.resolve(); return this._forward; }

    private _localToWorldMatrix = new Matrix4();
    private _worldToLocalMatrix = new Matrix4();
    public get localToWorldMatrix(): Matrix4 { this.resolve(); return this._localToWorldMatrix; }
    public get worldToLocalMatrix(): Matrix4 { this.resolve(); return this._worldToLocalMatrix; }

    private _localPosition = new ObservableVector3(() => this.onLocalChanged(), 0, 0, 0);
    private _localRotation = new ObservableQuaternion(() => this.onLocalChanged());
    private _localScale = new ObservableVector3(() => this.onLocalChanged(), 1, 1, 1);
    private _localEulerAngles = new ObservableVector3(() => this.onLocalEulerChanged());

    private _position = new ObservableVector3(() => this.onWorldChanged(), 0, 0, 0);
    private _rotation = new ObservableQuaternion(() => this.onWorldChanged());
    private _eulerAngles = new ObservableVector3(() => this.onWorldEulerChanged());

    private _suppressLocalCallbacks = false;
    private _suppressWorldCallbacks = false;
    private _lastChanged: "local" | "world" = "local";
    private _dirty = true;

    @SerializeField public get localPosition(): Vector3 { this.resolve(); return this._localPosition; }
    public set localPosition(value: Vector3) { this._localPosition.copy(value); }

    @SerializeField public get localRotation(): Quaternion { this.resolve(); return this._localRotation; }
    public set localRotation(value: Quaternion) { this._localRotation.copy(value); }

    public get localEulerAngles(): Vector3 { this.resolve(); return this._localEulerAngles; }
    public set localEulerAngles(value: Vector3) { this._localEulerAngles.copy(value); }

    public get position(): Vector3 { this.resolve(); return this._position; }
    public set position(value: Vector3) { this._position.copy(value); }

    public get rotation(): Quaternion { this.resolve(); return this._rotation; }
    public set rotation(value: Quaternion) { this._rotation.copy(value); }

    public get eulerAngles(): Vector3 { this.resolve(); return this._eulerAngles; }
    public set eulerAngles(value: Vector3) { this._eulerAngles.copy(value); }

    @SerializeField public get scale(): Vector3 { this.resolve(); return this._localScale; }
    public set scale(value: Vector3) { this._localScale.copy(value); }

    public children: Set<Transform> = new Set();

    private _parent: Transform | null = null;
    public get parent(): Transform | null { return this._parent; }
    public set parent(parent: Transform | null) {
        if (this._parent) this._parent.children.delete(this);
        if (parent) parent.children.add(this);
        this._parent = parent;
        this._lastChanged = "world";   // keep world position across reparent
        this.markDirty();
    }

    // ── cheap: flag self + subtree, once ──
    private markDirty(): void {
        if (this._dirty) return;
        this._dirty = true;
        for (const child of this.children) child.markDirty();
    }

    // ── callbacks just record authority + mark dirty (idempotent, so per-component fires are free) ──
    private onLocalChanged(): void {
        if (this._suppressLocalCallbacks) return;
        this._lastChanged = "local";
        this.markDirty();
    }
    private onLocalEulerChanged(): void {
        if (this._suppressLocalCallbacks) return;
        this._suppressLocalCallbacks = true;
        this._localRotation.setFromEuler(this._localEulerAngles, true);
        this._suppressLocalCallbacks = false;
        this._lastChanged = "local";
        this.markDirty();
    }
    private onWorldChanged(): void {
        if (this._suppressWorldCallbacks) return;
        this._lastChanged = "world";
        this.markDirty();
    }
    private onWorldEulerChanged(): void {
        if (this._suppressWorldCallbacks) return;
        this._suppressWorldCallbacks = true;
        this._rotation.setFromEuler(this._eulerAngles, true);
        this._suppressWorldCallbacks = false;
        this._lastChanged = "world";
        this.markDirty();
    }

    // ── lazy: runs once per changed transform when something reads it ──
    private resolve(): void {
        if (!this._dirty) return;
        this._dirty = false;

        if (this._parent) this._parent.resolve();

        // world was set → derive local from world (needs parent)
        if (this._lastChanged === "world") {
            this._suppressLocalCallbacks = true;
            if (this._parent) {
                this._localPosition.copy(this.tempPosition.copy(this._position).applyMatrix4(this._parent._worldToLocalMatrix));
                this._localRotation.copy(this.tempQuaternion.copy(this._parent._rotation).invert().mul(this._rotation).normalize());
            } else {
                this._localPosition.copy(this._position);
                this._localRotation.copy(this._rotation);
            }
            this._suppressLocalCallbacks = false;
        }

        // compose local → world
        this._localToWorldMatrix.compose(this._localPosition, this._localRotation, this._localScale);
        if (this._parent) this._localToWorldMatrix.premultiply(this._parent._localToWorldMatrix);
        this._worldToLocalMatrix.copy(this._localToWorldMatrix).invert();

        // local was set → derive world from local
        if (this._lastChanged === "local") {
            this._suppressWorldCallbacks = true;
            if (this._parent) {
                this._position.copy(this.tempPosition.copy(this._localPosition).applyMatrix4(this._parent._localToWorldMatrix));
                this._rotation.copy(this.tempQuaternion.copy(this._parent._rotation).mul(this._localRotation).normalize());
            } else {
                this._position.copy(this._localPosition);
                this._rotation.copy(this._localRotation);
            }
            this._suppressWorldCallbacks = false;
        }

        // keep euler mirrors consistent (suppressed so they don't re-fire)
        this._suppressLocalCallbacks = this._suppressWorldCallbacks = true;
        this._localEulerAngles.copy(this._localRotation.toEuler(true));
        this._eulerAngles.copy(this._rotation.toEuler(true));
        this._suppressLocalCallbacks = this._suppressWorldCallbacks = false;

        this._forward.set(0, 0, -1).applyQuaternion(this._rotation);
        this._up.set(0, 1, 0).applyQuaternion(this._rotation);

        EventSystem.emit(TransformEvents.Updated);
        EventSystemLocal.emit(TransformEvents.Updated, this);
    }

    public LookAt(target: Vector3): void {
        this.tempRotation.lookAt(this.position, target, Vector3.up);
        this.rotation = this.tempRotation;   // setter → onWorldChanged → markDirty
    }

    public SetLocalTRS(position: Vector3, rotation: Quaternion, scale: Vector3): void {
        this._suppressLocalCallbacks = true;
        this._localPosition.copy(position);
        this._localRotation.copy(rotation);
        this._localScale.copy(scale);
        this._suppressLocalCallbacks = false;
        this._lastChanged = "local";
        this.markDirty();
    }
}