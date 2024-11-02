import { Geometry, InterleavedVertexAttribute } from "../Geometry";
import { Meshlet } from "../plugins/meshlets/Meshlet";
import { MeshletMesh, meshletsCache } from "./MeshletMesh";
import { Meshoptimizer } from "../plugins/meshlets/Meshoptimizer";
import { MeshletCreator } from "../plugins/meshlets/utils/MeshletCreator";

// A Mesh is just a MeshletMesh with only the initial clusters created.
// This allows to follow the normal deferred pipeline.
export class Mesh extends MeshletMesh {
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
        const allMeshlets = MeshletCreator.build(interleavedVertices, indices, 255, Meshlet.max_triangles);

        this.meshlets = allMeshlets;
        meshletsCache.set(geometry, {meshlets: this.meshlets, instanceCount: 0});
    }
}