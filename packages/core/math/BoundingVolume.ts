import { Vector3 } from "./Vector3";

export class BoundingVolume {
    public min: Vector3;
    public max: Vector3;
    public center: Vector3;
    public radius: number;

    constructor(min = new Vector3(+Infinity, +Infinity, +Infinity), max = new Vector3(-Infinity, -Infinity, -Infinity), center = new Vector3(), radius = 0) {
        this.min = min;
        this.max = max;
        this.center = center;
        this.radius = radius;
    }

    public static FromVertices(vertices: Float32Array): BoundingVolume {
        let maxX = -Infinity; let maxY = -Infinity; let maxZ = -Infinity;
        let minX = Infinity; let minY = Infinity; let minZ = Infinity;

        for (let i = 0; i < vertices.length; i += 3) {
            maxX = Math.max(maxX, vertices[i]);
            minX = Math.min(minX, vertices[i]);

            maxY = Math.max(maxY, vertices[i + 1]);
            minY = Math.min(minY, vertices[i + 1]);

            maxZ = Math.max(maxZ, vertices[i + 2]);
            minZ = Math.min(minZ, vertices[i + 2]);
        }

        const centerX = minX + (maxX - minX) / 2;
        const centerY = minY + (maxY - minY) / 2;
        const centerZ = minZ + (maxZ - minZ) / 2;
        const newCenter = new Vector3(centerX, centerY, centerZ);
        const halfWidth = (maxX - minX) / 2;
        const halfHeight = (maxY - minY) / 2;
        const halfDepth = (maxZ - minZ) / 2;
        const newRadius = Math.sqrt(halfWidth * halfWidth + halfHeight * halfHeight + halfDepth * halfDepth);

        return new BoundingVolume(
            new Vector3(minX, minY, minZ),
            new Vector3(maxX, maxY, maxZ),
            newCenter,
            newRadius
        );
    }
}