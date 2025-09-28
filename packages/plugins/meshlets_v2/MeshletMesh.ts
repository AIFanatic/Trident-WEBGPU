import {
    Geometry, InterleavedVertexAttribute,
    Components,
    EventSystem, EventSystemLocal,
    Mathf
}  from "@trident/core";
import { Meshlet } from "./Meshlet";

import { MeshletEvents } from "./MeshletEvents";
import { Meshoptimizer } from "./nv_cluster_lod_builder/meshoptimizer/Meshoptimizer";
import { MeshInput, vec3 } from "./nv_cluster_lod_builder/nvclusterlod_mesh";
import { NV_Cluster } from "./nv_cluster_lod_builder/lib";


import { mat4, length } from "./nv_cluster_lod_builder/test/test_common";
import { Sphere as SphereMeshlet } from "./nv_cluster_lod_builder/nvclusterlod_common";

export const meshletsCache: Map<Geometry, {meshlets: Meshlet[], instanceCount: number}> = new Map();

export class MeshletMesh extends Components.Mesh {
    public meshlets: Meshlet[] = [];

    public Start(): void {
        EventSystemLocal.on(Components.TransformEvents.Updated, this.transform, () => {
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

        const meshInput: MeshInput = new MeshInput();
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
        let meshlets: Meshlet[] = [];


        for (const [lod, meshes] of outputMeshes) {
            for (const cluster of meshes) {
                const clusterIndicesZeroIndexed = cluster.indices.map(i => i - 1);
                const meshlet = new Meshlet(cluster.vertices, clusterIndicesZeroIndexed);
                meshlet.clusterError = cluster.error;
                meshlet.parentError = cluster.parentError;
                meshlet.boundingVolume = new Mathf.Sphere(
                    new Mathf.Vector3(cluster.boundingSphere.x, cluster.boundingSphere.y, cluster.boundingSphere.z),
                    cluster.boundingSphere.radius
                )
                meshlet.parentBoundingVolume = new Mathf.Sphere(
                    new Mathf.Vector3(cluster.parentBoundingSphere.x, cluster.parentBoundingSphere.y, cluster.parentBoundingSphere.z),
                    cluster.parentBoundingSphere.radius
                )
                meshlet.lod = lod;
                meshlets.push(meshlet);
            }
        }

        if (meshlets.length === 1) {
            meshlets[0].clusterError = 0.1
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

                    console.log("allMeshlets", meshlets)
                }
            // }
        // }

        meshletsCache.set(geometry, {meshlets: this.meshlets, instanceCount: 0});
    }
}