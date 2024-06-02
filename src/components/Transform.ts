import { EventSystem } from "../Events";
import { Matrix4 } from "../math/Matrix4";
import { ObservableQuaternion, Quaternion } from "../math/Quaternion";
import { ObservableVector3, Vector3 } from "../math/Vector3";
import { Component } from "./Component";

export class Transform extends Component {
    public up: Vector3 = new Vector3(0, 1, 0);
    public forward: Vector3 = new Vector3(0, 0, 1);
    
    private _localToWorldMatrix: Matrix4 = new Matrix4();
    private _worldToLocalMatrix: Matrix4 = new Matrix4();
    public get localToWorldMatrix(): Matrix4 { return this._localToWorldMatrix; }
    public get worldToLocalMatrix(): Matrix4 { return this._worldToLocalMatrix; }

    public _position: ObservableVector3 = new ObservableVector3(() => { this.onChanged() }, 0, 0, 0);
    public _rotation: ObservableQuaternion = new ObservableQuaternion(() => { this.onChanged() });
    public _scale: ObservableVector3 = new ObservableVector3(() => { this.onChanged() }, 1, 1, 1);
    public _eulerAngles: Vector3 = new Vector3(0, 0, 0);

    public get position(): Vector3 { return this._position };
    public set position(value: Vector3) { this._position.copy(value); this.onChanged(); };

    public get rotation(): Quaternion { return this._rotation };
    public set rotation(value: Quaternion) { this._rotation.copy(value); this.onChanged(); };

    public get scale(): Vector3 { return this._scale };
    public set scale(value: Vector3) { this._scale.copy(value); this.onChanged(); };

    private onChanged() {
        EventSystem.emit("CallUpdate", this, true);
    }

    private UpdateMatrices() {
        this._localToWorldMatrix.compose(this.position, this.rotation, this.scale);
        this._worldToLocalMatrix.copy(this._localToWorldMatrix).invert();
    }

    public Update() {
        this.UpdateMatrices();
        EventSystem.emit("CallUpdate", this, false);
    }

    public LookAt(target: Vector3): void {
        this.rotation.lookAt(this.position, target, this.up);
        this.onChanged();
    }
}