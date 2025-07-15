import { InterleavedVertexAttribute } from "../../Geometry";
import { Mesh } from "../../components/Mesh";
import { Meshlet } from "./Meshlet";
import { EventSystemLocal, EventSystem } from "../../Events";
import { TransformEvents } from "../../components/Transform";
import { MeshletEvents } from "./MeshletEvents";
import { Meshoptimizer } from "./nv_cluster_lod_builder/meshoptimizer/Meshoptimizer";
import { MeshInput } from "./nv_cluster_lod_builder/nvclusterlod_mesh";
import { NV_Cluster } from "./nv_cluster_lod_builder/lib";
import { Sphere } from "../../math/Sphere";
import { Vector3 } from "../../math/Vector3";
export const meshletsCache = new Map();
export class MeshletMesh extends Mesh {
    meshlets = [];
    Start() {
        EventSystemLocal.on(TransformEvents.Updated, this.transform, () => {
            EventSystem.emit(MeshletEvents.Updated, this);
        });
    }
    async SetGeometry(geometry, clusterize = true) {
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
        if (!pa || !na || !ua || !ia)
            throw Error("To create meshlets need indices, position, normal and uv attributes");
        const p = pa.array;
        const n = na.array;
        const u = ua.array;
        const indices = ia.array;
        const interleavedBufferAttribute = InterleavedVertexAttribute.fromArrays([p, n, u], [3, 3, 2]);
        const interleavedVertices = interleavedBufferAttribute.array;
        await Meshoptimizer.load();
        const meshInput = new MeshInput();
        // Mesh data
        meshInput.indices = indices;
        meshInput.indexCount = indices.length;
        meshInput.vertices = interleavedVertices;
        meshInput.vertexOffset = 0;
        meshInput.vertexCount = interleavedVertices.length / 8;
        meshInput.vertexStride = 3 + 3 + 2;
        // Use default configurations and decimation factor:
        meshInput.clusterConfig = {
            minClusterSize: 128,
            maxClusterSize: 128,
            costUnderfill: 0.9,
            costOverlap: 0.5,
            preSplitThreshold: 1 << 17,
        };
        // Cluster group configuration -- here we force groups of size 32:
        meshInput.groupConfig = {
            minClusterSize: 32,
            maxClusterSize: 32,
            costUnderfill: 0.5,
            costOverlap: 0.0,
            preSplitThreshold: 0,
        };
        // Decimation factor
        meshInput.decimationFactor = 0.5;
        const outputMeshes = await NV_Cluster.Build(meshInput);
        console.log(outputMeshes);
        let meshlets = [];
        for (const [lod, meshes] of outputMeshes) {
            for (const cluster of meshes) {
                const clusterIndicesZeroIndexed = cluster.indices.map(i => i - 1);
                const meshlet = new Meshlet(cluster.vertices, clusterIndicesZeroIndexed);
                meshlet.clusterError = cluster.error;
                meshlet.parentError = cluster.parentError;
                meshlet.boundingVolume = new Sphere(new Vector3(cluster.boundingSphere.x, cluster.boundingSphere.y, cluster.boundingSphere.z), cluster.boundingSphere.radius);
                meshlet.parentBoundingVolume = new Sphere(new Vector3(cluster.parentBoundingSphere.x, cluster.parentBoundingSphere.y, cluster.parentBoundingSphere.z), cluster.parentBoundingSphere.radius);
                meshlet.lod = lod;
                meshlets.push(meshlet);
            }
        }
        if (meshlets.length === 1) {
            meshlets[0].clusterError = 0.1;
        }
        // if (indices.length / 3 <= Meshlet.max_triangles) {
        //     this.meshlets.push(new Meshlet(interleavedVertices, indices));
        // }
        // else {
        // if (clusterize) {
        //     const allMeshlets = await Meshletizer.Build(interleavedVertices, indices);
        //     this.meshlets = allMeshlets;
        // }
        // else {
        {
            // const allMeshlets = await MeshletCreator.Build(interleavedVertices, indices, Meshlet.max_vertices, Meshlet.max_triangles);
            this.meshlets = meshlets;
            console.log("allMeshlets", meshlets);
        }
        // }
        // }
        meshletsCache.set(geometry, { meshlets: this.meshlets, instanceCount: 0 });
    }
}
