import { Component, Components, Mathf, GPU, GameObject, Input, KeyCodes } from "@trident/core";
import { PhysicsRapier } from "./PhysicsRapier";
import { RigidBody } from "./RigidBody";

enum State {
    Idle,
    Walking,
    Running,
    Jumping,
    Falling
};

export class FirstPersonController extends Component {
    public _controller: RigidBody;
    public _model: GameObject;
    public _mainCamera: GameObject;

    public move = new Mathf.Vector2();
    private look = new Mathf.Vector2();
    private jump = false;
    private sprint = false;
    private isPointerLocked = false;
    private isGrounded = false;

    private v = new Mathf.Vector3();

    public speed = 2;
    public boostMultiplier = 5;

    public orbitSpeed = 0.01;
    public rayDistance = 1;
    public playHeight = 1.80;
    public blendRotation = 0.15;

    public animationSpeedRatio = 1;

    private state: State = State.Walking;

    public Start() {
        if (!this._controller) throw Error("No controller attached");
        if (!this._model) throw Error("No model attached");
        if (!this._mainCamera) throw Error("No camera attached");

        GPU.Renderer.canvas.addEventListener("pointerdown", event => {
            if (!this.isPointerLocked) document.body.requestPointerLock();
        })

        document.onpointerlockchange = event => {
            this.isPointerLocked = !this.isPointerLocked;
        }
    }

    public Update() {
        this.UpdateInput();
        this.GroundedCheck();
        this.Move();
        this.CameraRotation();
        const cam = this._mainCamera.GetComponent(Components.Camera);
        if (cam) cam.Update();
        this.UpdateState();
    }

    private UpdateState() {
        const isGrounded = this.isGrounded;
        const isJumping = this.jump;
        const isMoving = this.move.length() > 1e-5;
        const isRunning = this.sprint;

        if (isGrounded === true && !isMoving) this.state = State.Idle;
        else if (isGrounded === true && isMoving) isRunning ? this.state = State.Running : this.state = State.Walking;
        else if (isGrounded === true && isMoving && isRunning) this.state = State.Running;
        else if (isJumping === true) this.state = State.Jumping;
    }
    
    private UpdateInput() {
        this.move.x = (Input.GetKey(KeyCodes.D) ? 1 : 0) - (Input.GetKey(KeyCodes.A) ? 1 : 0);
        this.move.y = (Input.GetKey(KeyCodes.W) ? 1 : 0) - (Input.GetKey(KeyCodes.S) ? 1 : 0);
        this.jump = Input.GetKey(KeyCodes.SPACE);
        this.sprint = Input.GetKey(KeyCodes.SHIFT);
        this.look.x = -Input.GetAxis("Horizontal");
        this.look.y = -Input.GetAxis("Vertical");
    }
    
    private GroundedCheck() {
        const rigidbody = this._controller.rigidBody;
        const p = rigidbody.translation();
        const ray = new PhysicsRapier.Physics.Ray(p, { x: 0, y: -1, z: 0 });
        const rayHit = PhysicsRapier.PhysicsWorld.castRay(ray, this.rayDistance + 2, true, undefined, undefined, undefined, rigidbody);

        this.isGrounded = rayHit && rayHit.collider && Math.abs(rayHit.timeOfImpact) <= 1.75;

        if (rayHit) {
            const groundPoint = ray.pointAt(rayHit.timeOfImpact);
            this.groundPoint.set(groundPoint.x, groundPoint.y, groundPoint.z);
            this.time = rayHit.timeOfImpact;
        }
    }

    private groundPoint = new Mathf.Vector3();
    private time = 0;

    private Move() {
        this.v.set(0, 0, 0);
        this.v.set(this.move.x, 0, -this.move.y);

        this.v.applyQuaternion(this._mainCamera.transform.rotation);

        const rigidbody = this._controller.rigidBody;
        const velocity = rigidbody.linvel()
        const direction = this.v.mul(this.sprint ? this.boostMultiplier : this.speed);
        rigidbody.setLinvel({ x: direction.x, y: velocity.y, z: direction.z }, true);
        // Ground player, helps with slopes
        if (this.isGrounded && !this.jump && this.time > 1.5) {
            const t = rigidbody.translation();
            t.y = this.groundPoint.y + 1.5;
            rigidbody.setTranslation(t, false);
        }

        // jumping
        if (this.jump && this.isGrounded) rigidbody.setLinvel({ x: 0, y: 7.5, z: 0 }, true);

        const p = rigidbody.translation();
        this._mainCamera.transform.position.set(p.x, p.y, p.z).add(new Mathf.Vector3(0, this.playHeight, 0));
        this._model.transform.position.set(p.x, p.y - 1, p.z); // Slighly above player

        // keep/store model rotation
        if (Math.abs(this.move.x) > Mathf.Epsilon || Math.abs(this.move.y) > Mathf.Epsilon) {
            const targetRotation = (Mathf.Atan2(-this.move.x, this.move.y) + this.yaw) * Mathf.Rad2Deg;
            this.currentRotation = Mathf.Lerp(this.currentRotation, targetRotation, this.blendRotation);
            this._model.transform.rotation.setFromEuler(new Mathf.Vector3(0, this.currentRotation, 0), true);
        }
    }
    private currentRotation = 0;

    private yaw = 0;
    private pitch = 0;

    private CameraRotation() {
        const minPhi = -Math.PI / 2;
        const maxPhi = Math.PI / 2;

        if (this.isPointerLocked) {
            this.yaw += this.look.x * this.orbitSpeed;
            this.pitch += this.look.y * this.orbitSpeed;
            this.pitch = Math.min(maxPhi, Math.max(minPhi, this.pitch));
        }

        this._mainCamera.transform.rotation.setFromEuler(new Mathf.Vector3(this.pitch, this.yaw, 0));

        // const currentRot = new Mathf.Quaternion().setFromEuler(new Mathf.Vector3(this.pitch, this.yaw, 0));
        // const q = this._mainCamera.transform.rotation.clone().slerp(currentRot, GPU.Renderer.info.deltaTime / 100);
        // this._mainCamera.transform.rotation.copy(q);
    }
}