import { Component, Components } from "@trident/core";
import { Transform } from "@trident/core/components/Transform";
import { Mathf } from "@trident/core";
import { PhysicsRapier } from "./PhysicsRapier";
import { RigidBody } from "./RigidBody";
import { Collider } from "./colliders/Collider";

export enum CharacterState {
    GROUNDED,
    MOVING,
    RUNNING,
    JUMPING,
    FALLING,
    NOCLIP
}

export class FirstPersonController extends Component {
    public camera: Components.Camera;
    public collider: Collider;
    public rigidbody: RigidBody;
    public speed = 5;
    public boostMultiplier = 10;
    public orbitSpeed = 0.01;
    public rayDistance = 1;
    public playHeight = 1.80;

    private v = new Mathf.Vector3();
    private keysPressed = {
        forward: false,
        backward: false,
        left: false,
        right: false,
        boost: false,
        up: false,
        down: false,
        jump: false,
        noclip: false
    }
    private mouse = { deltaX: 0, deltaY: 0, left: false };


    private target: Transform;

    public state: CharacterState = CharacterState.FALLING;

    public async Start() {
        if (!this.camera) throw Error("Camera parameter not set");

        const collider = this.gameObject.GetComponent(Collider);
        if (!collider) throw Error("FirstPersonController needs a collider attached to it");
        this.collider = collider;

        const rigidbody = this.gameObject.GetComponent(RigidBody);
        if (!rigidbody) throw Error("FirstPersonController needs a rigidbody attached to it");
        this.rigidbody = rigidbody;
        this.camera.transform.position.copy(this.transform.position);

        this.rigidbody.rigidBody.lockRotations(true, true)
        
        document.addEventListener("keydown", event => {
            if (event.key === "w") this.keysPressed.forward = true;
            if (event.key === "s") this.keysPressed.backward = true;
            if (event.key === "a") this.keysPressed.left = true;
            if (event.key === "d") this.keysPressed.right = true;
            if (event.key === "q") this.keysPressed.up = true;
            if (event.key === "e") this.keysPressed.down = true;
            if (event.key === " ") this.keysPressed.jump = true;
            if (event.key === "n") this.keysPressed.noclip = true;
            if (event.key === "Shift") this.keysPressed.boost = true;
        })
        document.addEventListener("keyup", event => {
            if (event.key === "w") this.keysPressed.forward = false;
            if (event.key === "s") this.keysPressed.backward = false;
            if (event.key === "a") this.keysPressed.left = false;
            if (event.key === "d") this.keysPressed.right = false;
            if (event.key === "q") this.keysPressed.up = false;
            if (event.key === "e") this.keysPressed.down = false;
            if (event.key === " ") this.keysPressed.jump = false;
            if (event.key === "n") this.keysPressed.noclip = false;
            if (event.key === "Shift") this.keysPressed.boost = false;
        })

        document.addEventListener("mousedown", event => { 
            if (!(event.target instanceof HTMLCanvasElement)) return
            document.body.requestPointerLock();
            this.mouse.left = true;
        });

        document.addEventListener("mouseup", event => {
            document.exitPointerLock();
            this.mouse.left = false;
        });

        document.addEventListener("mousemove", event => {
            if (this.mouse.left === false) return;

            this.mouse.deltaX -= event.movementX * this.orbitSpeed;
            this.mouse.deltaY -= event.movementY * this.orbitSpeed;
            this.camera.transform.rotation.fromEuler(new Mathf.Vector3(this.mouse.deltaY, this.mouse.deltaX, 0));
        })

        this.target = this.transform;
    }

    private GroundRayCast() {
        // if (this.state === CharacterState.NOCLIP) return;

        const direction = this.target.up.clone().mul(-1);
        const from = this.target.position.clone();
        // const to = from.clone().add(direction.clone().mul(this.rayDistance));
        // this.line.SetFrom(from);
        // this.line.SetTo(to);

        let ray = new PhysicsRapier.Physics.Ray(from, direction);
        let hit = PhysicsRapier.PhysicsWorld.castRay(ray, this.rayDistance + 2, true, undefined, undefined, this.collider.collider);

        if (hit !== null) {
            this.state = CharacterState.GROUNDED;
            this.floorY = ray.pointAt(hit.timeOfImpact).y;
            return;   
        }
        this.state = CharacterState.FALLING;
    }

    private CanMove(): boolean {
        return (
            this.state == CharacterState.GROUNDED ||
            this.state == CharacterState.MOVING ||
            this.state == CharacterState.RUNNING
        );
    }

    private SetPosition(position: Mathf.Vector3) {
        // this.transform.position.copy(position);
        // this.rigidbody.rigidBody.setNextKinematicTranslation(position);
        // this.rigidbody.rigidBody.setLinvel(position);
        this.camera.transform.position.copy(position).add(new Mathf.Vector3(0, 1, 0));
    }

    private HandleMovement() {
        // if (!this.CanMove() && this.state !== CharacterState.NOCLIP) {
        //     const g = new Mathf.Vector3(PhysicsRapier.PhysicsWorld.gravity.x, PhysicsRapier.PhysicsWorld.gravity.y, PhysicsRapier.PhysicsWorld.gravity.z);
        //     const p = this.target.position.clone().add(g.mul(1/60));
        //     this.SetPosition(p);
        //     return;
        // }

        let speed = this.speed;
        this.v.set(0,0,0);
        if (this.keysPressed.forward === true) this.v.z = -1;
        if (this.keysPressed.backward === true) this.v.z = 1;
        if (this.keysPressed.right === true) this.v.x = 1;
        if (this.keysPressed.left === true) this.v.x = -1;
        if (this.keysPressed.up === true) this.v.y = 1;
        if (this.keysPressed.down === true) this.v.y = -1;
        if (this.keysPressed.boost === true) speed = this.boostMultiplier;
        
        this.v.applyQuaternion(this.camera.transform.rotation);


        const forward = this.keysPressed.forward ? 1: 0;
        const backward = this.keysPressed.backward ? 1: 0;
        const left = this.keysPressed.left ? 1: 0;
        const right = this.keysPressed.right ? 1: 0;
        const r = this.rigidbody.rigidBody;
        const velocity = r.linvel()
        // update camera
        // state.camera.position.set(...ref.current.translation())
        // movement
        const frontVector = new Mathf.Vector3(0, 0, backward - forward)
        const sideVector = new Mathf.Vector3(left - right, 0, 0)
        const direction = this.v.mul(speed);
        r.setLinvel({ x: direction.x, y: velocity.y, z: direction.z }, true);
        // jumping
        const p = r.translation();
        const ray = new PhysicsRapier.Physics.Ray(p, { x: 0, y: -1, z: 0 });
        const rayHit = PhysicsRapier.PhysicsWorld.castRay(ray, this.rayDistance + 2, true, undefined, undefined, this.collider.collider);

        const grounded = rayHit && rayHit.collider && Math.abs(rayHit.timeOfImpact) <= 1.75
        if (this.keysPressed.jump && grounded) r.setLinvel({ x: 0, y: 7.5, z: 0 }, true);

        this.transform.position.set(p.x, p.y, p.z);
        this.camera.transform.position.set(p.x, p.y, p.z).add(new Mathf.Vector3(0, -1.5 + this.playHeight, 0));
    }

    private HandleNoClip() {
        if (this.keysPressed.noclip === true) {
            if (this.state === CharacterState.NOCLIP) this.state = CharacterState.FALLING;
            else this.state = CharacterState.NOCLIP;
            console.log(this.state)
        }
    }
    public Update(): void {
        this.GroundRayCast();
        this.HandleNoClip();
        this.HandleMovement();
    }
}