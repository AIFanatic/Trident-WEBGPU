import { EventSystemLocal, EventSystem } from "../Events";
import { Matrix4 } from "../math/Matrix4";
import { ObservableQuaternion, Quaternion } from "../math/Quaternion";
import { ObservableVector3, Vector3 } from "../math/Vector3";
import { Component, ComponentEvents } from "./Component";

export class TransformEvents {
    public static Updated = () => { };
}

export class Transform extends Component {
    public static type = "@trident/core/components/Transform";

    private tempRotation = new Quaternion();
    private tempPosition = new Vector3();
    private tempQuaternion = new Quaternion();

    public up: Vector3 = new Vector3(0, 1, 0);
    public forward: Vector3 = new Vector3(0, 0, 1);
    public right: Vector3 = new Vector3(1, 0, 0);

    private _localToWorldMatrix: Matrix4 = new Matrix4();
    private _worldToLocalMatrix: Matrix4 = new Matrix4();
    public get localToWorldMatrix(): Matrix4 { return this._localToWorldMatrix; }
    public get worldToLocalMatrix(): Matrix4 { return this._worldToLocalMatrix; }

    private _localPosition: ObservableVector3 = new ObservableVector3(() => { this.onLocalPositionScaleChanged(); }, 0, 0, 0);
    private _localRotation: ObservableQuaternion = new ObservableQuaternion(() => { this.onLocalRotationChanged(); });
    private _localScale: ObservableVector3 = new ObservableVector3(() => { this.onLocalPositionScaleChanged(); }, 1, 1, 1);
    private _localEulerAngles: ObservableVector3 = new ObservableVector3(() => { this.onLocalEulerChanged(); });

    private _position: ObservableVector3 = new ObservableVector3(() => { this.onWorldPositionChanged(); }, 0, 0, 0);
    private _rotation: ObservableQuaternion = new ObservableQuaternion(() => { this.onWorldRotationChanged(); });
    private _eulerAngles: ObservableVector3 = new ObservableVector3(() => { this.onWorldEulerChanged(); });

    private _suppressLocalCallbacks = false;
    private _suppressWorldCallbacks = false;

    // NEW: which space was edited last (source-of-truth for this update)
    private _lastChanged: "local" | "world" = "local";

    public get localPosition(): Vector3 { return this._localPosition; }
    public set localPosition(value: Vector3) { this._localPosition.copy(value); }

    public get localRotation(): Quaternion { return this._localRotation; }
    public set localRotation(value: Quaternion) { this._localRotation.copy(value); }

    public get localEulerAngles(): Vector3 { return this._localEulerAngles; }
    public set localEulerAngles(value: Vector3) { this._localEulerAngles.copy(value); }

    public get position(): Vector3 { return this._position; }
    public set position(value: Vector3) { this._position.copy(value); }

    public get rotation(): Quaternion { return this._rotation; }
    public set rotation(value: Quaternion) { this._rotation.copy(value); }

    public get eulerAngles(): Vector3 { return this._eulerAngles; }
    public set eulerAngles(value: Vector3) { this._eulerAngles.copy(value); }

    public get scale(): Vector3 { return this._localScale; }
    public set scale(value: Vector3) { this._localScale.copy(value); }

    public children: Set<Transform> = new Set();

    private _parent: Transform | null = null;
    public get parent(): Transform | null { return this._parent; }
    public set parent(parent: Transform | null) {
        // remove from old parent
        if (this._parent !== null) {
            this._parent.children.delete(this);
        }

        // add to new parent
        if (parent !== null) {
            parent.children.add(this);
            parent.UpdateMatrices();
        }

        this._parent = parent;

        // Keep world as authoritative during reparent: recompute locals from current world
        this._lastChanged = "world";
        this.onWorldPositionChanged();
        this.onWorldRotationChanged();
        // scale is local-only in this implementation (no worldScale)
    }

    private onLocalEulerChanged() {
        if (this._suppressLocalCallbacks) return;

        this._suppressLocalCallbacks = true;
        this._localRotation.setFromEuler(this._localEulerAngles, true);
        this._suppressLocalCallbacks = false;

        this.onLocalChanged();
    }

    private onLocalPositionScaleChanged() {
        if (this._suppressLocalCallbacks) return;
        this.onLocalChanged();
    }

    private onLocalRotationChanged() {
        if (this._suppressLocalCallbacks) return;

        this._suppressLocalCallbacks = true;
        this._localEulerAngles.copy(this._localRotation.toEuler(true));
        this._suppressLocalCallbacks = false;

        this.onLocalChanged();
    }

    private onLocalChanged() {
        // local is now the authoritative source
        this._lastChanged = "local";
        this.UpdateMatrices();
        EventSystem.emit(ComponentEvents.CallUpdate, this, true);
    }

    private onWorldEulerChanged() {
        if (this._suppressWorldCallbacks) return;

        this._suppressWorldCallbacks = true;
        this._rotation.setFromEuler(this._eulerAngles, true);
        this._suppressWorldCallbacks = false;

        this.onWorldRotationChanged();
    }

    private onWorldPositionChanged() {
        if (this._suppressWorldCallbacks) return;

        // world is now the authoritative source
        this._lastChanged = "world";

        if (this.parent !== null) {
            this.parent.UpdateMatrices();

            this._suppressLocalCallbacks = true;
            this._localPosition.copy(
                this.tempPosition.copy(this._position).applyMatrix4(this.parent._worldToLocalMatrix)
            );
            this._suppressLocalCallbacks = false;
        } else {
            this._suppressLocalCallbacks = true;
            this._localPosition.copy(this._position);
            this._suppressLocalCallbacks = false;
        }

        // update matrices, but DON'T overwrite world from local afterward
        this.UpdateMatrices();
        EventSystem.emit(ComponentEvents.CallUpdate, this, true);
    }

    private onWorldRotationChanged() {
        if (this._suppressWorldCallbacks) return;

        // world is now the authoritative source
        this._lastChanged = "world";

        if (this.parent !== null) {
            this.parent.UpdateMatrices();

            this._suppressLocalCallbacks = true;
            this._localRotation.copy(
                this.tempQuaternion.copy(this.parent._rotation).invert().mul(this._rotation).normalize()
            );
            this._localEulerAngles.copy(this._localRotation.toEuler(true));
            this._suppressLocalCallbacks = false;
        } else {
            this._suppressLocalCallbacks = true;
            this._localRotation.copy(this._rotation);
            this._localEulerAngles.copy(this._localRotation.toEuler(true));
            this._suppressLocalCallbacks = false;
        }

        this.UpdateMatrices();
        EventSystem.emit(ComponentEvents.CallUpdate, this, true);
    }

    private syncWorldFromLocal() {
        this._suppressWorldCallbacks = true;

        if (this.parent !== null) {
            this._position.copy(this.tempPosition.copy(this._localPosition).applyMatrix4(this.parent._localToWorldMatrix));
            this._rotation.copy(this.tempQuaternion.copy(this.parent._rotation).mul(this._localRotation).normalize());
        } else {
            this._position.copy(this._localPosition);
            this._rotation.copy(this._localRotation);
        }

        this._eulerAngles.copy(this._rotation.toEuler(true));

        this._suppressWorldCallbacks = false;
    }

    private UpdateMatrices() {
        // Compose local matrix
        this._localToWorldMatrix.compose(this._localPosition, this._localRotation, this._localScale);

        // Apply parent
        if (this.parent !== null) {
            this._localToWorldMatrix.premultiply(this.parent._localToWorldMatrix);
        }

        // Invert for world->local conversions
        this._worldToLocalMatrix.copy(this._localToWorldMatrix).invert();

        // Only overwrite world fields from local if local was authoritative this tick.
        // If world was authoritative, we've already computed locals from world and we want to keep world intact.
        if (this._lastChanged === "local") {
            this.syncWorldFromLocal();
        } else {
            // keep eulers consistent with rotation if rotation changed directly
            this._suppressWorldCallbacks = true;
            this._eulerAngles.copy(this._rotation.toEuler(true));
            this._suppressWorldCallbacks = false;
        }

        // Update children (they derive their world from their locals + our matrix)
        for (const child of this.children) {
            child.UpdateMatrices();
        }

        EventSystem.emit(TransformEvents.Updated);
        EventSystemLocal.emit(TransformEvents.Updated, this);
    }

    public Update() {
        // treat as local authoritative by default for tick updates
        this._lastChanged = "local";
        this.UpdateMatrices();
        EventSystem.emit(ComponentEvents.CallUpdate, this, false);
    }

    public LookAt(target: Vector3): void {
        this.rotation.lookAt(this.position, target, this.up);
        this.tempRotation.lookAt(this.position, target, this.up);

        if (!this.tempRotation.equals(this.rotation)) {
            this._suppressWorldCallbacks = true;
            this._rotation.copy(this.tempRotation);
            this._eulerAngles.copy(this._rotation.toEuler(true));
            this._suppressWorldCallbacks = false;
            this.onWorldRotationChanged();
            this.UpdateMatrices();
        }
    }

    public LookAtV1(target: Vector3): void {
        this.LookAt(target);
    }

    public Serialize() {
        return {
            type: Transform.type,
            position: this.localPosition.Serialize(),
            rotation: this.localRotation.Serialize(),
            scale: this.scale.Serialize(),
        };
    }

    public Deserialize(data: any) {
        this.localPosition.Deserialize(data.position);
        this.localRotation.Deserialize(data.rotation);
        this.scale.Deserialize(data.scale);

        // after deserializing locals, recompute world
        this._lastChanged = "local";
        this.UpdateMatrices();
    }
}