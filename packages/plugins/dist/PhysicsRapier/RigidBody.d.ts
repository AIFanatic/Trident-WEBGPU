import { GameObject } from "../../GameObject";
import { Component } from "../../components/Component";
export declare class RigidBody extends Component {
    private rigidBody;
    private rigidBodyDesc;
    constructor(gameObject: GameObject);
    Create(type: "fixed" | "dynamic" | "kinematicVelocity" | "kinematicPosition"): void;
    Update(): void;
}
//# sourceMappingURL=RigidBody.d.ts.map