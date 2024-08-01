import { EventSystem } from "../Events";
import { GameObject } from "../GameObject";
import { Utils } from "../utils/Utils";
import { Transform } from "./Transform";

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
        if (this.constructor.prototype.Update !== Component.prototype.Update) EventSystem.emit("CallUpdate", this, true);

        EventSystem.emit("AddedComponent", this, this.gameObject.scene);
    }

    public Start() {}
    public Update() {}
    public LateUpdate() {}
}