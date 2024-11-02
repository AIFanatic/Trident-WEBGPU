import { Meshlet } from "../plugins/meshlets/Meshlet";
import { Geometry, InterleavedVertexAttribute } from "../Geometry";
import { Meshletizer } from "../plugins/meshlets/Meshletizer";
import { Meshoptimizer } from "../plugins/meshlets/Meshoptimizer";
import { Mesh } from "./MeshV2";

export const meshletsCache: Map<Geometry, {meshlets: Meshlet[], instanceCount: number}> = new Map();

export class MeshletMesh extends Mesh {
    public async SetGeometry(geometry: Geometry) {
        this.geometry = geometry;
        let cached = meshletsCache.get(geometry);
        if (cached) {
            cached.instanceCount++;
            meshletsCache.set(geometry, cached);
            this.meshlets.push(...cached.meshlets);
            return;
        }

        const pa = geometry.attributes.get("position");
        const na = geometry.attributes.get("normal");
        const ua = geometry.attributes.get("uv");
        const ia = geometry.index;
        if (!pa || !na || !ua || !ia) throw Error("To create meshlets need indices, position, normal and uv attributes");
        
        const p = pa.array as Float32Array;
        const n = na.array as Float32Array;
        const u = ua.array as Float32Array;
        const indices = ia.array as Uint32Array;

        const interleavedBufferAttribute = InterleavedVertexAttribute.fromArrays([p, n, u], [3, 3, 2]);
        const interleavedVertices = interleavedBufferAttribute.array as Float32Array;

        await Meshoptimizer.load();
        const allMeshlets = await Meshletizer.Build(interleavedVertices, indices);

        this.meshlets = allMeshlets;
        meshletsCache.set(geometry, {meshlets: this.meshlets, instanceCount: 0});
    }
}