import {
    Component,
    Components,
    GameObject,
    GPU,
    Input,
    Mathf,
    MouseCodes,
} from "@trident/core";

const _v = new Mathf.Vector3();

export class OrbitControls extends Component {
    public static type = "@trident/plugins/OrbitControls";

    public readonly center = new Mathf.Vector3();

    public orbitSpeed = 0.01;
    public panSpeed = 1;
    public zoomSpeed = 0.1;

    public enableZoom = true;
    public enablePan = true;

    public minRadius = 0;
    public maxRadius = Infinity;

    public minTheta = -Infinity;
    public maxTheta = Infinity;

    public minPhi = -Math.PI;
    public maxPhi = Math.PI;

    private camera: Components.Camera;
    private theta = 0;
    private phi = 0;

    constructor(gameObject: GameObject) {
        super(gameObject);
    }

    public Start(): void {
        this.camera = this.gameObject.GetComponent(Components.Camera) ?? Components.Camera.mainCamera;

        if (!this.camera) {
            throw new Error("OrbitControls requires a Camera component or Components.Camera.mainCamera.");
        }

        this.camera.transform.LookAt(this.center);

        if (GPU.Renderer.canvas) {
            GPU.Renderer.canvas.tabIndex = 0;
            GPU.Renderer.canvas.style.cursor = "grab";
            GPU.Renderer.canvas.style.touchAction = "none";
        }
    }

    public Update(): void {
        if (!this.camera) return;

        const deltaX = Input.GetAxis("Mouse X");
        const deltaY = Input.GetAxis("Mouse Y");

        if (Input.GetMouseButton(MouseCodes.MOUSE_RIGHT)) {
            this.setCursor("grabbing");
            this.orbit(deltaX, deltaY);
        }
        else if (this.enablePan && Input.GetMouseButton(MouseCodes.MOUSE_MIDDLE)) {
            this.setCursor("grabbing");
            this.pan(deltaX, deltaY);
        }
        else {
            this.setCursor("grab");
        }

        const scroll = Input.GetAxis("Mouse ScrollWheel");
        if (this.enableZoom && scroll !== 0) {
            this.zoom(1 - scroll * this.zoomSpeed);
        }
    }

    private zoom(scale: number): void {
        const offset = this.camera.transform.position.clone().sub(this.center);
        const radius = offset.length();

        if (radius <= 0) return;

        const nextRadius = Math.min(this.maxRadius, Math.max(this.minRadius, radius * scale));

        offset.normalize().mul(nextRadius);

        this.camera.transform.position.copy(this.center).add(offset);
        this.camera.transform.LookAt(this.center);
    }

    private orbit(deltaX: number, deltaY: number): void {
        if (deltaX === 0 && deltaY === 0) return;

        const distance = this.camera.transform.position.distanceTo(this.center);

        this.theta -= deltaX * this.orbitSpeed;
        this.phi -= deltaY * this.orbitSpeed;

        this.theta = Math.min(this.maxTheta, Math.max(this.minTheta, this.theta));
        this.phi = Math.min(this.maxPhi, Math.max(this.minPhi, this.phi));

        const rotation = new Mathf.Quaternion().setFromEuler(new Mathf.Vector3(this.phi, this.theta, 0));
        const position = new Mathf.Vector3(0, 0, distance).applyQuaternion(rotation).add(this.center);

        this.camera.transform.rotation.copy(rotation);
        this.camera.transform.position.copy(position);
    }

    private pan(deltaX: number, deltaY: number): void {
        if (deltaX === 0 && deltaY === 0) return;

        const radius = this.camera.transform.position.clone().sub(this.center).length();
        const height = Math.max(1, GPU.Renderer.height || GPU.Renderer.canvas?.clientHeight || 1);
        const panScale = this.panSpeed * radius / height;

        const offset = _v.set(-deltaX, deltaY, 0).applyQuaternion(this.camera.transform.rotation).mul(panScale);

        this.center.add(offset);
        this.camera.transform.position.add(offset);
    }

    private setCursor(cursor: string): void {
        if (!GPU.Renderer.canvas) return;
        GPU.Renderer.canvas.style.cursor = cursor;
    }

    public Destroy(): void {
        this.setCursor("default");
        super.Destroy();
    }
}