import { Components } from "@trident/core";
import { VBuffer } from "../Heap";

// This shouldnt be like this but, clean later
export class BindlessCamera {
    private static _record?: VBuffer;

    public static get record(): VBuffer {
        if (!this._record) this._record = new VBuffer(32);
        return this._record;
    }

    public static Update(camera: Components.Camera) {
        this.record.SetArray(camera.projectionMatrix.elements, 0);
        this.record.SetArray(camera.viewMatrix.elements, 16);
    }
}
