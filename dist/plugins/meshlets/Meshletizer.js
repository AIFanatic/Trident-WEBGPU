import { Meshlet } from './Meshlet.js';
import { Meshoptimizer, attribute_size } from './Meshoptimizer.js';
import { Metis } from './Metis.js';
import { MeshletCreator } from './utils/MeshletCreator.js';
import { MeshletGrouper } from './utils/MeshletGrouper.js';
import { MeshletMerger } from './utils/MeshletMerger.js';
import { MeshletBorder } from './utils/MeshletBorder.js';

class Meshletizer {
  static MaxLOD = 25;
  static step(meshlets, lod, previousMeshlets) {
    if (meshlets.length === 1 && meshlets[0].vertices.length < Meshlet.max_triangles * 8) return meshlets;
    let nparts = Math.ceil(meshlets.length / 8);
    if (nparts > 8) nparts = 8;
    let grouped = [meshlets];
    if (nparts > 1) {
      grouped = MeshletGrouper.group(meshlets, nparts);
    }
    let splitOutputs = [];
    for (let i = 0; i < grouped.length; i++) {
      const group = grouped[i];
      const mergedGroup = MeshletMerger.merge(group);
      const cleanedMergedGroup = Meshoptimizer.clean(mergedGroup);
      const tLod = (lod + 1) / Meshletizer.MaxLOD;
      const targetError = 0.1 * tLod + 0.01 * (1 - tLod);
      let target_count = cleanedMergedGroup.indices.length / 2;
      const sharedVertices = MeshletBorder.GetSharedVertices(group, attribute_size);
      const lockedArray = MeshletBorder.SharedVerticesToLockedArray(sharedVertices, mergedGroup, attribute_size);
      const simplified = Meshoptimizer.meshopt_simplifyWithAttributes(mergedGroup, lockedArray, target_count, targetError);
      const localScale = Meshoptimizer.meshopt_simplifyScale(simplified.meshlet);
      let meshSpaceError = simplified.error * localScale;
      let childrenError = 0;
      for (let m of group) {
        const previousMeshlet = previousMeshlets.get(m.id);
        if (!previousMeshlet) throw Error("Could not find previous meshler");
        childrenError = Math.max(childrenError, previousMeshlet.clusterError);
      }
      meshSpaceError += childrenError;
      let splits = MeshletCreator.build(simplified.meshlet.vertices, simplified.meshlet.indices, Meshlet.max_vertices, Meshlet.max_triangles);
      for (let split of splits) {
        split.clusterError = meshSpaceError;
        split.boundingVolume = simplified.meshlet.boundingVolume;
        split.lod = lod + 1;
        previousMeshlets.set(split.id, split);
        splitOutputs.push(split);
        split.parents.push(...group);
      }
      for (let m of group) {
        m.children.push(...splits);
        const previousMeshlet = previousMeshlets.get(m.id);
        if (!previousMeshlet) throw Error("Could not find previous meshlet");
        previousMeshlet.parentError = meshSpaceError;
        previousMeshlet.parentBoundingVolume = simplified.meshlet.boundingVolume;
      }
    }
    return splitOutputs;
  }
  static async Build(vertices, indices) {
    await Meshoptimizer.load();
    await Metis.load();
    const meshlets = MeshletCreator.build(vertices, indices, Meshlet.max_vertices, Meshlet.max_triangles);
    console.log(`starting with ${meshlets.length} meshlets`);
    let inputs = meshlets;
    let rootMeshlet = null;
    let previousMeshlets = /* @__PURE__ */ new Map();
    for (let m of meshlets) previousMeshlets.set(m.id, m);
    for (let lod = 0; lod < Meshletizer.MaxLOD; lod++) {
      const outputs = this.step(inputs, lod, previousMeshlets);
      const inputTriangleArray = inputs.map((m) => m.indices.length / 3);
      const outputTriangleArray = outputs.map((m) => m.indices.length / 3);
      const inputTriangleCount = inputTriangleArray.reduce((a, b) => a + b);
      const outputTriangleCount = outputTriangleArray.reduce((a, b) => a + b);
      console.log(`LOD: ${lod}: input: [meshlets: ${inputTriangleArray.length}, triangles: ${inputTriangleCount}] -> output: [meshlets: ${outputTriangleArray.length}, triangles: ${outputTriangleCount}]`);
      if (outputTriangleCount >= inputTriangleCount) {
        for (const input of inputs) {
          if (input.indices.length / 3 > Meshlet.max_triangles) {
            throw Error(`Output meshlet triangle count ${inputTriangleCount} >= input triangle count ${inputTriangleCount}`);
          }
        }
        break;
      }
      inputs = outputs;
      if (outputs.length === 1 && outputs[0].indices.length / 3 <= 128) {
        console.log("WE are done at lod", lod);
        rootMeshlet = outputs[0];
        rootMeshlet.lod = lod + 1;
        rootMeshlet.parentBoundingVolume = rootMeshlet.boundingVolume;
        break;
      }
    }
    if (rootMeshlet === null) throw Error("Root meshlet is invalid!");
    let meshletsOut = [];
    for (const [_, meshlet] of previousMeshlets) {
      meshletsOut.push(meshlet);
    }
    return meshletsOut;
  }
}

export { Meshletizer };
