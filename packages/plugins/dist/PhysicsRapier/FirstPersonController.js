import { Camera } from "../../components/Camera";
import { Component } from "../../components/Component";
import { Vector3 } from "../../math/Vector3";
import { Line } from "../Line";
import { PhysicsRapier } from "./PhysicsRapier";
import { RigidBody } from "./RigidBody";
import { Collider } from "./colliders/Collider";
export var CharacterState;
(function (CharacterState) {
    CharacterState[CharacterState["GROUNDED"] = 0] = "GROUNDED";
    CharacterState[CharacterState["MOVING"] = 1] = "MOVING";
    CharacterState[CharacterState["RUNNING"] = 2] = "RUNNING";
    CharacterState[CharacterState["JUMPING"] = 3] = "JUMPING";
    CharacterState[CharacterState["FALLING"] = 4] = "FALLING";
    CharacterState[CharacterState["NOCLIP"] = 5] = "NOCLIP";
})(CharacterState || (CharacterState = {}));
export class FirstPersonController extends Component {
    camera;
    collider;
    rigidbody;
    speed = 5;
    boostMultiplier = 10;
    orbitSpeed = 0.01;
    rayDistance = 1;
    v = new Vector3();
    keysPressed = {
        forward: false,
        backward: false,
        left: false,
        right: false,
        boost: false,
        up: false,
        down: false,
        jump: false,
        noclip: false
    };
    mouse = { deltaX: 0, deltaY: 0, left: false };
    line;
    target;
    state = CharacterState.NOCLIP;
    floorY = 0;
    async Start() {
        if (!this.camera)
            throw Error("Camera parameter not set");
        const collider = this.gameObject.GetComponent(Collider);
        if (!collider)
            throw Error("FirstPersonController needs a collider attached to it");
        this.collider = collider;
        const rigidbody = this.gameObject.GetComponent(RigidBody);
        if (!rigidbody)
            throw Error("FirstPersonController needs a rigidbody attached to it");
        this.rigidbody = rigidbody;
        this.camera.transform.position.copy(this.transform.position);
        document.addEventListener("keydown", event => {
            if (event.key === "w")
                this.keysPressed.forward = true;
            if (event.key === "s")
                this.keysPressed.backward = true;
            if (event.key === "a")
                this.keysPressed.left = true;
            if (event.key === "d")
                this.keysPressed.right = true;
            if (event.key === "q")
                this.keysPressed.up = true;
            if (event.key === "e")
                this.keysPressed.down = true;
            if (event.key === " ")
                this.keysPressed.jump = true;
            if (event.key === "n")
                this.keysPressed.noclip = true;
            if (event.key === "Shift")
                this.keysPressed.boost = true;
        });
        document.addEventListener("keyup", event => {
            if (event.key === "w")
                this.keysPressed.forward = false;
            if (event.key === "s")
                this.keysPressed.backward = false;
            if (event.key === "a")
                this.keysPressed.left = false;
            if (event.key === "d")
                this.keysPressed.right = false;
            if (event.key === "q")
                this.keysPressed.up = false;
            if (event.key === "e")
                this.keysPressed.down = false;
            if (event.key === " ")
                this.keysPressed.jump = false;
            if (event.key === "n")
                this.keysPressed.noclip = false;
            if (event.key === "Shift")
                this.keysPressed.boost = false;
        });
        document.addEventListener("mousedown", event => {
            if (!(event.target instanceof HTMLCanvasElement))
                return;
            document.body.requestPointerLock();
            this.mouse.left = true;
        });
        document.addEventListener("mouseup", event => {
            document.exitPointerLock();
            this.mouse.left = false;
        });
        document.addEventListener("mousemove", event => {
            if (this.mouse.left === false)
                return;
            this.mouse.deltaX -= event.movementX * this.orbitSpeed;
            this.mouse.deltaY -= event.movementY * this.orbitSpeed;
            this.camera.transform.rotation.fromEuler(new Vector3(this.mouse.deltaY, this.mouse.deltaX, 0));
        });
        const scene = Camera.mainCamera.gameObject.scene;
        this.line = new Line(scene, new Vector3(0, 0, 0), new Vector3(0, 0, 0));
        // Temp
        this.target = this.transform;
    }
    GroundRayCast() {
        if (this.state === CharacterState.NOCLIP)
            return;
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
    CanMove() {
        return (this.state == CharacterState.GROUNDED ||
            this.state == CharacterState.MOVING ||
            this.state == CharacterState.RUNNING);
    }
    SetPosition(position) {
        this.transform.position.copy(position);
        this.rigidbody.rigidBody.setNextKinematicTranslation(position);
        this.camera.transform.position.copy(position).add(new Vector3(0, 1, 0));
    }
    HandleMovement() {
        if (!this.CanMove() && this.state !== CharacterState.NOCLIP) {
            const g = new Vector3(PhysicsRapier.PhysicsWorld.gravity.x, PhysicsRapier.PhysicsWorld.gravity.y, PhysicsRapier.PhysicsWorld.gravity.z);
            const p = this.target.position.clone().add(g.mul(1 / 60));
            this.SetPosition(p);
            return;
        }
        let speed = this.speed;
        this.v.set(0, 0, 0);
        if (this.keysPressed.forward === true)
            this.v.z = -1;
        if (this.keysPressed.backward === true)
            this.v.z = 1;
        if (this.keysPressed.right === true)
            this.v.x = 1;
        if (this.keysPressed.left === true)
            this.v.x = -1;
        if (this.keysPressed.up === true)
            this.v.y = 1;
        if (this.keysPressed.down === true)
            this.v.y = -1;
        if (this.keysPressed.boost === true)
            speed = this.boostMultiplier;
        this.v.applyQuaternion(this.camera.transform.rotation);
        const dt = 1 / 60;
        const movement = new Vector3(this.v.x, this.v.y, this.v.z);
        movement.normalize().mul(dt * speed);
        const p = this.transform.position.clone().add(movement);
        if (this.state !== CharacterState.NOCLIP) {
            p.y = this.floorY + this.rayDistance;
            if (this.keysPressed.boost === true)
                this.state = CharacterState.RUNNING;
            else
                this.state = CharacterState.MOVING;
        }
        this.SetPosition(p);
    }
    HandleNoClip() {
        if (this.keysPressed.noclip === true) {
            if (this.state === CharacterState.NOCLIP)
                this.state = CharacterState.FALLING;
            else
                this.state = CharacterState.NOCLIP;
            console.log(this.state);
        }
    }
    Update() {
        this.GroundRayCast();
        this.HandleNoClip();
        this.HandleMovement();
    }
}
