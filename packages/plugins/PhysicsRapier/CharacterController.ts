import { Component, Components, Mathf, GPU, GameObject, Input, KeyCodes, SerializeField, MouseCodes } from "@trident/core";
import { PhysicsRapier } from "@trident/plugins/PhysicsRapier/PhysicsRapier";
import { RigidBody, RigidbodyConstraints } from "@trident/plugins/PhysicsRapier/RigidBody";

export enum State {
    Idle,
    Walking,
    Running,
    Jumping,
    Falling,
}

class AnimationIds {
    @SerializeField public idle: number = -1;
    @SerializeField public walk: number = -1;
    @SerializeField public sprint: number = -1;
    @SerializeField public jump: number = -1;
    @SerializeField public fall: number = -1;
    @SerializeField public fire: number = -1;
    @SerializeField public reload: number = -1;
}

enum CharacterType {
    FirstPerson,
    ThirdPerson,
}

export class CharacterController extends Component {
    public static type = "@trident/plugins/CharacterController/CharacterController";

    @SerializeField(GameObject) public player: GameObject;
    @SerializeField(AnimationIds) public _animationIDS = new AnimationIds();
    @SerializeField public speed = 8.13;          // 320 HU/s converted to meters
    @SerializeField public boostMultiplier = 1;
    @SerializeField public orbitSpeed = 0.01;
    @SerializeField public rayDistance = 1.75;
    @SerializeField public playHeight = 1.80;

    @SerializeField public maxSpeed = 8.13;
    @SerializeField public airAccelerate = 800;   // change to 800 for easy surf
    @SerializeField public groundAccelerate = 10;
    @SerializeField public groundFriction = 4;
    @SerializeField public jumpSpeed = 6.86;      // 270 HU/s converted to meters
    @SerializeField public blendRotation = 0.15;
    @SerializeField public animationSpeedRatio = 1;
    @SerializeField public fireRateMs = 100;
    @SerializeField(CharacterType) public characterType: CharacterType = CharacterType.FirstPerson;

    public state: State = State.Idle;
    public move = new Mathf.Vector2();
    public isAiming = false;
    public isFiring = false;

    private _controller: RigidBody;
    private _animator: Components.Animator;
    private _model: GameObject;
    private _mainCamera: Components.Camera;

    private look = new Mathf.Vector2();
    private jump = false;
    private sprint = false;
    private isGrounded = false;
    private isReloading = false;

    private currentAnimation = -1;
    private animLockUntil = 0;
    private lastFireTime = 0;

    private v = new Mathf.Vector3();
    private groundPoint = new Mathf.Vector3();
    private time = 0;
    private currentRotation = 0;
    private yaw = 0;
    private pitch = 0;

    public Start() {
        if (!this.player) throw Error("No player attached");

        this._controller = this.player.GetComponentsInChildren(RigidBody)[0] as RigidBody;
        this._animator = this.player.GetComponentsInChildren(Components.Animator)[0] as Components.Animator;
        this._model = this.player;
        this._mainCamera = this.player.GetComponentsInChildren(Components.Camera)[0] as Components.Camera;

        if (!this._controller) console.warn("CharacterController needs a Rigidbody, found none");
        if (!this._animator) console.warn("CharacterController needs an Animator, found none");
        if (!this._mainCamera) console.warn("CharacterController needs a Camera, found none");

        if (this._controller) this._controller.constraints = RigidbodyConstraints.FreezeRotation;
        Components.Camera.mainCamera = this._mainCamera;
    }

    public Update() {
        if (!this.IsValid()) return;

        if (Input.GetMouseButtonDown(MouseCodes.MOUSE_LEFT) && !Input.isPointerLocked) {
            Input.LockPointer();
        }

        this.UpdateInput();
        this.GroundedCheck();

        if (!this._controller.isKinematic) {
            this.Move();
            this.CameraRotation();
        }
        this.UpdateState();
        this.UpdateAnimation();
    }

    private IsValid(): boolean {
        return !!(this.player && this._controller && this._animator && this._model && this._mainCamera && this._animationIDS);
    }

    private UpdateInput() {
        this.move.x = (Input.GetKey(KeyCodes.D) ? 1 : 0) - (Input.GetKey(KeyCodes.A) ? 1 : 0);
        this.move.y = (Input.GetKey(KeyCodes.W) ? 1 : 0) - (Input.GetKey(KeyCodes.S) ? 1 : 0);
        this.jump = Input.GetKey(KeyCodes.SPACE);
        this.sprint = Input.GetKey(KeyCodes.SHIFT);
        this.look.x = -Input.GetAxis("Horizontal");
        this.look.y = -Input.GetAxis("Vertical");

        this.isAiming = Input.isPointerLocked && Input.GetMouseButton(MouseCodes.MOUSE_RIGHT);
        this.isFiring = Input.isPointerLocked && Input.GetMouseButton(MouseCodes.MOUSE_LEFT);
        this.isReloading = Input.GetKey(KeyCodes.R);
    }

    private UpdateState() {
        const isMoving = this.move.length() > 1e-5;

        if (this.isGrounded && isMoving && this.sprint) this.state = State.Running;
        else if (this.isGrounded && isMoving) this.state = State.Walking;
        else if (this.isGrounded) this.state = State.Idle;
        else if (this.jump) this.state = State.Jumping;
    }

    private UpdateAnimation() {
        const now = performance.now();

        // One-shot in progress — don't touch the animator.
        if (now < this.animLockUntil) return;

        const ids = this._animationIDS;

        // Reload: full duration, uninterruptible.
        if (this.isReloading && ids.reload >= 0 && this.currentAnimation !== ids.reload) {
            this._animator.CrossFadeTo(ids.reload, 0.1);
            this.currentAnimation = ids.reload;
            this.animLockUntil = now + this.ClipDurationMs(ids.reload);
            return;
        }

        // Fire: cadence governed by fireRateMs, not clip length.
        if (this.isFiring && ids.fire >= 0 && now - this.lastFireTime > this.fireRateMs) {
            this._animator.SetClipByIndex(ids.fire);
            this.currentAnimation = ids.fire;
            this.lastFireTime = now;
            this.animLockUntil = now + this.fireRateMs;
            return;
        }

        // Continuous states.
        let clip = -1;
        if (this.state === State.Idle) clip = ids.idle;
        else if (this.state === State.Walking) clip = ids.walk;
        else if (this.state === State.Running) clip = ids.sprint;
        else if (this.state === State.Jumping) clip = ids.jump;

        if (clip !== -1 && clip !== this.currentAnimation) {
            this._animator.CrossFadeTo(clip, 0.25);
            this.currentAnimation = clip;
        }
    }

    private ClipDurationMs(index: number): number {
        const clip = this._animator.clips[index];
        return clip ? clip.duration * 1000 : 200;
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

    private Move() {
        const rigidbody = this._controller.rigidBody;
        const dt = 1 / 64;

        const current = rigidbody.linvel();

        const vel = new Mathf.Vector3(
            current.x,
            current.y,
            current.z
        );

        // Input direction.
        const wishDir = new Mathf.Vector3(this.move.x, 0, -this.move.y);

        if (wishDir.length() > 1e-5) {
            wishDir.normalize();

            // Rotate by camera yaw only.
            const yawQuat = new Mathf.Quaternion().setFromEuler(
                new Mathf.Vector3(0, this.yaw, 0)
            );

            wishDir.applyQuaternion(yawQuat);
            wishDir.y = 0;

            if (wishDir.length() > 1e-5) {
                wishDir.normalize();
            }
        }

        const wishSpeed = this.maxSpeed;

        // Treat steep/uncertain ground as air. This makes surf ramps work.
        const useGroundMove = this.isGrounded && !this.jump && this.time < 1.2;

        if (useGroundMove) {
            // Ground friction.
            const horizontalSpeed = Math.sqrt(vel.x * vel.x + vel.z * vel.z);

            if (horizontalSpeed > 1e-5) {
                const drop = horizontalSpeed * this.groundFriction * dt;
                const newSpeed = Math.max(horizontalSpeed - drop, 0);
                const ratio = newSpeed / horizontalSpeed;

                vel.x *= ratio;
                vel.z *= ratio;
            }

            // Ground acceleration.
            const currentSpeed =
                vel.x * wishDir.x +
                vel.y * wishDir.y +
                vel.z * wishDir.z;

            const addSpeed = wishSpeed - currentSpeed;

            if (addSpeed > 0) {
                let accelSpeed = this.groundAccelerate * wishSpeed * dt;
                if (accelSpeed > addSpeed) accelSpeed = addSpeed;

                vel.x += wishDir.x * accelSpeed;
                vel.y += wishDir.y * accelSpeed;
                vel.z += wishDir.z * accelSpeed;
            }
        } else {
            // Air/surf acceleration.
            const currentSpeed =
                vel.x * wishDir.x +
                vel.y * wishDir.y +
                vel.z * wishDir.z;

            const addSpeed = wishSpeed - currentSpeed;

            if (addSpeed > 0) {
                let accelSpeed = this.airAccelerate * wishSpeed * dt;
                if (accelSpeed > addSpeed) accelSpeed = addSpeed;

                vel.x += wishDir.x * accelSpeed;
                vel.y += wishDir.y * accelSpeed;
                vel.z += wishDir.z * accelSpeed;
            }
        }

        // Jump without killing horizontal momentum.
        if (this.jump && this.isGrounded) {
            vel.y = this.jumpSpeed;
        }

        rigidbody.setLinvel(
            {
                x: vel.x,
                y: vel.y,
                z: vel.z,
            },
            true
        );

        const p = rigidbody.translation();

        this._mainCamera.transform.position
            .set(p.x, p.y + this.playHeight, p.z);

        this._model.transform.position.set(p.x, p.y - 1, p.z);

        if (Math.abs(this.move.x) > Mathf.Epsilon || Math.abs(this.move.y) > Mathf.Epsilon) {
            const targetRotation =
                (Mathf.Atan2(-this.move.x, this.move.y) + this.yaw) * Mathf.Rad2Deg;

            this.currentRotation = Mathf.Lerp(
                this.currentRotation,
                targetRotation,
                this.blendRotation
            );
        }
    }

    private CameraRotation() {
        const minPhi = -Math.PI / 2;
        const maxPhi = Math.PI / 2;
        const distance = this._mainCamera.transform.position.distanceTo(this.transform.position) + 2;

        if (Input.isPointerLocked) {
            this.yaw += this.look.x * this.orbitSpeed;
            this.pitch += this.look.y * this.orbitSpeed;
            this.pitch = Math.min(maxPhi, Math.max(minPhi, this.pitch));
        }

        this._mainCamera.transform.rotation.setFromEuler(new Mathf.Vector3(this.pitch, this.yaw, 0));

        if (this.characterType === CharacterType.FirstPerson) {
            this._mainCamera.transform.position.set(this.transform.position.x, this.transform.position.y + this.playHeight, this.transform.position.z);
        } else {
            this._mainCamera.transform.position.set(0, 0, distance).applyQuaternion(this._mainCamera.transform.rotation).add(this.transform.position);
        }
    }
}