import { Vector3 } from "./Vector3";
export class Plane {
    normal;
    constant;
    constructor(normal = new Vector3(1, 0, 0), constant = 0) {
        this.normal = normal;
        this.constant = constant;
    }
    setComponents(x, y, z, w) {
        this.normal.set(x, y, z);
        this.constant = w;
        return this;
    }
    normalize() {
        const inverseNormalLength = 1.0 / this.normal.length();
        this.normal.mul(inverseNormalLength);
        this.constant *= inverseNormalLength;
        return this;
    }
}
