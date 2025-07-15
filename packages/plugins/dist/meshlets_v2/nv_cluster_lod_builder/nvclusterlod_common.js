import { uvec3 } from "./nvclusterlod_mesh";
export class Sphere {
    x = 0.0;
    y = 0.0;
    z = 0.0;
    radius = 0.0;
    constructor(x = 0, y = 0, z = 0, radius = 0) {
        this.x = x;
        this.y = y;
        this.z = z;
        this.radius = radius;
    }
}
;
export var Result;
(function (Result) {
    Result[Result["SUCCESS"] = 0] = "SUCCESS";
    Result[Result["ERROR_EMPTY_CLUSTER_GENERATING_GROUPS"] = 1] = "ERROR_EMPTY_CLUSTER_GENERATING_GROUPS";
    Result[Result["ERROR_CLUSTERING_FAILED"] = 2] = "ERROR_CLUSTERING_FAILED";
    Result[Result["ERROR_NODE_OVERFLOW"] = 3] = "ERROR_NODE_OVERFLOW";
    Result[Result["ERROR_LOD_OVERFLOW"] = 4] = "ERROR_LOD_OVERFLOW";
    Result[Result["ERROR_CLUSTER_COUNT_NOT_DECREASING"] = 5] = "ERROR_CLUSTER_COUNT_NOT_DECREASING";
    Result[Result["ERROR_INCONSISTENT_GENERATING_GROUPS"] = 6] = "ERROR_INCONSISTENT_GENERATING_GROUPS";
    Result[Result["ERROR_ADJACENCY_GENERATION_FAILED"] = 7] = "ERROR_ADJACENCY_GENERATION_FAILED";
    Result[Result["ERROR_OUTPUT_MESH_OVERFLOW"] = 8] = "ERROR_OUTPUT_MESH_OVERFLOW";
    Result[Result["ERROR_CLUSTER_GENERATING_GROUPS_MISMATCH"] = 9] = "ERROR_CLUSTER_GENERATING_GROUPS_MISMATCH";
    Result[Result["ERROR_EMPTY_ROOT_CLUSTER"] = 10] = "ERROR_EMPTY_ROOT_CLUSTER";
    Result[Result["ERROR_INCONSISTENT_BOUNDING_SPHERES"] = 11] = "ERROR_INCONSISTENT_BOUNDING_SPHERES";
    Result[Result["ERROR_HIERARCHY_GENERATION_FAILED"] = 12] = "ERROR_HIERARCHY_GENERATION_FAILED";
    Result[Result["ERROR_INVALID_ARGUMENT"] = 13] = "ERROR_INVALID_ARGUMENT";
    Result[Result["ERROR_UNSPECIFIED"] = 14] = "ERROR_UNSPECIFIED";
})(Result || (Result = {}));
;
export function assert(condition) {
    if (condition === false)
        throw Error("Assert failed");
}
export function resizeArray(arr, newSize, createDefaultValue) {
    if (newSize > arr.length) {
        // Fill new slots with new objects created by calling createDefaultValue
        return [...arr, ...Array.from({ length: newSize - arr.length }, createDefaultValue)];
    }
    else {
        return arr.slice(0, newSize);
    }
}
export function createArrayView(arr, offset, length) {
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
                return function (start, end) {
                    // Normalize start and end values relative to the view.
                    let s = start ?? 0;
                    let e = end ?? length;
                    if (s < 0)
                        s = length + s;
                    if (e < 0)
                        e = length + e;
                    s = Math.max(0, s);
                    e = Math.min(length, e);
                    const newLength = Math.max(0, e - s);
                    // Create and return a new view into the original array.
                    return createArrayView(arr, offset + s, newLength);
                };
            }
            // Intercept the "sort" method.
            if (prop === "sort") {
                return function (compareFn) {
                    // Create a temporary copy of the subrange.
                    const subarray = [];
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
export function vec3_to_number(v) {
    let out = [];
    for (let i = 0; i < v.length; i++) {
        out.push(v[i].x, v[i].y, v[i].z);
    }
    return out;
}
export function number_to_uvec3(array, count = 3) {
    let out = [];
    for (let i = 0; i < array.length; i += count) {
        out.push(new uvec3(array[i + 0], array[i + 1], array[i + 2]));
    }
    return out;
}
export function pixelErrorToQuadricErrorOverDistance(errorSizeInPixels, fov, resolution) {
    return Math.sin(Math.atan(Math.tan(fov * 0.5) * errorSizeInPixels / resolution));
}
export function quadricErrorOverDistanceToPixelError(quadricErrorOverDistance, fov, resolution) {
    return Math.tan(Math.asin(quadricErrorOverDistance)) * resolution / Math.tan(fov * 0.5);
}
