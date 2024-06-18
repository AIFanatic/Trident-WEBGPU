import { Color } from "../math/Color";
import { Matrix4 } from "../math/Matrix4";
import { DepthTexture, RenderTexture } from "../renderer/Texture";
import { Renderer } from "../renderer/Renderer";
import { Component } from "./Component";

export class Camera extends Component {
    public renderTarget: RenderTexture | null = null;
    public depthTarget: DepthTexture | null = null;

    public backgroundColor: Color = new Color(0.0, 0.0, 0.0, 1);

    public projectionMatrix = new Matrix4();

    public viewMatrix = new Matrix4();

    public static mainCamera: Camera;

    public SetPerspective(fov: number, aspect: number, near: number, far: number) {
        this.projectionMatrix.perspective(fov, aspect, near, far).transpose();
    }

    public SetOrthographic(left: number, right: number, top: number, bottom: number, near: number, far: number) {
        this.projectionMatrix.orthogonal(left, right, top, bottom, near, far);
    }
    
    public Start() {
        if (Camera.mainCamera === this) this.depthTarget = DepthTexture.Create(Renderer.width, Renderer.height, 1);
    }

    public Update() {
        // this.projectionMatrix.perspective(this.fov, this.aspect, this.near, this.far).transpose();
        this.viewMatrix.copy(this.transform.worldToLocalMatrix)
    }
}