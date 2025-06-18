import { Vector3 } from "./Vector3";
export class Sphere {
    center;
    radius;
    constructor(center = new Vector3(0, 0, 0), radius = 0) {
        this.center = center;
        this.radius = radius;
    }
    static fromAABB(minBounds, maxBounds) {
        const center = maxBounds.clone().add(minBounds).mul(0.5);
        const radius = maxBounds.distanceTo(minBounds) * 0.5;
        return new Sphere(center, radius);
    }
    static fromVertices(vertices, indices, vertex_positions_stride) {
        let min = new Vector3(+Infinity, +Infinity, +Infinity);
        let max = new Vector3(-Infinity, -Infinity, -Infinity);
        let vertex = new Vector3();
        for (const index of indices) {
            const x = vertices[index * vertex_positions_stride + 0];
            const y = vertices[index * vertex_positions_stride + 1];
            const z = vertices[index * vertex_positions_stride + 2];
            if (isNaN(x) || isNaN(y) || isNaN(z))
                throw Error(`Invalid vertex [i ${index}, ${x}, ${y}, ${z}]`);
            vertex.set(x, y, z);
            min.min(vertex);
            max.max(vertex);
        }
        return Sphere.fromAABB(min, max);
    }
    // Set the sphere to contain all points in the array
    SetFromPoints(points) {
        if (points.length === 0) {
            throw new Error("Point array is empty.");
        }
        // Calculate the centroid of the points
        let centroid = points.reduce((acc, cur) => acc.add(cur)).mul(1 / points.length);
        // Find the maximum distance from the centroid to any point in the array
        let maxRadius = points.reduce((max, p) => Math.max(max, centroid.distanceTo(p)), 0);
        this.center = centroid;
        this.radius = maxRadius;
    }
}
//# sourceMappingURL=Sphere.js.map