import { Geometry, InterleavedVertexAttribute } from "../../Geometry";
import { Mesh } from "../../components/Mesh";
import { Meshlet } from "./Meshlet";
import { Meshoptimizer } from "./Meshoptimizer";
import { Meshletizer } from "./Meshletizer";
import { MeshletCreator } from "./utils/MeshletCreator";
import { EventSystemLocal, EventSystem } from "../../Events";
import { TransformEvents } from "../../components/Transform";
import { MeshletEvents } from "./MeshletEvents";
import { InstancedMesh } from "../../components/InstancedMesh";

export const meshletsCache: Map<Geometry, {meshlets: Meshlet[], instanceCount: number}> = new Map();

export class MeshletMesh extends Mesh {
    public meshlets: Meshlet[] = [];
    
    public Start(): void {
        EventSystemLocal.on(TransformEvents.Updated, this.transform, () => {
            EventSystem.emit(MeshletEvents.Updated, this);
        })
    }
    
    public async SetGeometry(geometry: Geometry, clusterize = true) {
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
        if (indices.length / 3 <= Meshlet.max_triangles) {
            this.meshlets.push(new Meshlet(interleavedVertices, indices));
        }
        else {
            if (clusterize) {
                const allMeshlets = await Meshletizer.Build(interleavedVertices, indices);
                this.meshlets = allMeshlets;
            }
            else {
                const allMeshlets = MeshletCreator.build(interleavedVertices, indices, Meshlet.max_vertices, Meshlet.max_triangles);
                this.meshlets = allMeshlets;
            }
        }

        meshletsCache.set(geometry, {meshlets: this.meshlets, instanceCount: 0});
    }
}