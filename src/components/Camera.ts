import { Color } from "../math/Color";
import { Matrix4 } from "../math/Matrix4";
import { Component } from "./Component";

export class Camera extends Component {
    public backgroundColor: Color = new Color(0.0, 0.0, 0.0, 1);

    public projectionMatrix = new Matrix4();

    public viewMatrix = new Matrix4();

    public static mainCamera: Camera;

    public near: number;
    public far: number;

    public SetPerspective(fov: number, aspect: number, near: number, far: number) {
        this.near = near;
        this.far = far;
        this.projectionMatrix.perspectiveZO(fov, aspect, near, far);
        // this.projectionMatrix.getInfinitePerspectiveMatrix(fov, aspect, near);
    }

    public SetOrthographic(left: number, right: number, top: number, bottom: number, near: number, far: number) {
        this.near = near;
        this.far = far;
        this.projectionMatrix.orthoZO(left, right, top, bottom, near, far);
    }
    
    public Start() {
    }

    public Update() {
        this.viewMatrix.copy(this.transform.worldToLocalMatrix)
    }
}