import { Component } from "./components/Component";
import { Scene } from "./Scene";
import { Transform } from "./components/Transform";
export declare class GameObject {
    id: string;
    name: string;
    scene: Scene;
    transform: Transform;
    private componentsArray;
    private componentsMapped;
    constructor(scene: Scene);
    AddComponent<T extends Component>(component: new (...args: any[]) => T): T;
    GetComponent<T extends Component>(type: new (...args: any[]) => T): T | null;
    GetComponents<T extends Component>(type: new (...args: any[]) => T): T[];
    Start(): void;
    Destroy(): void;
}
