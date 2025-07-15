import { EventSystemLocal, EventSystem } from "../Events";
import { Matrix4 } from "../math/Matrix4";
import { ObservableQuaternion, Quaternion } from "../math/Quaternion";
import { ObservableVector3, Vector3 } from "../math/Vector3";
import { Component, ComponentEvents } from "./Component";
export class TransformEvents {
    static Updated = () => { };
}
export class Transform extends Component {
    tempRotation = new Quaternion();
    up = new Vector3(0, 1, 0);
    forward = new Vector3(0, 0, 1);
    right = new Vector3(1, 0, 0);
    _localToWorldMatrix = new Matrix4();
    _worldToLocalMatrix = new Matrix4();
    get localToWorldMatrix() { return this._localToWorldMatrix; }
    get worldToLocalMatrix() { return this._worldToLocalMatrix; }
    _position = new ObservableVector3(() => { this.onChanged(); }, 0, 0, 0);
    _rotation = new ObservableQuaternion(() => { this.onChanged(); });
    _scale = new ObservableVector3(() => { this.onChanged(); }, 1, 1, 1);
    _eulerAngles = new ObservableVector3(() => { this.onEulerChanged(); });
    get position() { return this._position; }
    ;
    set position(value) { this._position.copy(value); this.onChanged(); }
    ;
    get rotation() { return this._rotation; }
    ;
    set rotation(value) { this._rotation.copy(value); this.onChanged(); }
    ;
    get eulerAngles() { return this._eulerAngles; }
    ;
    set eulerAngles(value) { this.eulerAngles.copy(value); this.onEulerChanged(); }
    ;
    get scale() { return this._scale; }
    ;
    set scale(value) { this._scale.copy(value); this.onChanged(); }
    ;
    children = new Set();
    _parent = null;
    get parent() { return this._parent; }
    ;
    set parent(parent) {
        if (parent === null) {
            if (this._parent !== null)
                this._parent.children.delete(this);
        }
        else {
            parent.children.add(this);
        }
        this._parent = parent;
    }
    onEulerChanged() {
        this._rotation.fromEuler(this._eulerAngles, true);
        EventSystem.emit(ComponentEvents.CallUpdate, this, true);
    }
    onChanged() {
        EventSystem.emit(ComponentEvents.CallUpdate, this, true);
    }
    UpdateMatrices() {
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
    Update() {
        this.UpdateMatrices();
        EventSystem.emit(ComponentEvents.CallUpdate, this, false);
    }
    LookAt(target) {
        m1.lookAt(this.position, target, this.up);
        this.rotation.setFromRotationMatrix(m1);
        // this.rotation.lookAt(this.position, target, this.up);
        this.UpdateMatrices();
        this.onChanged();
    }
    LookAtV1(target) {
        this.rotation.lookAt(this.position, target, this.up);
        this.tempRotation.lookAt(this.position, target, this.up);
        if (!this.tempRotation.equals(this.rotation)) {
            this.rotation.copy(this.tempRotation);
            this.UpdateMatrices();
            this.onChanged();
        }
        // this.rotation.lookAt(this.position, target, this.up);
        // this.UpdateMatrices();
        // this.onChanged();
    }
}
const m1 = new Matrix4();
