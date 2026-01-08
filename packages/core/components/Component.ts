import { EventSystem } from "../Events";
import { GameObject } from "../GameObject";
import { Scene } from "../Scene";
import { UUID } from "../utils";
import { Transform } from "./Transform";

export type SerializedComponent = { type: string } & Record<string, unknown>;

export class ComponentEvents {
    public static CallUpdate = (component: Component, shouldUpdate: boolean) => {};
    public static AddedComponent = (component: Component, scene: Scene) => {};
    public static RemovedComponent = (component: Component, scene: Scene) => {};
}

export class Component {
    public static type;
    public id = UUID();
    public enabled: boolean = true;
    public hasStarted: boolean = false;
    public name: string;

    public readonly gameObject: GameObject;
    public readonly transform: Transform;

    public static Registry: Map<string, typeof Component> = new Map();

    constructor(gameObject: GameObject) {
        this.gameObject = gameObject;
        this.transform = gameObject.transform;
        this.name = this.constructor.name;

        if (this.constructor.prototype.Update !== Component.prototype.Update) EventSystem.emit(ComponentEvents.CallUpdate, this, true);

        EventSystem.emit(ComponentEvents.AddedComponent, this, this.gameObject.scene);
    }

    public Start() {}
    public Update() {}
    public Destroy() {}
    public Serialize(metadata: any = {}): SerializedComponent { throw Error(`Serialize not implemented for ${this.constructor.name}`)};
    public Deserialize(data: any) { throw Error(`Deserialize not implemented for ${this.constructor.name}`) }
}