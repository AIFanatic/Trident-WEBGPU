import { Camera } from "../../components/Camera";
import { Component } from "../../components/Component";
import { RigidBody } from "./RigidBody";
import { Collider } from "./colliders/Collider";
export declare enum CharacterState {
    GROUNDED = 0,
    MOVING = 1,
    RUNNING = 2,
    JUMPING = 3,
    FALLING = 4,
    NOCLIP = 5
}
export declare class FirstPersonController extends Component {
    camera: Camera;
    collider: Collider;
    rigidbody: RigidBody;
    speed: number;
    boostMultiplier: number;
    orbitSpeed: number;
    rayDistance: number;
    private v;
    private keysPressed;
    private mouse;
    private line;
    private target;
    state: CharacterState;
    private floorY;
    Start(): Promise<void>;
    private GroundRayCast;
    private CanMove;
    private SetPosition;
    private HandleMovement;
    private HandleNoClip;
    Update(): void;
}
//# sourceMappingURL=FirstPersonController.d.ts.map