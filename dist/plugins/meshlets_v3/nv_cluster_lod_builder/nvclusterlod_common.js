import { uvec3 } from './nvclusterlod_mesh.js';

class Sphere {
  x = 0;
  y = 0;
  z = 0;
  radius = 0;
  constructor(x = 0, y = 0, z = 0, radius = 0) {
    this.x = x;
    this.y = y;
    this.z = z;
    this.radius = radius;
  }
}
var Result = /* @__PURE__ */ ((Result2) => {
  Result2[Result2["SUCCESS"] = 0] = "SUCCESS";
  Result2[Result2["ERROR_EMPTY_CLUSTER_GENERATING_GROUPS"] = 1] = "ERROR_EMPTY_CLUSTER_GENERATING_GROUPS";
  Result2[Result2["ERROR_CLUSTERING_FAILED"] = 2] = "ERROR_CLUSTERING_FAILED";
  Result2[Result2["ERROR_NODE_OVERFLOW"] = 3] = "ERROR_NODE_OVERFLOW";
  Result2[Result2["ERROR_LOD_OVERFLOW"] = 4] = "ERROR_LOD_OVERFLOW";
  Result2[Result2["ERROR_CLUSTER_COUNT_NOT_DECREASING"] = 5] = "ERROR_CLUSTER_COUNT_NOT_DECREASING";
  Result2[Result2["ERROR_INCONSISTENT_GENERATING_GROUPS"] = 6] = "ERROR_INCONSISTENT_GENERATING_GROUPS";
  Result2[Result2["ERROR_ADJACENCY_GENERATION_FAILED"] = 7] = "ERROR_ADJACENCY_GENERATION_FAILED";
  Result2[Result2["ERROR_OUTPUT_MESH_OVERFLOW"] = 8] = "ERROR_OUTPUT_MESH_OVERFLOW";
  Result2[Result2["ERROR_CLUSTER_GENERATING_GROUPS_MISMATCH"] = 9] = "ERROR_CLUSTER_GENERATING_GROUPS_MISMATCH";
  Result2[Result2["ERROR_EMPTY_ROOT_CLUSTER"] = 10] = "ERROR_EMPTY_ROOT_CLUSTER";
  Result2[Result2["ERROR_INCONSISTENT_BOUNDING_SPHERES"] = 11] = "ERROR_INCONSISTENT_BOUNDING_SPHERES";
  Result2[Result2["ERROR_HIERARCHY_GENERATION_FAILED"] = 12] = "ERROR_HIERARCHY_GENERATION_FAILED";
  Result2[Result2["ERROR_INVALID_ARGUMENT"] = 13] = "ERROR_INVALID_ARGUMENT";
  Result2[Result2["ERROR_UNSPECIFIED"] = 14] = "ERROR_UNSPECIFIED";
  return Result2;
})(Result || {});
function assert(condition) {
  if (condition === false) throw Error("Assert failed");
}
function resizeArray(arr, newSize, createDefaultValue) {
  if (newSize > arr.length) {
    return [...arr, ...Array.from({ length: newSize - arr.length }, createDefaultValue)];
  } else {
    return arr.slice(0, newSize);
  }
}
function createArrayView(arr, offset, length) {
  return new Proxy([], {
    get(target, prop, receiver) {
      if (prop === "length") {
        return length;
      }
      if (typeof prop === "symbol") {
        return Reflect.get(arr, prop, receiver);
      }
      if (prop === "slice") {
        return function(start, end) {
          let s = start ?? 0;
          let e = end ?? length;
          if (s < 0) s = length + s;
          if (e < 0) e = length + e;
          s = Math.max(0, s);
          e = Math.min(length, e);
          const newLength = Math.max(0, e - s);
          return createArrayView(arr, offset + s, newLength);
        };
      }
      if (prop === "sort") {
        return function(compareFn) {
          const subarray = [];
          for (let i = 0; i < length; i++) {
            subarray[i] = arr[offset + i];
          }
          subarray.sort(compareFn);
          for (let i = 0; i < length; i++) {
            arr[offset + i] = subarray[i];
          }
          return receiver;
        };
      }
      const index = Number(prop);
      if (!isNaN(index)) {
        return arr[offset + index];
      }
      return Reflect.get(arr, prop, receiver);
    },
    set(target, prop, value, receiver) {
      if (typeof prop === "symbol") {
        return Reflect.set(arr, prop, value, receiver);
      }
      const index = Number(prop);
      if (!isNaN(index)) {
        arr[offset + index] = value;
        return true;
      }
      return Reflect.set(arr, prop, value, receiver);
    }
  });
}
function vec3_to_number(v) {
  let out = [];
  for (let i = 0; i < v.length; i++) {
    out.push(v[i].x, v[i].y, v[i].z);
  }
  return out;
}
function number_to_uvec3(array, count = 3) {
  let out = [];
  for (let i = 0; i < array.length; i += count) {
    out.push(new uvec3(array[i + 0], array[i + 1], array[i + 2]));
  }
  return out;
}

export { Result, Sphere, assert, createArrayView, number_to_uvec3, resizeArray, vec3_to_number };
