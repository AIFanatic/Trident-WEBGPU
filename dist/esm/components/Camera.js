import { EventSystem, EventSystemLocal } from "../Events";
import { Color } from "../math/Color";
import { Matrix4 } from "../math/Matrix4";
import { Component } from "./Component";
import { TransformEvents } from "./Transform";
export class CameraEvents {
    static Updated = (camera) => { };
}
export class Camera extends Component {
    backgroundColor = new Color(0.0, 0.0, 0.0, 1);
    projectionMatrix = new Matrix4();
    viewMatrix = new Matrix4();
    static mainCamera;
    fov;
    aspect;
    near;
    far;
    SetPerspective(fov, aspect, near, far) {
        this.fov = fov;
        this.aspect = aspect;
        this.near = near;
        this.far = far;
        // this.projectionMatrix.perspectiveLH(fov * (Math.PI / 180), aspect, near, far);
        this.projectionMatrix.perspectiveZO(fov * (Math.PI / 180), aspect, near, far);
    }
    SetOrthographic(left, right, top, bottom, near, far) {
        this.near = near;
        this.far = far;
        this.projectionMatrix.orthoZO(left, right, top, bottom, near, far);
    }
    Start() {
        EventSystemLocal.on(TransformEvents.Updated, this.transform, () => {
            EventSystem.emit(CameraEvents.Updated, this);
        });
    }
    Update() {
        this.viewMatrix.copy(this.transform.worldToLocalMatrix);
    }
}
//# sourceMappingURL=Camera.js.map