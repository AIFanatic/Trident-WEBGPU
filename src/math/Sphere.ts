import { Vector3 } from "./Vector3";

export class Sphere {
    public center: Vector3;
    public radius: number;
    
    constructor(center = new Vector3(0,0,0), radius = 0) {
        this.center = center;
        this.radius = radius;
    }

    public static fromAABB(minBounds: Vector3, maxBounds: Vector3): Sphere {
        const center = maxBounds.clone().add(minBounds).mul(0.5);
        const radius = maxBounds.distanceTo(minBounds) * 0.5;
        return new Sphere(center, radius);
    }

    public static fromVertices(vertices: Float32Array, indices: Uint32Array, vertex_positions_stride: number): Sphere {
        let min = new Vector3(+Infinity, +Infinity, +Infinity);
        let max = new Vector3(-Infinity, -Infinity, -Infinity);

        let vertex = new Vector3();
        for (const index of indices) {
            const x = vertices[index * vertex_positions_stride + 0];
            const y = vertices[index * vertex_positions_stride + 1];
            const z = vertices[index * vertex_positions_stride + 2];
            if (isNaN(x) || isNaN(y) || isNaN(z)) throw Error(`Invalid vertex [i ${index}, ${x}, ${y}, ${z}]`);
            vertex.set(x, y, z);
            min.min(vertex);
            max.max(vertex);
        }

        return Sphere.fromAABB(min, max);
    }

    // Set the sphere to contain all points in the array
    public SetFromPoints(points: Vector3[]) {
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