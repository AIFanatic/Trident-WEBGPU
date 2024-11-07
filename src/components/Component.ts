import { EventSystem } from "../Events";
import { GameObject } from "../GameObject";
import { Scene } from "../Scene";
import { Utils } from "../utils/Utils";
import { Transform } from "./Transform";

export class ComponentEvents {
    public static CallUpdate = (component: Component, shouldUpdate: boolean) => {};
    public static AddedComponent = (component: Component, scene: Scene) => {};
    public static RemovedComponent = (component: Component, scene: Scene) => {};
}

export class Component {
    public id = Utils.UUID();
    public enabled: boolean = true;
    public hasStarted: boolean = false;
    public name: string;

    public readonly gameObject: GameObject;
    public readonly transform: Transform;

    constructor(gameObject: GameObject) {
        this.gameObject = gameObject;
        this.transform = gameObject.transform;
        this.name = this.constructor.name;

        if (this.gameObject.scene.hasStarted) this.Start();
        if (this.constructor.prototype.Update !== Component.prototype.Update) EventSystem.emit(ComponentEvents.CallUpdate, this, true);

        EventSystem.emit(ComponentEvents.AddedComponent, this, this.gameObject.scene);
    }

    public Start() {}
    public Update() {}
    public LateUpdate() {}
    public Destroy() {}
}