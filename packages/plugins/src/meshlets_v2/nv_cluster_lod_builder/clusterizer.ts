// Starting from a set of spatial items defined by their bounding boxes and centroids, and an optional adjacency graph describing the connectivity between them, this function groups those items

import { AABB, Input, Output, Requirements, Result, SpatialElements, Range, Graph } from "./nvcluster"
import { createArrayView, resizeArray } from "./nvclusterlod_common";

// Temporary storage for the split node function
class SplitNodeTemporaries {
    // Identification of the side on which each element lies when splitting a node (left = 1, right = 0)
    public partitionSides: number[];
    // Bounding boxes of the left children of the currently processed node
    public leftChildrenBoxes: AABB[];
    // Bounding boxes of the right children of the currently processed node
    public rightChildrenBoxes: AABB[];

    public deltaWeights: number[];
    public splitWeights: number[];
    public connectionIndicesInSortedElements: number[][];
    public sortedElementIndicesPerAxis: number[][];
};

// Candidate split position within a node
class Split {
    public axis: number = -1;
    public position: number = Number.MAX_VALUE;  // index of first item in the right node
    public cost: number = Number.MAX_VALUE;
    public valid(): boolean { return this.axis !== -1; }

    public lessThan(other: Split): boolean { return this.cost < other.cost; }

    public copy(other: Split) {
        this.axis = other.axis;
        this.position = other.position;
        this.cost = other.cost;
    }
};

function div_ceil(a: number, b: number): number {
    return Math.floor((a + b - 1) / b);
}

function aabbSize(aabb: AABB, size: number[]) {
    for (let i = 0; i < 3; i++) {
        size[i] = aabb.bboxMax[i] - aabb.bboxMin[i];
    }
}

function aabbCombine(a: AABB, b: AABB): AABB {
    let result: AABB = new AABB();

    for (let i = 0; i < 3; i++) {
        result.bboxMin[i] = a.bboxMin[i] < b.bboxMin[i] ? a.bboxMin[i] : b.bboxMin[i];
        result.bboxMax[i] = a.bboxMax[i] > b.bboxMax[i] ? a.bboxMax[i] : b.bboxMax[i];
    }
    return result;
}

function aabbIntersect(a: AABB, b: AABB): AABB {
    let result = new AABB()

    for (let i = 0; i < 3; i++) {
        result.bboxMin[i] = Math.max(a.bboxMin[i], b.bboxMin[i]);
        result.bboxMax[i] = Math.min(a.bboxMax[i], b.bboxMax[i]);
    }

    // Compute a positive-sized bbox starting at bboxmin
    for (let i = 0; i < 3; i++) {
        let s = result.bboxMax[i] - result.bboxMin[i];
        s = (s < 0.0) ? 0.0 : s;
        result.bboxMax[i] = result.bboxMin[i] + s;
    }


    return result;
}

function aabbEmpty(): AABB {
    let result = new AABB();
    for (let i = 0; i < 3; i++) {
        result.bboxMin[i] = Number.MAX_VALUE;
        result.bboxMax[i] = -Number.MAX_VALUE;
    }
    return result;
}

// This function returns a comparator function for sorting indices based on the centroids
// along a specified axis (with lexicographical ordering on the remaining axes).
function createCentroidComparator(
    axis: number,
    spatialElements: SpatialElements
): (a: number, b: number) => number {
    // Precompute the axis order:
    // For a given axis, the primary is axis A0, the secondary is A1, and the tertiary is A2.
    const A0 = axis;
    const A1 = (axis + 1) % 3;
    const A2 = (axis + 2) % 3;

    return (itemA: number, itemB: number): number => {
        const centroids = spatialElements.centroids;

        // Compute the starting indices for each centroid in the flat array.
        // Each centroid occupies 3 elements: [x, y, z].
        const indexA = itemA * 3;
        const indexB = itemB * 3;

        // Retrieve the coordinate for the primary axis
        const a0 = centroids[indexA + A0];
        const b0 = centroids[indexB + A0];
        if (a0 < b0) return -1;
        if (a0 > b0) return 1;

        // If equal, compare the secondary axis coordinate
        const a1 = centroids[indexA + A1];
        const b1 = centroids[indexB + A1];
        if (a1 < b1) return -1;
        if (a1 > b1) return 1;

        // If still equal, compare the tertiary axis coordinate
        const a2 = centroids[indexA + A2];
        const b2 = centroids[indexB + A2];
        if (a2 < b2) return -1;
        if (a2 > b2) return 1;

        // The centroids are equal in all components.
        return 0;
    };
}

function stablePartitionInPlace<T>(arr: T[], predicate: (elem: T) => boolean): void {
    const truePart: T[] = [];
    const falsePart: T[] = [];

    for (const elem of arr) {
        if (predicate(elem)) {
            truePart.push(elem);
        } else {
            falsePart.push(elem);
        }
    }

    // // Replace the contents of the original array
    // arr.splice(0, arr.length, ...truePart, ...falsePart);
    // arr.length = 0;
    // for (let i = 0; i < truePart.length; i++) arr.push(truePart[i]);
    // for (let i = 0; i < falsePart.length; i++) arr.push(falsePart[i]);
    const totalLength = truePart.length + falsePart.length;
    for (let i = 0; i < truePart.length; i++) {
      arr[i] = truePart[i];
    }
    for (let j = 0; j < falsePart.length; j++) {
      arr[truePart.length + j] = falsePart[j];
    }
    arr.length = totalLength;
}

// Splits the per-axis sorted element lists at the chosen split position along the given axis,
// so that the elements on the left side of the split are moved to the front of each list, while preserving the element ordering within each partition.
function partitionAtSplit(
    sortedElementIndicesPerAxis: number[][],
    splitAxis: number,
    splitPosition: number,
    partitionSides: number[]
) {
    const sortedThisAxis = sortedElementIndicesPerAxis[splitAxis];
    // Mark sides
    for (let i = 0; i < sortedThisAxis.length; i++) {
        const idx = sortedThisAxis[i];
        partitionSides[idx] = (i < splitPosition) ? 1 : 0;
    }

    // stable-partition the other axes
    for (let ax = 0; ax < 3; ax++) {
        if (ax == splitAxis) continue;
        const arr = sortedElementIndicesPerAxis[ax];
        stablePartitionInPlace(arr, (idx: number) => partitionSides[idx] !== 0);
    }
}

// Take a node defined by its sorted lists of element indices and recursively splits it along its longest axis until
// the number of elements in each node is less than or equal to maxElementsPerNode.
function splitAtMedianUntil(
    spatialElements: SpatialElements,  // Original definition of the input spatial elements
    partitionSides: number[],  // Partition identifier (left = 1, right = 0) for each element, used to partition the sorted element lists
    nodeSortedElementIndicesPerAxis: number[][],  // Sorted element indices along each axis for the current node
    maxElementsPerNode: number,  // Maximum number of elements allowed per node, used to stop the recursion
    nodeStartIndex: number,  // Starting index of the node in the complete sorted lists of elements
    perNodeElementRanges: Range[]  // Output ranges of the nodes (in the sorted element lists) created by the recursive split
) {
    const nodeCount = nodeSortedElementIndicesPerAxis[0].length;
    // If the current node is smaller than the maximum allowed element count, return its range
    if (nodeCount < maxElementsPerNode) {
        perNodeElementRanges.push(new Range(nodeStartIndex, nodeCount));
        return;
    }

    // Compute the AABB of the centroids of the elements referenced by the node. Since the elements are sorted along each axis,
    // the bounds on each coordinate are trivial to compute using the first and last items in the sorted list for that axis.
    // This does not provide the exact AABB for the node (ideallly we should combine the AABBs of each element), but this centroid-based
    // approximation is trivial and sufficient for the purpose of pre-splitting large inputs.
    const aabb: AABB = new AABB();
    // {{spatialElements.centroids[3 * nodeSortedElementIndicesPerAxis[0].front() + 0],
    // spatialElements.centroids[3 * nodeSortedElementIndicesPerAxis[1].front() + 1],
    // spatialElements.centroids[3 * nodeSortedElementIndicesPerAxis[2].front() + 2]},
    // {spatialElements.centroids[3 * nodeSortedElementIndicesPerAxis[0].back() + 0],
    // spatialElements.centroids[3 * nodeSortedElementIndicesPerAxis[1].back() + 1],
    // spatialElements.centroids[3 * nodeSortedElementIndicesPerAxis[2].back() + 2]}};

    aabb.bboxMin = [
        spatialElements.centroids[3 * nodeSortedElementIndicesPerAxis[0][0] + 0],
        spatialElements.centroids[3 * nodeSortedElementIndicesPerAxis[1][0] + 1],
        spatialElements.centroids[3 * nodeSortedElementIndicesPerAxis[2][0] + 2]
    ],
        aabb.bboxMax = [
            spatialElements.centroids[3 * nodeSortedElementIndicesPerAxis[0][nodeSortedElementIndicesPerAxis[0].length - 1] + 0],
            spatialElements.centroids[3 * nodeSortedElementIndicesPerAxis[1][nodeSortedElementIndicesPerAxis[1].length - 1] + 1],
            spatialElements.centroids[3 * nodeSortedElementIndicesPerAxis[2][nodeSortedElementIndicesPerAxis[2].length - 1] + 2]
        ]

    // Deduce the splitting axis from the longest side of the AABB
    let size = new Array(3).fill(0);
    aabbSize(aabb, size);
    const axis = size[0] > size[1] && size[0] > size[2] ? 0 : (size[1] > size[2] ? 1 : 2);

    // Split the sorted elements vectors at the median, preserving the order along each axis
    const splitPosition = nodeCount / 2;
    partitionAtSplit(nodeSortedElementIndicesPerAxis, axis, splitPosition, partitionSides);

    // Extract the left and right halves of the sorted element lists
    const left: number[][] = [
        nodeSortedElementIndicesPerAxis[0].slice(0, splitPosition),
        nodeSortedElementIndicesPerAxis[1].slice(0, splitPosition),
        nodeSortedElementIndicesPerAxis[2].slice(0, splitPosition),
    ];
    const right: number[][] = [
        nodeSortedElementIndicesPerAxis[0].slice(splitPosition),
        nodeSortedElementIndicesPerAxis[1].slice(splitPosition),
        nodeSortedElementIndicesPerAxis[2].slice(splitPosition),
    ];
    // Continue the split recursively on the left and right halves
    splitAtMedianUntil(spatialElements, partitionSides, left, maxElementsPerNode, nodeStartIndex, perNodeElementRanges);
    splitAtMedianUntil(spatialElements, partitionSides, right, maxElementsPerNode, nodeStartIndex + splitPosition, perNodeElementRanges);
}

// An explicit min function to pass to std::reduce
function minSplitCost(a: Split, b: Split): Split {
    // return a.lessThan(b) ? a : b;
    return b.lessThan(a) ? b : a;
    // return a.cost < b.cost ? a : b;
}

// Classic surface area heuristic cost
function sahCost(aabb: AABB, elementCount: number): number {
    // Direct calculation of the dimensions of the AABB
    const dx = aabb.bboxMax[0] - aabb.bboxMin[0];
    const dy = aabb.bboxMax[1] - aabb.bboxMin[1];
    const dz = aabb.bboxMax[2] - aabb.bboxMin[2];

    // Half area calculation (avoiding temporary arrays)
    const halfArea = dx * (dy + dz) + dy * dz;

    // Return the cost
    return halfArea * elementCount;
}

// Returns the sum of adjacency weights resulting from a split of the input node at the index elementIndexInNodeRange, where
// the element at elementIndexInNodeRange is included in the left part of the split.
// Weights are positive for connections to the right of the split and negative for
// connections to the left of the split. Later, the prefix sum of all items will then provide the
// *cut cost* in O(1) for any split position.
function sumAdjacencyWeightsAtSplit(
    graph: Graph,  // adjacency graph storing the connections for each node
    connectionIndicesInSortedElements: number[],  // Flattened list of the connections for each node in the graph. The indices represent the connected elements in the sorted list of elements.
    node: Range,  // Node to split, whose connections are defined by its offset and count in connectionIndicesInSortedElements
    elementIndexInNodeRange: number,  // Index at which the node would be split, as a value between 0 and node.count
    elementIndex: number  // Index of the element in the sorted list of elements corresponding to the split element
): number {
    let result = 0.0;
    // Each element has a range of connections in the graph, so we fetch those connections to accumulate the weight contributions
    const elementConnectionRange: Range = graph.nodes[elementIndex];

    // Iterate over the connections of the split element, and accumulate the weights of the connections with positive sign for the right side of the split and negative sign for the left side.
    for (let connectionIndexInRange = elementConnectionRange.offset; connectionIndexInRange < elementConnectionRange.offset + elementConnectionRange.count; ++connectionIndexInRange) {
        // Find the index of the connected element within the connections of the node to split
        const connectedElementIndexInNodeRange = connectionIndicesInSortedElements[connectionIndexInRange] - node.offset;
        // Fetch the weight of the connection between the split element and the current connnection
        const connectingWeight = graph.connectionWeights[connectionIndexInRange];

        // Skip connections to items not in stored in the connections for the split node
        if (connectedElementIndexInNodeRange >= node.count)
            continue;

        // #OLD Add the weight for the earlier connection and subtract it again for
        // #OLD the later connection in the sorted list of items. This is applied as
        // #OLD a gather operation. Since the graph is bidirectional and we only
        // #OLD consider internal connections within the node, itemIndex will be both
        // #OLD during iteration.
        // Add the weight of the connection, but with opposite sign depending on whether the current element is on the left or right side of the split
        result += (elementIndexInNodeRange < connectedElementIndexInNodeRange) ? connectingWeight : -connectingWeight;
    }
    return result;
}

// Compute an aggregate cost of splitting a node at the location splitPositionFromLeft within its element range, balancing multiple factors
// template <bool AlignBoth>
function splitCost(
    AlignBoth: boolean,
    input: Input,
    splitWeights: number[],  // Cost of the graph cut for each element in the node
    leftAabb: AABB,  // Bounding box of the elements on the left side of the split
    rightAabb: AABB,  // Bounding box of the elements on the right side of the split
    nodeSize: number,   // Number of elements in the node
    splitPositionFromLeft: number  // Location of the split, as the index of the first element in the right side of the split
): number {
    // Make leaves adhere to the min and max leaf size rule
    const acceptableRemainder: number = input.config.maxClusterSize - input.config.minClusterSize;
    const splitPositionFromRight: number = nodeSize - splitPositionFromLeft;
    const leftAlign: boolean = splitPositionFromLeft % input.config.minClusterSize <= (splitPositionFromLeft / input.config.minClusterSize) * acceptableRemainder;
    const rightAlign: boolean = splitPositionFromRight % input.config.minClusterSize <= (splitPositionFromRight / input.config.minClusterSize) * acceptableRemainder;

    let cost = Number.MAX_VALUE;
    // TODO: not always leftAlign if !AlignBoth?
    if (leftAlign && (!AlignBoth || rightAlign)) {
        const leftCost = sahCost(leftAabb, splitPositionFromLeft);
        const rightCost = sahCost(rightAabb, splitPositionFromRight);
        cost = leftCost + rightCost;

        // Increase cost for under-filled nodes (want more leaves
        // with maxClusterSize than minClusterSize)
        const leftItemCount = input.config.maxClusterSize * div_ceil(splitPositionFromLeft, input.config.maxClusterSize) - splitPositionFromLeft;
        const rightItemCount = input.config.maxClusterSize * div_ceil(splitPositionFromRight, input.config.maxClusterSize) - splitPositionFromRight;
        cost += sahCost(leftAabb, leftItemCount) * input.config.costUnderfill;
        cost += sahCost(rightAabb, rightItemCount) * input.config.costUnderfill;

        // Increase cost for lef/right bounding box overlap
        const intersection: AABB = aabbIntersect(leftAabb, rightAabb);
        cost += sahCost(intersection, nodeSize) * input.config.costOverlap;

        // Increase cost for weighted edge connections outside the
        // node and crossing the split plane.
        if (input.graph) {
            // Convert "ratio cut" values to SAH relative costs. Costs are all based on
            // SAH, a measure of trace cost for the bounding surface area. Shoehorning a
            // min-cut cost into the mix is problematic because the same metric needs to
            // work at various scales of node sizes and item counts. SAH scales with the
            // the number of items. The cut cost likely scales with the square root of the
            // number of items, assuming they form surfaces in the 3D space, but ratio cut
            // also normalizes by the item count. This attempts to undo that. A good way
            // to verify is to plot maximum costs against varying node sizes.
            const normalizeCutWeights = nodeSize * nodeSize;

            // "Ratio cut" - divide by the number of items in each
            // node to avoid degenerate cuts of just the first/last
            // items.
            const cutCost = splitWeights[splitPositionFromLeft];
            const ratioCutCost = cutCost / splitPositionFromLeft + cutCost / splitPositionFromRight;
            cost += ratioCutCost * normalizeCutWeights;
        }
    }


    return cost;
}

/**
 * @brief Returns the minimum cost split position for one axis. Takes some
 * temporary arrays as arguments to reuse allocations between passes.
 * @tparam Axis consider splits along (x, y, z), (0, 1, 2)
 * @tparam AlignBoth enforce Input::Config::minClusterSize and
 * Input::Config::maxClusterSize from both ends of the node or just one
 * @tparam ExecutionPolicy Optionally parallelize internally or externally
 *
 * Note: std algorithm and structures of arrays are used frequently due to the
 * convenience of std execution to parallelize steps.
 */
// template <int Axis, bool AlignBoth>
function findBestSplit(
    Axis: number,
    AlignBoth: boolean,
    input: Input,
    node: Range,
    sortedIndicesThisAxis: number[],
    nodeLeftBoxes: AABB[],   // size = node.count
    nodeRightBoxes: AABB[],  // size = node.count
    connectionIndicesInSortedElements: number[],
    deltaWeights: number[],    // size = node.count
    splitWeights: number[],    // size = node.count
    splitOut: Split
): Result {
    const elems: SpatialElements = input.spatialElements;
    const N = node.count;

    // 1) Build nodeLeftBoxes (exclusive prefix-scan)
    if (N > 0) {
        nodeLeftBoxes[0] = aabbEmpty();
        for (let i = 1; i < N; i++) {
            const prev = nodeLeftBoxes[i - 1];
            const box = elems.boundingBoxes[sortedIndicesThisAxis[i - 1]];
            nodeLeftBoxes[i] = aabbCombine(prev, box);
        }
    }

    // 2) nodeRightBoxes (inclusive scan from the right)
    if (N > 0) {
        nodeRightBoxes[N - 1] = elems.boundingBoxes[sortedIndicesThisAxis[N - 1]];
        for (let i = N - 2; i >= 0; i--) {
            // cast i+1 to size_t to avoid sign-conversion warnings
            const right = nodeRightBoxes[i + 1];
            const curr = elems.boundingBoxes[sortedIndicesThisAxis[i]];
            nodeRightBoxes[i] = aabbCombine(curr, right);
        }
    }

    // 3) adjacency prefix sum
    if (input.graph) {
        for (let i = 0; i < N; i++) {
            const elemIndex = sortedIndicesThisAxis[i];
            deltaWeights[i] = sumAdjacencyWeightsAtSplit(input.graph,
                connectionIndicesInSortedElements,
                node, i, elemIndex);
        }
        let runningSum = 0.0;
        for (let i = 0; i < N; i++) {
            splitWeights[i] = runningSum;
            runningSum += deltaWeights[i];
        }
        for (const w of splitWeights) {
            if (w >= 1e12)
                return Result.ERROR_WEIGHT_OVERFLOW;
        }
    }

    // 4) Evaluate cost for splits i = [1..N-1]
    let sumPosition = 0;
    let sumAxis = 0;
    let sumCost = 0;
    for (let i = 1; i < N; i++) {
        const candidate: Split = new Split();
        candidate.axis = Axis;
        candidate.position = i;
        candidate.cost = splitCost(AlignBoth, input, splitWeights, nodeLeftBoxes[i], nodeRightBoxes[i], N, i);
        splitOut.copy(minSplitCost(splitOut, candidate));

        sumAxis += candidate.axis;
        sumPosition += candidate.position;
        sumCost += candidate.cost;
    }

    return Result.SUCCESS;
}

// Find the lowest cost split on any axis, perform the split (partition
// sortedItems, maintaining order) and write two child nodes to the output.
function splitNode(
    input: Input,        // Input elements and adjacency graph
    temporaries: SplitNodeTemporaries,  // Temporary storage for the split node function
    node: Range,         // Range of elements in the node to split
    outNodes: Range[],  // Output nodes storage where child nodes will be added
    outNodesAlloc: {value: number}     // Current number of nodes in the output
): Result {
    // Slice structure of arrays by the current node's range
    const nodeLeftBoxes: AABB[] = temporaries.leftChildrenBoxes.slice(node.offset, node.offset + node.count);
    const nodeRightBoxes: AABB[] = temporaries.rightChildrenBoxes.slice(node.offset, node.offset + node.count);
    const nodeDeltaWeights: number[] = input.graph ? temporaries.deltaWeights.slice(node.offset, node.offset + node.count) : [];
    const nodeSplitWeights: number[] = input.graph ? temporaries.splitWeights.slice(node.offset, node.offset + node.count) : [];
    const sortedElementIndicesPerAxis: number[][] = [
        temporaries.sortedElementIndicesPerAxis[0].slice(node.offset, node.offset + node.count),
        temporaries.sortedElementIndicesPerAxis[1].slice(node.offset, node.offset + node.count),
        temporaries.sortedElementIndicesPerAxis[2].slice(node.offset, node.offset + node.count),
    ];

    // Find a split candidate by looking for the best split along each axis
    let split: Split = new Split();
    let splitResult: Result
    splitResult = findBestSplit(0, true, input, node, sortedElementIndicesPerAxis[0], nodeLeftBoxes, nodeRightBoxes, temporaries.connectionIndicesInSortedElements[0], nodeDeltaWeights, nodeSplitWeights, split);
    if (splitResult != Result.SUCCESS) {
        return splitResult;
    }

    splitResult = findBestSplit(1, true, input, node, sortedElementIndicesPerAxis[1], nodeLeftBoxes, nodeRightBoxes, temporaries.connectionIndicesInSortedElements[1], nodeDeltaWeights, nodeSplitWeights, split);
    if (splitResult != Result.SUCCESS) {
        return splitResult;
    }

    splitResult = findBestSplit(2, true, input, node, sortedElementIndicesPerAxis[2], nodeLeftBoxes, nodeRightBoxes, temporaries.connectionIndicesInSortedElements[2], nodeDeltaWeights, nodeSplitWeights, split);
    if (splitResult != Result.SUCCESS) {
        return splitResult;
    }

    // Item count is too small to make clusters between min/max size. Fall
    // back to aligning splits from the left so there should be just one
    // cluster outside the range. This should be rare.
    if (!split.valid()) {

        // console.log("HEEEEEEEE")
        splitResult = findBestSplit(0, false, input, node, sortedElementIndicesPerAxis[0], nodeLeftBoxes, nodeRightBoxes, temporaries.connectionIndicesInSortedElements[0], nodeDeltaWeights, nodeSplitWeights, split);
        if (splitResult != Result.SUCCESS) {
            return splitResult;
        }

        splitResult = findBestSplit(1, false, input, node, sortedElementIndicesPerAxis[1], nodeLeftBoxes, nodeRightBoxes, temporaries.connectionIndicesInSortedElements[1], nodeDeltaWeights, nodeSplitWeights, split);
        if (splitResult != Result.SUCCESS) {
            return splitResult;
        }

        splitResult = findBestSplit(2, false, input, node, sortedElementIndicesPerAxis[2], nodeLeftBoxes, nodeRightBoxes, temporaries.connectionIndicesInSortedElements[2], nodeDeltaWeights, nodeSplitWeights, split);
        if (splitResult != Result.SUCCESS) {
            return splitResult;
        }
    }

    if (split.position <= 0 || split.position >= sortedElementIndicesPerAxis[0].length || split.position >= node.count) {
        return Result.ERROR_INTERNAL;
    }

    // Split the node at the chosen axis and position
    partitionAtSplit(sortedElementIndicesPerAxis, split.axis, split.position, temporaries.partitionSides);
    outNodes[outNodesAlloc.value + 0] = new Range(node.offset, split.position);
    outNodes[outNodesAlloc.value + 1] = new Range(node.offset + split.position, node.count - split.position);
    outNodesAlloc.value += 2;

    // console.log(`    splitNode[outNodes]: [ Range { offset: ${node.offset}, count: ${split.position}}, Range { offset: ${node.offset + split.position}, count: ${node.count - split.position}} ]`);

    return Result.SUCCESS;
};

// For each element in the sorted list of elements along an axis, identify the indices of its connected elements in the sorted list of elements.
// This is done by linearly searching through the list of secondary connections for each element, and scattering the index of the current node in the sorted list
// in the lists of secondary connections. At the end of the function connectionIndicesInSortedElements will contain the indices of the connected elements in the sorted list of elements.
function buildAdjacencyInSortedList(
    input: Input,
    sortedElementIndices: number[],
    connectionIndicesInSortedElements: number[],
    backMapping: number[]
) {
    // fill backMapping: element -> index in sortedElementIndices
    for (let i = 0; i < sortedElementIndices.length; i++) {
        const elem = sortedElementIndices[i];
        backMapping[elem] = i;
    }
    // rewrite the connection targets
    const g: Graph = input.graph;
    for (let i = 0; i < g.connectionCount; i++) {
        const tgt = g.connectionTargets[i];
        connectionIndicesInSortedElements[i] = backMapping[tgt];
    }
}

// into clusters using a kD-Tree-based decomposition
export function clusterize(input: Input, clusters: Output  // Output set of clusters
): Result {
    if (input.config.minClusterSize <= 0 || input.config.maxClusterSize <= 0 || input.config.minClusterSize > input.config.maxClusterSize) {
        return Result.ERROR_INVALID_CONFIG;
    }
    if (!input.spatialElements || input.spatialElements.elementCount != clusters.clusteredElementIndexCount) {
        return Result.ERROR_INVALID_BOUNDS;
    }

    const spatialElements: SpatialElements = input.spatialElements;
    // Early out if there are no elements to cluster. This can happen using the segmented clustering
    // FIXME: why is that?
    if (spatialElements.elementCount == 0) {
        return Result.SUCCESS;
    }

    let outputSizes = new Requirements();
    // Initialize the output sizes: at the beginning no cluster has been created
    outputSizes.maxClusterCount = 0;
    // We already know the list of all the elements referenced by the clusters has the same size
    // as the list of input spatial elements since each of them will be referenced by exactly one cluster
    outputSizes.maxClusteredElementCount = spatialElements.elementCount;


    // Temporary data
    // Used to mark the elements as belonging to the left (1) or right (0) side of the split
    let partitionSides: number[] = new Array(spatialElements.elementCount).fill(0);
    // Bouding boxes of the left children of the currently processed node
    let leftChildrenBoxes: AABB[] = new Array(spatialElements.elementCount).fill(null).map(() => new AABB());
    // Bouding boxes of the right children of the currently processed node
    let rightChildrenBoxes: AABB[] = new Array(spatialElements.elementCount).fill(null).map(() => new AABB());
    // Difference of adjacency weights for each element due to a split at an element
    let deltaWeights: number[] = [];
    // Adjacency weights resulting from a split at an element
    let splitWeights: number[] = [];
    // For each element, stores the index of its connected elements in the sorted list of elements
    let connectionIndicesInSortedElements: number[][] = new Array(3).fill(null).map(() => []);

    // The kD-tree will split the array of spatial elements recursively along the X, Y and Z axes. In order to
    // run the splitting algorithm we first need to sort the input spatial elements along each of those axis,
    // so the splitting will only require a simple partitioning.
    // In order to save memory we will use the storage area for the resulting clustered element indices as a temporary storage
    // for the indices of elements sorted along the X axis.
    let sortedY: number[] = new Array(clusters.clusteredElementIndexCount).fill(0);
    let sortedZ: number[] = new Array(clusters.clusteredElementIndexCount).fill(0);
    // Initialize the array of per-axis element indices so each entry references one element
    for (let i = 0; i < clusters.clusteredElementIndexCount; i++) {
        clusters.clusteredElementIndices[i] = i;
        sortedY[i] = i;
        sortedZ[i] = i;
    }

    // Sort the elements along the X, Y and Z axes based on the location of their centroids.
    // As mentioned above the storage area for the output clustered element indices is used as a temporary storage for the sorted indices along the X axis
    //   std::span<uint32_t> sortedElementIndicesPerAxis[3]{
    //       std::span<uint32_t>(clusters.clusteredElementIndices, clusters.clusteredElementIndexCount), sortedY, sortedZ
    //     };

    const sortedElementIndicesPerAxis: number[][] = [
        // clusters.clusteredElementIndices.slice(0, clusters.clusteredElementIndexCount),
        createArrayView(clusters.clusteredElementIndices, 0, clusters.clusteredElementIndexCount),
        sortedY,
        sortedZ
    ];

    {
        // std::sort(sortedElementIndicesPerAxis[0].begin(),
        //           sortedElementIndicesPerAxis[0].end(), CentroidCompare<0>(spatialElements));
        // std::sort(sortedElementIndicesPerAxis[1].begin(),
        //           sortedElementIndicesPerAxis[1].end(), CentroidCompare<1>(spatialElements));
        // std::sort(sortedElementIndicesPerAxis[2].begin(),
        //           sortedElementIndicesPerAxis[2].end(), CentroidCompare<2>(spatialElements));

        sortedElementIndicesPerAxis[0].sort(createCentroidComparator(0, spatialElements));
        sortedElementIndicesPerAxis[1].sort(createCentroidComparator(1, spatialElements));
        sortedElementIndicesPerAxis[2].sort(createCentroidComparator(2, spatialElements));

    }

    // Temporary data for connectivity costs
    if (input.graph) {
        if (input.graph.nodeCount != spatialElements.elementCount) {
            return Result.ERROR_INVALID_GRAPH;
        }
        resizeArray(deltaWeights, spatialElements.elementCount, () => 0);
        resizeArray(splitWeights, spatialElements.elementCount, () => 0);

        // Maintain graph adjacency within in each sortedItems array to avoid
        // expensive searches when computing the split costs.
        for (let axis = 0; axis < 3; ++axis) {
            resizeArray(connectionIndicesInSortedElements[axis], input.graph.connectionCount, () => 0);
        }
    }

    // BVH style recursive bisection. Split nodes recursively until they have the
    // desired number of items. Unlike a BVH build, the hierarchy is not stored
    // and leaf nodes are immediately emitted as clusters. The current list of
    // nodes is double buffered nodes for each level.
    let perNodeElementIndexRanges: Range[][] = [[], []];
    //   perNodeElementIndexRanges[0].reserve((2 * spatialElements.elementCount) / input.config.maxClusterSize);
    //   perNodeElementIndexRanges[1].reserve((2 * spatialElements.elementCount) / input.config.maxClusterSize);
    // perNodeElementIndexRanges[0] = new Array(Math.floor((2 * spatialElements.elementCount) / input.config.maxClusterSize)).fill(null).map(() => new Range());
    // perNodeElementIndexRanges[1] = new Array(Math.floor((2 * spatialElements.elementCount) / input.config.maxClusterSize)).fill(null).map(() => new Range());

    let currentNodeRangeList = 0;
    let nextNodeRangeList = 1;
    let underflowClusters = 0;
    const sanitizedPreSplitThreshold = Math.max(input.config.preSplitThreshold, input.config.maxClusterSize * 2);

    if (input.config.preSplitThreshold == 0 || spatialElements.elementCount < sanitizedPreSplitThreshold) {
        perNodeElementIndexRanges[currentNodeRangeList].push(new Range(0, spatialElements.elementCount));
    }
    else {
        // Performance optimization. If there are more than preSplitThreshold items in the root node,
        // create child nodes by performing simple median splits on the input element lists until each node contains a maximum of sanitizedPreSplitThreshold elements.
        // This reduces the overally computational cost of the BVH build by applying the more accurate (and costly) node splitting algorithm only on smaller nodes.
        splitAtMedianUntil(input.spatialElements, partitionSides, sortedElementIndicesPerAxis, sanitizedPreSplitThreshold, 0, perNodeElementIndexRanges[currentNodeRangeList]);
    }

    // Bisect nodes until no internal nodes are left. The nodes array is double buffered
    // for simplicity - could also be a thread safe queue. Leaf nodes are removed
    // and written to the output.
    let backmapping: number[][] = new Array(3).fill(null).map(() => []);

    for (let i = 0; i < 3; i++) {
        resizeArray(backmapping[i], sortedElementIndicesPerAxis.length, () => 0);
    }

    while (perNodeElementIndexRanges[currentNodeRangeList].length !== 0) {
        // If connectivity is used, convert connected indices to sorted item indices
        // to get constant lookup time for items within nodes.
        if (input.graph != undefined) {
            for (let axis = 0; axis < 3; ++axis) {
                buildAdjacencyInSortedList(input, sortedElementIndicesPerAxis[axis], connectionIndicesInSortedElements[axis], backmapping[axis]);
            }
        }

        let nodesBAlloc = {value: 0};
        resizeArray(perNodeElementIndexRanges[nextNodeRangeList], perNodeElementIndexRanges[nextNodeRangeList].length, () => new Range());

        const intermediates: SplitNodeTemporaries = new SplitNodeTemporaries()
        intermediates.partitionSides = createArrayView(partitionSides, 0, partitionSides.length);
        intermediates.leftChildrenBoxes = createArrayView(leftChildrenBoxes, 0, leftChildrenBoxes.length);
        intermediates.rightChildrenBoxes = createArrayView(rightChildrenBoxes, 0, rightChildrenBoxes.length);
        intermediates.deltaWeights = createArrayView(deltaWeights, 0, deltaWeights.length);
        intermediates.splitWeights = createArrayView(splitWeights, 0, splitWeights.length);
        // intermediates.connectionIndicesInSortedElements = [connectionIndicesInSortedElements[0], connectionIndicesInSortedElements[1], connectionIndicesInSortedElements[2]];
        intermediates.connectionIndicesInSortedElements = [
            createArrayView(connectionIndicesInSortedElements[0], 0, connectionIndicesInSortedElements[0].length),
            createArrayView(connectionIndicesInSortedElements[1], 0, connectionIndicesInSortedElements[1].length),
            createArrayView(connectionIndicesInSortedElements[2], 0, connectionIndicesInSortedElements[2].length),
        ];
        // intermediates.sortedElementIndicesPerAxis = [sortedElementIndicesPerAxis[0], sortedElementIndicesPerAxis[1], sortedElementIndicesPerAxis[2]];
        intermediates.sortedElementIndicesPerAxis = [
            createArrayView(sortedElementIndicesPerAxis[0], 0, sortedElementIndicesPerAxis[0].length),
            createArrayView(sortedElementIndicesPerAxis[1], 0, sortedElementIndicesPerAxis[1].length),
            createArrayView(sortedElementIndicesPerAxis[2], 0, sortedElementIndicesPerAxis[2].length)
        ];

        // Process all nodes in the current level.
        {
            let result: Result = Result.SUCCESS;
            // NVCLUSTER_PARALLEL_FOR_BEGIN(parallelItemIndex, perNodeElementIndexRanges[currentNodeRangeList].size(), 1)
            for (let parallelItemIndex = 0; parallelItemIndex < perNodeElementIndexRanges[currentNodeRangeList].length; parallelItemIndex++) {
                if (result != Result.SUCCESS) {
                    break;
                }
                const node: Range = perNodeElementIndexRanges[currentNodeRangeList][parallelItemIndex];
                // Emit leaf nodes and split internal nodes
                if (node.count <= input.config.maxClusterSize) {
                    if (node.count == 0) {
                        result = Result.ERROR_INTERNAL;
                        break;
                    }
                    clusters.clusterRanges[outputSizes.maxClusterCount++] = node;
                    if (node.count < input.config.minClusterSize) {
                        underflowClusters++;
                    }
                }
                else {
                    let res: Result = splitNode(input, intermediates, node, perNodeElementIndexRanges[nextNodeRangeList], nodesBAlloc);

                    // clusters.clusteredElementIndices = intermediates.sortedElementIndicesPerAxis[0];
                    clusters.clusteredElementIndices[0] = intermediates.sortedElementIndicesPerAxis[0][0];
                    clusters.clusteredElementIndices[1] = intermediates.sortedElementIndicesPerAxis[0][1];
                    clusters.clusteredElementIndices[2] = intermediates.sortedElementIndicesPerAxis[0][2];
                    clusters.clusteredElementIndices[3] = intermediates.sortedElementIndicesPerAxis[0][3];

                    if (res != Result.SUCCESS) {
                        result = res;
                        break;
                    }
                }
            }
            if (result != Result.SUCCESS) {
                return result;
            }
        }

        resizeArray(perNodeElementIndexRanges[nextNodeRangeList], nodesBAlloc.value, () => new Range());
        perNodeElementIndexRanges[currentNodeRangeList] = [];

        currentNodeRangeList = (currentNodeRangeList + 1) % 2;
        nextNodeRangeList = (nextNodeRangeList + 1) % 2;
    }

    // It is possible to have less than the minimum number of items per cluster,
    // but there should be at most one.
    if (input.config.preSplitThreshold == 0) {
        if (underflowClusters > 1) {
            return Result.ERROR_INTERNAL;
        }
    }
    else {
        if (underflowClusters > div_ceil(spatialElements.elementCount, sanitizedPreSplitThreshold)) {
            return Result.ERROR_INTERNAL;
        }
    }

    clusters.clusteredElementIndexCount = outputSizes.maxClusteredElementCount;
    clusters.clusterCount = outputSizes.maxClusterCount;

    return Result.SUCCESS;
}