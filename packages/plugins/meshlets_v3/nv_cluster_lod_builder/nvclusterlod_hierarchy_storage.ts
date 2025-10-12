import { HierarchyCreateInfo, HierarchyGetRequirementsInfo, HierarchyInput, HierarchyOutput, HierarchyRequirements, Node, nvclusterlodCreateHierarchy, nvclusterlodHierarchyGetRequirements } from "./nvcluster_hierarchy";
import { Result, Sphere, resizeArray } from "./nvclusterlod_common";

// Shortcut and storage for hierarchy output
export class LodHierarchy {
    public nodes: Node[] = [];
    public groupCumulativeBoundingSpheres: Sphere[] = [];
    public groupCumulativeQuadricError: number[] = [];
};

export function generateLodHierarchy(input: HierarchyInput, hierarchy: LodHierarchy): Result {
    let reqInfo: HierarchyGetRequirementsInfo = new HierarchyGetRequirementsInfo();
    reqInfo.input = input;

    // Get conservative output sizes
    const sizes: HierarchyRequirements = nvclusterlodHierarchyGetRequirements(reqInfo);

    // Allocate storage
    //   hierarchy.nodes.resize(sizes.maxNodeCount);
    // hierarchy.groupCumulativeBoundingSpheres.resize(input.groupCount);
    // hierarchy.groupCumulativeQuadricError.resize(input.groupCount);
    hierarchy.nodes = resizeArray(hierarchy.nodes, sizes.maxNodeCount, () => new Node());
    hierarchy.groupCumulativeBoundingSpheres = resizeArray(hierarchy.groupCumulativeBoundingSpheres, input.groupCount, () => new Sphere());
    hierarchy.groupCumulativeQuadricError = resizeArray(hierarchy.groupCumulativeQuadricError, input.groupCount, () => 0);

    // Pack output pointers
    let output: HierarchyOutput = new HierarchyOutput();

    output.groupCumulativeBoundingSpheres = hierarchy.groupCumulativeBoundingSpheres;
    output.groupCumulativeQuadricError = hierarchy.groupCumulativeQuadricError;
    output.nodeCount = sizes.maxNodeCount;
    output.nodes = hierarchy.nodes;


    let createInfo: HierarchyCreateInfo = new HierarchyCreateInfo(input);

    // Make LODs
    let result: Result = nvclusterlodCreateHierarchy(createInfo, output);
    if (result != Result.SUCCESS) {
        // hierarchy = {};
        Object.assign(hierarchy, new LodHierarchy());
        return result;
    }
    // Truncate to output size written
    //   hierarchy.nodes.resize(output.nodeCount);
    hierarchy.nodes = resizeArray(hierarchy.nodes, output.nodeCount, () => new Node());
    return Result.SUCCESS;
}