import { EventSystemLocal, EventSystem } from "../Events";
import { Matrix4 } from "../math/Matrix4";
import { ObservableQuaternion, Quaternion } from "../math/Quaternion";
import { ObservableVector3, Vector3 } from "../math/Vector3";
import { Component, ComponentEvents } from "./Component";

export class TransformEvents {
    public static Updated = () => {};
}

export class Transform extends Component {
    public static type = "@trident/core/components/Transform";

    private tempRotation = new Quaternion();

    public up: Vector3 = new Vector3(0, 1, 0);
    public forward: Vector3 = new Vector3(0, 0, 1);
    public right: Vector3 = new Vector3(1, 0, 0);
    
    private _localToWorldMatrix: Matrix4 = new Matrix4();
    private _worldToLocalMatrix: Matrix4 = new Matrix4();
    public get localToWorldMatrix(): Matrix4 { return this._localToWorldMatrix; }
    public get worldToLocalMatrix(): Matrix4 { return this._worldToLocalMatrix; }

    private _position: ObservableVector3 = new ObservableVector3(() => { this.onChanged() }, 0, 0, 0);
    private _rotation: ObservableQuaternion = new ObservableQuaternion(() => { this.onChanged() });
    private _scale: ObservableVector3 = new ObservableVector3(() => { this.onChanged() }, 1, 1, 1);
    private _eulerAngles: ObservableVector3 = new ObservableVector3(() => { this.onEulerChanged() });

    public get position(): Vector3 { return this._position };
    public set position(value: Vector3) { this._position.copy(value); this.onChanged(); };

    public get rotation(): Quaternion { return this._rotation };
    public set rotation(value: Quaternion) { this._rotation.copy(value); this.onChanged(); };

    public get eulerAngles(): Vector3 { return this._eulerAngles };
    public set eulerAngles(value: Vector3) { this.eulerAngles.copy(value); this.onEulerChanged(); };

    public get scale(): Vector3 { return this._scale };
    public set scale(value: Vector3) { this._scale.copy(value); this.onChanged(); };

    private children: Set<Transform> = new Set();
    private _parent: Transform | null = null;
    public get parent(): Transform | null { return this._parent };
    public set parent(parent: Transform | null) {
        if (parent === null) {
            if (this._parent !== null) this._parent.children.delete(this);
        }
        else {
            parent.children.add(this);
        }

        this._parent = parent;
    }

    private onEulerChanged() {
        this._rotation.fromEuler(this._eulerAngles, true);
        EventSystem.emit(ComponentEvents.CallUpdate, this, true);
    }

    private onChanged() {
        EventSystem.emit(ComponentEvents.CallUpdate, this, true);
    }

    private UpdateMatrices() {
        this._localToWorldMatrix.compose(this.position, this.rotation, this.scale);
        this._worldToLocalMatrix.copy(this._localToWorldMatrix).invert();

        if (this.parent !== null) {
            this._localToWorldMatrix.premultiply(this.parent._localToWorldMatrix);
        }

        for (const child of this.children) {
            child.UpdateMatrices();
        }
        
        EventSystem.emit(TransformEvents.Updated);
        EventSystemLocal.emit(TransformEvents.Updated, this);
    }

    public Update() {
        this.UpdateMatrices();
        EventSystem.emit(ComponentEvents.CallUpdate, this, false);
    }

    public LookAt(target: Vector3): void {
        m1.lookAt(this.position, target, this.up);
        this.rotation.setFromRotationMatrix(m1);
        // this.rotation.lookAt(this.position, target, this.up);
        this.UpdateMatrices();
        this.onChanged();
    }

    public LookAtV1(target: Vector3): void {
        this.rotation.lookAt(this.position, target, this.up);
        this.tempRotation.lookAt(this.position, target, this.up);
        if (!this.tempRotation.equals(this.rotation)) {
            this.rotation.copy(this.tempRotation);
            this.UpdateMatrices();
            this.onChanged();
        }
    }

    public Serialize() {
        return {
            type: Transform.type,
            position: this.position.Serialize(),
            rotation: this.rotation.Serialize(),
            scale: this.scale.Serialize(),
        };
    }

    public Deserialize(data: any) {
        this.position.Deserialize(data.position);
        this.rotation.Deserialize(data.rotation);
        this.scale.Deserialize(data.scale);
    }
}

const m1 = new Matrix4();