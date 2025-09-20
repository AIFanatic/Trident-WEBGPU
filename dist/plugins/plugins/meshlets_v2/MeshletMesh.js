import { Components, EventSystemLocal, EventSystem, InterleavedVertexAttribute, Mathf } from '@trident/core';
import { Meshlet } from './Meshlet.js';
import { MeshletEvents } from './MeshletEvents.js';
import { Meshoptimizer } from './nv_cluster_lod_builder/meshoptimizer/Meshoptimizer.js';
import { MeshInput } from './nv_cluster_lod_builder/nvclusterlod_mesh.js';
import { NV_Cluster } from './nv_cluster_lod_builder/lib.js';

const meshletsCache = /* @__PURE__ */ new Map();
class MeshletMesh extends Components.Mesh {
  meshlets = [];
  Start() {
    EventSystemLocal.on(Components.TransformEvents.Updated, this.transform, () => {
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
    if (!pa || !na || !ua || !ia) throw Error("To create meshlets need indices, position, normal and uv attributes");
    const p = pa.array;
    const n = na.array;
    const u = ua.array;
    const indices = ia.array;
    const interleavedBufferAttribute = InterleavedVertexAttribute.fromArrays([p, n, u], [3, 3, 2]);
    const interleavedVertices = interleavedBufferAttribute.array;
    await Meshoptimizer.load();
    const meshInput = new MeshInput();
    meshInput.indices = indices;
    meshInput.indexCount = indices.length;
    meshInput.vertices = interleavedVertices;
    meshInput.vertexOffset = 0;
    meshInput.vertexCount = interleavedVertices.length / 8;
    meshInput.vertexStride = 3 + 3 + 2;
    meshInput.clusterConfig = {
      minClusterSize: 128,
      maxClusterSize: 128,
      costUnderfill: 0.9,
      costOverlap: 0.5,
      preSplitThreshold: 1 << 17
    };
    meshInput.groupConfig = {
      minClusterSize: 32,
      maxClusterSize: 32,
      costUnderfill: 0.5,
      costOverlap: 0,
      preSplitThreshold: 0
    };
    meshInput.decimationFactor = 0.5;
    const outputMeshes = await NV_Cluster.Build(meshInput);
    console.log(outputMeshes);
    let meshlets = [];
    for (const [lod, meshes] of outputMeshes) {
      for (const cluster of meshes) {
        const clusterIndicesZeroIndexed = cluster.indices.map((i) => i - 1);
        const meshlet = new Meshlet(cluster.vertices, clusterIndicesZeroIndexed);
        meshlet.clusterError = cluster.error;
        meshlet.parentError = cluster.parentError;
        meshlet.boundingVolume = new Mathf.Sphere(
          new Mathf.Vector3(cluster.boundingSphere.x, cluster.boundingSphere.y, cluster.boundingSphere.z),
          cluster.boundingSphere.radius
        );
        meshlet.parentBoundingVolume = new Mathf.Sphere(
          new Mathf.Vector3(cluster.parentBoundingSphere.x, cluster.parentBoundingSphere.y, cluster.parentBoundingSphere.z),
          cluster.parentBoundingSphere.radius
        );
        meshlet.lod = lod;
        meshlets.push(meshlet);
      }
    }
    if (meshlets.length === 1) {
      meshlets[0].clusterError = 0.1;
    }
    {
      this.meshlets = meshlets;
      console.log("allMeshlets", meshlets);
    }
    meshletsCache.set(geometry, { meshlets: this.meshlets, instanceCount: 0 });
  }
}

export { MeshletMesh, meshletsCache };
