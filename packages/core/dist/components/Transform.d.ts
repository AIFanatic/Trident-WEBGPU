import { Matrix4 } from "../math/Matrix4";
import { Quaternion } from "../math/Quaternion";
import { Vector3 } from "../math/Vector3";
import { Component } from "./Component";
export declare class TransformEvents {
    static Updated: () => void;
}
export declare class Transform extends Component {
    private tempRotation;
    up: Vector3;
    forward: Vector3;
    right: Vector3;
    private _localToWorldMatrix;
    private _worldToLocalMatrix;
    get localToWorldMatrix(): Matrix4;
    get worldToLocalMatrix(): Matrix4;
    private _position;
    private _rotation;
    private _scale;
    private _eulerAngles;
    get position(): Vector3;
    set position(value: Vector3);
    get rotation(): Quaternion;
    set rotation(value: Quaternion);
    get eulerAngles(): Vector3;
    set eulerAngles(value: Vector3);
    get scale(): Vector3;
    set scale(value: Vector3);
    private children;
    private _parent;
    get parent(): Transform | null;
    set parent(parent: Transform | null);
    private onEulerChanged;
    private onChanged;
    private UpdateMatrices;
    Update(): void;
    LookAt(target: Vector3): void;
    LookAtV1(target: Vector3): void;
}
//# sourceMappingURL=Transform.d.ts.map