import { HierarchyGetRequirementsInfo, nvclusterlodHierarchyGetRequirements, HierarchyOutput, nvclusterlodCreateHierarchy, HierarchyCreateInfo, Node } from './nvcluster_hierarchy.js';
import { resizeArray, Result, Sphere } from './nvclusterlod_common.js';

class LodHierarchy {
  nodes = [];
  groupCumulativeBoundingSpheres = [];
  groupCumulativeQuadricError = [];
}
function generateLodHierarchy(input, hierarchy) {
  let reqInfo = new HierarchyGetRequirementsInfo();
  reqInfo.input = input;
  const sizes = nvclusterlodHierarchyGetRequirements(reqInfo);
  hierarchy.nodes = resizeArray(hierarchy.nodes, sizes.maxNodeCount, () => new Node());
  hierarchy.groupCumulativeBoundingSpheres = resizeArray(hierarchy.groupCumulativeBoundingSpheres, input.groupCount, () => new Sphere());
  hierarchy.groupCumulativeQuadricError = resizeArray(hierarchy.groupCumulativeQuadricError, input.groupCount, () => 0);
  let output = new HierarchyOutput();
  output.groupCumulativeBoundingSpheres = hierarchy.groupCumulativeBoundingSpheres;
  output.groupCumulativeQuadricError = hierarchy.groupCumulativeQuadricError;
  output.nodeCount = sizes.maxNodeCount;
  output.nodes = hierarchy.nodes;
  let createInfo = new HierarchyCreateInfo(input);
  let result = nvclusterlodCreateHierarchy(createInfo, output);
  if (result != Result.SUCCESS) {
    Object.assign(hierarchy, new LodHierarchy());
    return result;
  }
  hierarchy.nodes = resizeArray(hierarchy.nodes, output.nodeCount, () => new Node());
  return Result.SUCCESS;
}

export { LodHierarchy, generateLodHierarchy };
