import { EventSystem, EventSystemLocal } from "../Events";
import { Frustum } from "../math/Frustum";
import { Color } from "../math/Color";
import { Matrix4 } from "../math/Matrix4";
import { Component } from "./Component";
import { TransformEvents } from "./Transform";
import { SerializeField } from "../utils/SerializeField";
import { GameObject } from "../GameObject";

export class CameraEvents {
    public static Updated = (camera: Camera) => {};
}

export class Camera extends Component {
    public static type = "@trident/core/components/Camera";

    @SerializeField
    public backgroundColor: Color = new Color(0.0, 0.0, 0.0, 1);

    public projectionMatrix = new Matrix4();
    public projectionScreenMatrix = new Matrix4();
    public projectionViewMatrix = new Matrix4();

    public viewMatrix = new Matrix4();
    public frustum: Frustum = new Frustum();

    public static mainCamera: Camera;

    constructor(gameObject: GameObject) {
        super(gameObject);
        if (!Camera.mainCamera) Camera.mainCamera = this;
    }

    
    private _near: number = 0.05;
    @SerializeField
    public get near(): number { return this._near; }
    public set near(near: number) { this.SetPerspective(this.fov, this.aspect, near, this.far); }

    private _far: number = 1000;
    @SerializeField
    public get far(): number { return this._far; }
    public set far(far: number) { this.SetPerspective(this.fov, this.aspect, this.near, far); }

    private _fov: number = 60;
    @SerializeField
    public get fov(): number { return this._fov; }
    public set fov(fov: number) { this.SetPerspective(fov, this.aspect, this.near, this.far); }

    private _aspect: number = window.innerWidth / window.innerHeight;
    @SerializeField
    public get aspect(): number { return this._aspect; }
    public set aspect(aspect: number) { this.SetPerspective(this.fov, aspect, this.near, this.far); }
    
    public SetPerspective(fov: number, aspect: number, near: number, far: number) {
        this._fov = fov;
        this._aspect = aspect;
        this._near = near;
        this._far = far;
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
        this.projectionViewMatrix.multiplyMatrices(this.projectionMatrix, this.viewMatrix);
    }
}

Component.Registry.set(Camera.type, Camera);