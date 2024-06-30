import { Vector3 } from "./Vector3";

export class AABB {
    public min: Vector3;
    public max: Vector3;

	constructor(min = new Vector3(+Infinity, +Infinity, +Infinity), max = new Vector3(-Infinity, -Infinity, -Infinity)) {
		this.min = min;
		this.max = max;
	}

	public ExpandByVector(vector: Vector3) {
		this.min.sub(vector);
		this.max.add(vector);

		return this;
	}

    public ExpandByPoint(vector: Vector3) {
		this.min.min(vector);
		this.max.max(vector);

		return this;
	}

    public static FromVertexArray(vertexArray: Float32Array): AABB {
        const aabb = new AABB();
        const tempVector = new Vector3();
        for (let i = 0; i < vertexArray.length; i+=3) {
            tempVector.set(vertexArray[i + 0], vertexArray[i + 1], vertexArray[i + 2]);
            aabb.ExpandByPoint(tempVector);
            
        }
        return aabb;
    }
}