import { Color } from "../math/Color";
import { Matrix4 } from "../math/Matrix4";
import { DepthTexture, RenderTexture } from "../renderer/Texture";
import { Renderer } from "../renderer/Renderer";
import { Component } from "./Component";

export class Camera extends Component {
    public renderTarget: RenderTexture | null = null;
    public depthTarget: DepthTexture | null = null;

    public backgroundColor: Color = new Color(0.2, 0.2, 0.2, 1);

    public fov = 60;
    public aspect = 1;
    public near = 0.3;
    public far = 100000;

    public projectionMatrix = new Matrix4();

    public viewMatrix = new Matrix4();

    public static mainCamera: Camera;
    
    public Start() {
        if (Camera.mainCamera === this) this.depthTarget = DepthTexture.Create(Renderer.width, Renderer.height);
    }

    public Update() {
        this.projectionMatrix.perspective(this.fov, this.aspect, this.near, this.far).transpose();
        this.viewMatrix.copy(this.transform.worldToLocalMatrix)
    }
}