import { Component } from "../../components/Component";
import RAPIER from "./rapier/rapier";
export declare class PhysicsRapier extends Component {
    static hasLoaded: boolean;
    static Physics: typeof RAPIER;
    static PhysicsWorld: RAPIER.World;
    Load(): Promise<boolean>;
    Update(): void;
}
//# sourceMappingURL=PhysicsRapier.d.ts.map