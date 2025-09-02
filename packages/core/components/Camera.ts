import { EventSystem, EventSystemLocal } from "../Events";
import { Frustum } from "../math/Frustum";
import { Color } from "../math/Color";
import { Matrix4 } from "../math/Matrix4";
import { Component } from "./Component";
import { TransformEvents } from "./Transform";
import { SerializeField } from "../utils/SerializeField";

export class CameraEvents {
    public static Updated = (camera: Camera) => {};
}

export class Camera extends Component {
    public backgroundColor: Color = new Color(0.0, 0.0, 0.0, 1);

    public projectionMatrix = new Matrix4();
    public projectionScreenMatrix = new Matrix4();
    // public projectionScreenMatrix.multiplyMatrices( camera.projectionMatrix, camera.matrixWorldInverse )

    public viewMatrix = new Matrix4();
    public frustum: Frustum = new Frustum();

    public static mainCamera: Camera;

    
    private _near: number;
    @SerializeField
    public get near(): number { return this._near; }
    public set near(near: number) { this.SetPerspective(this.fov, this.aspect, near, this.far); }

    private _far: number;
    @SerializeField
    public get far(): number { return this._far; }
    public set far(far: number) { this.SetPerspective(this.fov, this.aspect, this.near, far); }

    private _fov: number;
    @SerializeField
    public get fov(): number { return this._fov; }
    public set fov(fov: number) { this.SetPerspective(fov, this.aspect, this.near, this.far); }

    private _aspect: number;
    @SerializeField
    public get aspect(): number { return this._aspect; }
    public set aspect(aspect: number) { this.SetPerspective(this.fov, aspect, this.near, this.far); }
    
    public SetPerspective(fov: number, aspect: number, near: number, far: number) {
        this._fov = fov;
        this._aspect = aspect;
        this._near = near;
        this._far = far;
        // this.projectionMatrix.perspectiveLH(fov * (Math.PI / 180), aspect, near, far);
        this.projectionMatrix.perspectiveZO(fov * (Math.PI / 180), aspect, near, far);
    }

    public SetOrthographic(left: number, right: number, top: number, bottom: number, near: number, far: number) {
        this.near = near;
        this.far = far;
        this.projectionMatrix.orthoZO(left, right, top, bottom, near, far);
    }
    
    public Start() {
        EventSystemLocal.on(TransformEvents.Updated, this.transform, () => {
            EventSystem.emit(CameraEvents.Updated, this);
        })
    }

    public Update() {
        this.viewMatrix.copy(this.transform.worldToLocalMatrix);
        this.projectionScreenMatrix.multiplyMatrices(this.projectionMatrix, this.transform.worldToLocalMatrix);
        this.frustum.setFromProjectionMatrix(this.projectionScreenMatrix);
    }
}