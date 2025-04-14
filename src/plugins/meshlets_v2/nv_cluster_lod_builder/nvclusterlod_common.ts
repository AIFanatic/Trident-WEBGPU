import { uvec3, vec3 } from "./nvclusterlod_mesh";

export class Sphere {
    public x: number = 0.0;
    public y: number = 0.0;
    public z: number = 0.0;
    public radius: number = 0.0;

    constructor(x: number = 0, y: number = 0, z: number = 0, radius: number = 0) {
        this.x = x;
        this.y = y;
        this.z = z;
        this.radius = radius;
    }
};

export enum Result {
    SUCCESS = 0,
    ERROR_EMPTY_CLUSTER_GENERATING_GROUPS,
    ERROR_CLUSTERING_FAILED,
    ERROR_NODE_OVERFLOW,
    ERROR_LOD_OVERFLOW,
    ERROR_CLUSTER_COUNT_NOT_DECREASING,
    ERROR_INCONSISTENT_GENERATING_GROUPS,
    ERROR_ADJACENCY_GENERATION_FAILED,
    ERROR_OUTPUT_MESH_OVERFLOW,
    ERROR_CLUSTER_GENERATING_GROUPS_MISMATCH,
    ERROR_EMPTY_ROOT_CLUSTER,
    ERROR_INCONSISTENT_BOUNDING_SPHERES,
    ERROR_HIERARCHY_GENERATION_FAILED,
    ERROR_INVALID_ARGUMENT,
    ERROR_UNSPECIFIED,
};

export function assert(condition) {
    if (condition === false) throw Error("Assert failed");
}

export function resizeArray<T>(arr: T[], newSize: number, createDefaultValue: () => T): T[] {
    if (newSize > arr.length) {
        // Fill new slots with new objects created by calling createDefaultValue
        return [...arr, ...Array.from({ length: newSize - arr.length }, createDefaultValue)];
    } else {
        return arr.slice(0, newSize);
    }
}

export function createArrayView<T>(arr: T[], offset: number, length: number): T[] {
    return new Proxy([], {
        get(target, prop, receiver) {
            // Return the view's length for the "length" property.
            if (prop === "length") {
                return length;
            }

            // If the property is a symbol (e.g. Symbol.iterator), delegate to the original array.
            if (typeof prop === "symbol") {
                return Reflect.get(arr, prop, receiver);
            }

            if (prop === "slice") {
                return function (start?: number, end?: number): T[] {
                    // Normalize start and end values relative to the view.
                    let s = start ?? 0;
                    let e = end ?? length;
                    if (s < 0) s = length + s;
                    if (e < 0) e = length + e;
                    s = Math.max(0, s);
                    e = Math.min(length, e);
                    const newLength = Math.max(0, e - s);
                    // Create and return a new view into the original array.
                    return createArrayView(arr, offset + s, newLength);
                };
            }

            // Intercept the "sort" method.
            if (prop === "sort") {
                return function (compareFn?: (a: T, b: T) => number) {
                    // Create a temporary copy of the subrange.
                    const subarray: T[] = [];
                    for (let i = 0; i < length; i++) {
                        subarray[i] = arr[offset + i];
                    }
                    // Sort the temporary copy.
                    subarray.sort(compareFn);
                    // Write the sorted values back into the underlying array.
                    for (let i = 0; i < length; i++) {
                        arr[offset + i] = subarray[i];
                    }
                    // Return the proxy (receiver) for chaining.
                    return receiver;
                };
            }

            // For numeric property access, convert the property to a number.
            const index = Number(prop);
            if (!isNaN(index)) {
                return arr[offset + index];
            }

            // Delegate any other property accesses to the underlying array.
            return Reflect.get(arr, prop, receiver);
        },
        set(target, prop, value, receiver) {
            // For symbol properties, delegate to the underlying array.
            if (typeof prop === "symbol") {
                return Reflect.set(arr, prop, value, receiver);
            }

            // For numeric property access, convert the property to a number.
            const index = Number(prop);
            if (!isNaN(index)) {
                arr[offset + index] = value;
                return true;
            }

            // Delegate any other property sets.
            return Reflect.set(arr, prop, value, receiver);
        },
    });
}

export function vec3_to_number(v: vec3[] | uvec3[]): number[] {
    let out: number[] = [];
    for (let i = 0; i < v.length; i++) {
        out.push(v[i].x, v[i].y, v[i].z);
    }
    return out;
}

export function number_to_uvec3(array: number[] | Uint32Array | Float32Array, count: number = 3): uvec3[] {
    let out: uvec3[] = [];
    for (let i = 0; i < array.length; i += count) {
        out.push(new uvec3(array[i + 0], array[i + 1], array[i + 2]));
    }
    return out;
}

export function pixelErrorToQuadricErrorOverDistance(errorSizeInPixels: number, fov: number, resolution: number): number {
    return Math.sin(Math.atan(Math.tan(fov * 0.5) * errorSizeInPixels / resolution));
}

export function quadricErrorOverDistanceToPixelError(quadricErrorOverDistance: number, fov: number, resolution: number): number {
    return Math.tan(Math.asin(quadricErrorOverDistance)) * resolution / Math.tan(fov * 0.5);
}