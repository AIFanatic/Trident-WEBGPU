import { GameObject } from "../GameObject";
import { Scene } from "../Scene";
import { Transform } from "./Transform";
export declare class ComponentEvents {
    static CallUpdate: (component: Component, shouldUpdate: boolean) => void;
    static AddedComponent: (component: Component, scene: Scene) => void;
    static RemovedComponent: (component: Component, scene: Scene) => void;
}
export declare class Component {
    id: string;
    enabled: boolean;
    hasStarted: boolean;
    name: string;
    readonly gameObject: GameObject;
    readonly transform: Transform;
    constructor(gameObject: GameObject);
    Start(): void;
    Update(): void;
    LateUpdate(): void;
    Destroy(): void;
}
