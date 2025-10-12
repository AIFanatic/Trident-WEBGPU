import { Result, Requirements, AABB, Range } from './nvcluster.js';
import { createArrayView, resizeArray } from './nvclusterlod_common.js';

class SplitNodeTemporaries {
  // Identification of the side on which each element lies when splitting a node (left = 1, right = 0)
  partitionSides;
  // Bounding boxes of the left children of the currently processed node
  leftChildrenBoxes;
  // Bounding boxes of the right children of the currently processed node
  rightChildrenBoxes;
  deltaWeights;
  splitWeights;
  connectionIndicesInSortedElements;
  sortedElementIndicesPerAxis;
}
class Split {
  axis = -1;
  position = Number.MAX_VALUE;
  // index of first item in the right node
  cost = Number.MAX_VALUE;
  valid() {
    return this.axis !== -1;
  }
  lessThan(other) {
    return this.cost < other.cost;
  }
  copy(other) {
    this.axis = other.axis;
    this.position = other.position;
    this.cost = other.cost;
  }
}
function div_ceil(a, b) {
  return Math.floor((a + b - 1) / b);
}
function aabbSize(aabb, size) {
  for (let i = 0; i < 3; i++) {
    size[i] = aabb.bboxMax[i] - aabb.bboxMin[i];
  }
}
function aabbCombine(a, b) {
  let result = new AABB();
  for (let i = 0; i < 3; i++) {
    result.bboxMin[i] = a.bboxMin[i] < b.bboxMin[i] ? a.bboxMin[i] : b.bboxMin[i];
    result.bboxMax[i] = a.bboxMax[i] > b.bboxMax[i] ? a.bboxMax[i] : b.bboxMax[i];
  }
  return result;
}
function aabbIntersect(a, b) {
  let result = new AABB();
  for (let i = 0; i < 3; i++) {
    result.bboxMin[i] = Math.max(a.bboxMin[i], b.bboxMin[i]);
    result.bboxMax[i] = Math.min(a.bboxMax[i], b.bboxMax[i]);
  }
  for (let i = 0; i < 3; i++) {
    let s = result.bboxMax[i] - result.bboxMin[i];
    s = s < 0 ? 0 : s;
    result.bboxMax[i] = result.bboxMin[i] + s;
  }
  return result;
}
function aabbEmpty() {
  let result = new AABB();
  for (let i = 0; i < 3; i++) {
    result.bboxMin[i] = Number.MAX_VALUE;
    result.bboxMax[i] = -Number.MAX_VALUE;
  }
  return result;
}
function createCentroidComparator(axis, spatialElements) {
  const A0 = axis;
  const A1 = (axis + 1) % 3;
  const A2 = (axis + 2) % 3;
  return (itemA, itemB) => {
    const centroids = spatialElements.centroids;
    const indexA = itemA * 3;
    const indexB = itemB * 3;
    const a0 = centroids[indexA + A0];
    const b0 = centroids[indexB + A0];
    if (a0 < b0) return -1;
    if (a0 > b0) return 1;
    const a1 = centroids[indexA + A1];
    const b1 = centroids[indexB + A1];
    if (a1 < b1) return -1;
    if (a1 > b1) return 1;
    const a2 = centroids[indexA + A2];
    const b2 = centroids[indexB + A2];
    if (a2 < b2) return -1;
    if (a2 > b2) return 1;
    return 0;
  };
}
function stablePartitionInPlace(arr, predicate) {
  const truePart = [];
  const falsePart = [];
  for (const elem of arr) {
    if (predicate(elem)) {
      truePart.push(elem);
    } else {
      falsePart.push(elem);
    }
  }
  const totalLength = truePart.length + falsePart.length;
  for (let i = 0; i < truePart.length; i++) {
    arr[i] = truePart[i];
  }
  for (let j = 0; j < falsePart.length; j++) {
    arr[truePart.length + j] = falsePart[j];
  }
  arr.length = totalLength;
}
function partitionAtSplit(sortedElementIndicesPerAxis, splitAxis, splitPosition, partitionSides) {
  const sortedThisAxis = sortedElementIndicesPerAxis[splitAxis];
  for (let i = 0; i < sortedThisAxis.length; i++) {
    const idx = sortedThisAxis[i];
    partitionSides[idx] = i < splitPosition ? 1 : 0;
  }
  for (let ax = 0; ax < 3; ax++) {
    if (ax == splitAxis) continue;
    const arr = sortedElementIndicesPerAxis[ax];
    stablePartitionInPlace(arr, (idx) => partitionSides[idx] !== 0);
  }
}
function splitAtMedianUntil(spatialElements, partitionSides, nodeSortedElementIndicesPerAxis, maxElementsPerNode, nodeStartIndex, perNodeElementRanges) {
  const nodeCount = nodeSortedElementIndicesPerAxis[0].length;
  if (nodeCount < maxElementsPerNode) {
    perNodeElementRanges.push(new Range(nodeStartIndex, nodeCount));
    return;
  }
  const aabb = new AABB();
  aabb.bboxMin = [
    spatialElements.centroids[3 * nodeSortedElementIndicesPerAxis[0][0] + 0],
    spatialElements.centroids[3 * nodeSortedElementIndicesPerAxis[1][0] + 1],
    spatialElements.centroids[3 * nodeSortedElementIndicesPerAxis[2][0] + 2]
  ], aabb.bboxMax = [
    spatialElements.centroids[3 * nodeSortedElementIndicesPerAxis[0][nodeSortedElementIndicesPerAxis[0].length - 1] + 0],
    spatialElements.centroids[3 * nodeSortedElementIndicesPerAxis[1][nodeSortedElementIndicesPerAxis[1].length - 1] + 1],
    spatialElements.centroids[3 * nodeSortedElementIndicesPerAxis[2][nodeSortedElementIndicesPerAxis[2].length - 1] + 2]
  ];
  let size = new Array(3).fill(0);
  aabbSize(aabb, size);
  const axis = size[0] > size[1] && size[0] > size[2] ? 0 : size[1] > size[2] ? 1 : 2;
  const splitPosition = nodeCount / 2;
  partitionAtSplit(nodeSortedElementIndicesPerAxis, axis, splitPosition, partitionSides);
  const left = [
    nodeSortedElementIndicesPerAxis[0].slice(0, splitPosition),
    nodeSortedElementIndicesPerAxis[1].slice(0, splitPosition),
    nodeSortedElementIndicesPerAxis[2].slice(0, splitPosition)
  ];
  const right = [
    nodeSortedElementIndicesPerAxis[0].slice(splitPosition),
    nodeSortedElementIndicesPerAxis[1].slice(splitPosition),
    nodeSortedElementIndicesPerAxis[2].slice(splitPosition)
  ];
  splitAtMedianUntil(spatialElements, partitionSides, left, maxElementsPerNode, nodeStartIndex, perNodeElementRanges);
  splitAtMedianUntil(spatialElements, partitionSides, right, maxElementsPerNode, nodeStartIndex + splitPosition, perNodeElementRanges);
}
function minSplitCost(a, b) {
  return b.lessThan(a) ? b : a;
}
function sahCost(aabb, elementCount) {
  const dx = aabb.bboxMax[0] - aabb.bboxMin[0];
  const dy = aabb.bboxMax[1] - aabb.bboxMin[1];
  const dz = aabb.bboxMax[2] - aabb.bboxMin[2];
  const halfArea = dx * (dy + dz) + dy * dz;
  return halfArea * elementCount;
}
function sumAdjacencyWeightsAtSplit(graph, connectionIndicesInSortedElements, node, elementIndexInNodeRange, elementIndex) {
  let result = 0;
  const elementConnectionRange = graph.nodes[elementIndex];
  for (let connectionIndexInRange = elementConnectionRange.offset; connectionIndexInRange < elementConnectionRange.offset + elementConnectionRange.count; ++connectionIndexInRange) {
    const connectedElementIndexInNodeRange = connectionIndicesInSortedElements[connectionIndexInRange] - node.offset;
    const connectingWeight = graph.connectionWeights[connectionIndexInRange];
    if (connectedElementIndexInNodeRange >= node.count)
      continue;
    result += elementIndexInNodeRange < connectedElementIndexInNodeRange ? connectingWeight : -connectingWeight;
  }
  return result;
}
function splitCost(AlignBoth, input, splitWeights, leftAabb, rightAabb, nodeSize, splitPositionFromLeft) {
  const acceptableRemainder = input.config.maxClusterSize - input.config.minClusterSize;
  const splitPositionFromRight = nodeSize - splitPositionFromLeft;
  const leftAlign = splitPositionFromLeft % input.config.minClusterSize <= splitPositionFromLeft / input.config.minClusterSize * acceptableRemainder;
  const rightAlign = splitPositionFromRight % input.config.minClusterSize <= splitPositionFromRight / input.config.minClusterSize * acceptableRemainder;
  let cost = Number.MAX_VALUE;
  if (leftAlign && (!AlignBoth || rightAlign)) {
    const leftCost = sahCost(leftAabb, splitPositionFromLeft);
    const rightCost = sahCost(rightAabb, splitPositionFromRight);
    cost = leftCost + rightCost;
    const leftItemCount = input.config.maxClusterSize * div_ceil(splitPositionFromLeft, input.config.maxClusterSize) - splitPositionFromLeft;
    const rightItemCount = input.config.maxClusterSize * div_ceil(splitPositionFromRight, input.config.maxClusterSize) - splitPositionFromRight;
    cost += sahCost(leftAabb, leftItemCount) * input.config.costUnderfill;
    cost += sahCost(rightAabb, rightItemCount) * input.config.costUnderfill;
    const intersection = aabbIntersect(leftAabb, rightAabb);
    cost += sahCost(intersection, nodeSize) * input.config.costOverlap;
    if (input.graph) {
      const normalizeCutWeights = nodeSize * nodeSize;
      const cutCost = splitWeights[splitPositionFromLeft];
      const ratioCutCost = cutCost / splitPositionFromLeft + cutCost / splitPositionFromRight;
      cost += ratioCutCost * normalizeCutWeights;
    }
  }
  return cost;
}
function findBestSplit(Axis, AlignBoth, input, node, sortedIndicesThisAxis, nodeLeftBoxes, nodeRightBoxes, connectionIndicesInSortedElements, deltaWeights, splitWeights, splitOut) {
  const elems = input.spatialElements;
  const N = node.count;
  if (N > 0) {
    nodeLeftBoxes[0] = aabbEmpty();
    for (let i = 1; i < N; i++) {
      const prev = nodeLeftBoxes[i - 1];
      const box = elems.boundingBoxes[sortedIndicesThisAxis[i - 1]];
      nodeLeftBoxes[i] = aabbCombine(prev, box);
    }
  }
  if (N > 0) {
    nodeRightBoxes[N - 1] = elems.boundingBoxes[sortedIndicesThisAxis[N - 1]];
    for (let i = N - 2; i >= 0; i--) {
      const right = nodeRightBoxes[i + 1];
      const curr = elems.boundingBoxes[sortedIndicesThisAxis[i]];
      nodeRightBoxes[i] = aabbCombine(curr, right);
    }
  }
  if (input.graph) {
    for (let i = 0; i < N; i++) {
      const elemIndex = sortedIndicesThisAxis[i];
      deltaWeights[i] = sumAdjacencyWeightsAtSplit(
        input.graph,
        connectionIndicesInSortedElements,
        node,
        i,
        elemIndex
      );
    }
    let runningSum = 0;
    for (let i = 0; i < N; i++) {
      splitWeights[i] = runningSum;
      runningSum += deltaWeights[i];
    }
    for (const w of splitWeights) {
      if (w >= 1e12)
        return Result.ERROR_WEIGHT_OVERFLOW;
    }
  }
  let sumPosition = 0;
  let sumAxis = 0;
  let sumCost = 0;
  for (let i = 1; i < N; i++) {
    const candidate = new Split();
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
function splitNode(input, temporaries, node, outNodes, outNodesAlloc) {
  const nodeLeftBoxes = temporaries.leftChildrenBoxes.slice(node.offset, node.offset + node.count);
  const nodeRightBoxes = temporaries.rightChildrenBoxes.slice(node.offset, node.offset + node.count);
  const nodeDeltaWeights = input.graph ? temporaries.deltaWeights.slice(node.offset, node.offset + node.count) : [];
  const nodeSplitWeights = input.graph ? temporaries.splitWeights.slice(node.offset, node.offset + node.count) : [];
  const sortedElementIndicesPerAxis = [
    temporaries.sortedElementIndicesPerAxis[0].slice(node.offset, node.offset + node.count),
    temporaries.sortedElementIndicesPerAxis[1].slice(node.offset, node.offset + node.count),
    temporaries.sortedElementIndicesPerAxis[2].slice(node.offset, node.offset + node.count)
  ];
  let split = new Split();
  let splitResult;
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
  if (!split.valid()) {
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
  partitionAtSplit(sortedElementIndicesPerAxis, split.axis, split.position, temporaries.partitionSides);
  outNodes[outNodesAlloc.value + 0] = new Range(node.offset, split.position);
  outNodes[outNodesAlloc.value + 1] = new Range(node.offset + split.position, node.count - split.position);
  outNodesAlloc.value += 2;
  return Result.SUCCESS;
}
function buildAdjacencyInSortedList(input, sortedElementIndices, connectionIndicesInSortedElements, backMapping) {
  for (let i = 0; i < sortedElementIndices.length; i++) {
    const elem = sortedElementIndices[i];
    backMapping[elem] = i;
  }
  const g = input.graph;
  for (let i = 0; i < g.connectionCount; i++) {
    const tgt = g.connectionTargets[i];
    connectionIndicesInSortedElements[i] = backMapping[tgt];
  }
}
function clusterize(input, clusters) {
  if (input.config.minClusterSize <= 0 || input.config.maxClusterSize <= 0 || input.config.minClusterSize > input.config.maxClusterSize) {
    return Result.ERROR_INVALID_CONFIG;
  }
  if (!input.spatialElements || input.spatialElements.elementCount != clusters.clusteredElementIndexCount) {
    return Result.ERROR_INVALID_BOUNDS;
  }
  const spatialElements = input.spatialElements;
  if (spatialElements.elementCount == 0) {
    return Result.SUCCESS;
  }
  let outputSizes = new Requirements();
  outputSizes.maxClusterCount = 0;
  outputSizes.maxClusteredElementCount = spatialElements.elementCount;
  let partitionSides = new Array(spatialElements.elementCount).fill(0);
  let leftChildrenBoxes = new Array(spatialElements.elementCount).fill(null).map(() => new AABB());
  let rightChildrenBoxes = new Array(spatialElements.elementCount).fill(null).map(() => new AABB());
  let deltaWeights = [];
  let splitWeights = [];
  let connectionIndicesInSortedElements = new Array(3).fill(null).map(() => []);
  let sortedY = new Array(clusters.clusteredElementIndexCount).fill(0);
  let sortedZ = new Array(clusters.clusteredElementIndexCount).fill(0);
  for (let i = 0; i < clusters.clusteredElementIndexCount; i++) {
    clusters.clusteredElementIndices[i] = i;
    sortedY[i] = i;
    sortedZ[i] = i;
  }
  const sortedElementIndicesPerAxis = [
    // clusters.clusteredElementIndices.slice(0, clusters.clusteredElementIndexCount),
    createArrayView(clusters.clusteredElementIndices, 0, clusters.clusteredElementIndexCount),
    sortedY,
    sortedZ
  ];
  {
    sortedElementIndicesPerAxis[0].sort(createCentroidComparator(0, spatialElements));
    sortedElementIndicesPerAxis[1].sort(createCentroidComparator(1, spatialElements));
    sortedElementIndicesPerAxis[2].sort(createCentroidComparator(2, spatialElements));
  }
  if (input.graph) {
    if (input.graph.nodeCount != spatialElements.elementCount) {
      return Result.ERROR_INVALID_GRAPH;
    }
    resizeArray(deltaWeights, spatialElements.elementCount, () => 0);
    resizeArray(splitWeights, spatialElements.elementCount, () => 0);
    for (let axis = 0; axis < 3; ++axis) {
      resizeArray(connectionIndicesInSortedElements[axis], input.graph.connectionCount, () => 0);
    }
  }
  let perNodeElementIndexRanges = [[], []];
  let currentNodeRangeList = 0;
  let nextNodeRangeList = 1;
  let underflowClusters = 0;
  const sanitizedPreSplitThreshold = Math.max(input.config.preSplitThreshold, input.config.maxClusterSize * 2);
  if (input.config.preSplitThreshold == 0 || spatialElements.elementCount < sanitizedPreSplitThreshold) {
    perNodeElementIndexRanges[currentNodeRangeList].push(new Range(0, spatialElements.elementCount));
  } else {
    splitAtMedianUntil(input.spatialElements, partitionSides, sortedElementIndicesPerAxis, sanitizedPreSplitThreshold, 0, perNodeElementIndexRanges[currentNodeRangeList]);
  }
  let backmapping = new Array(3).fill(null).map(() => []);
  for (let i = 0; i < 3; i++) {
    resizeArray(backmapping[i], sortedElementIndicesPerAxis.length, () => 0);
  }
  while (perNodeElementIndexRanges[currentNodeRangeList].length !== 0) {
    if (input.graph != void 0) {
      for (let axis = 0; axis < 3; ++axis) {
        buildAdjacencyInSortedList(input, sortedElementIndicesPerAxis[axis], connectionIndicesInSortedElements[axis], backmapping[axis]);
      }
    }
    let nodesBAlloc = { value: 0 };
    resizeArray(perNodeElementIndexRanges[nextNodeRangeList], perNodeElementIndexRanges[nextNodeRangeList].length, () => new Range());
    const intermediates = new SplitNodeTemporaries();
    intermediates.partitionSides = createArrayView(partitionSides, 0, partitionSides.length);
    intermediates.leftChildrenBoxes = createArrayView(leftChildrenBoxes, 0, leftChildrenBoxes.length);
    intermediates.rightChildrenBoxes = createArrayView(rightChildrenBoxes, 0, rightChildrenBoxes.length);
    intermediates.deltaWeights = createArrayView(deltaWeights, 0, deltaWeights.length);
    intermediates.splitWeights = createArrayView(splitWeights, 0, splitWeights.length);
    intermediates.connectionIndicesInSortedElements = [
      createArrayView(connectionIndicesInSortedElements[0], 0, connectionIndicesInSortedElements[0].length),
      createArrayView(connectionIndicesInSortedElements[1], 0, connectionIndicesInSortedElements[1].length),
      createArrayView(connectionIndicesInSortedElements[2], 0, connectionIndicesInSortedElements[2].length)
    ];
    intermediates.sortedElementIndicesPerAxis = [
      createArrayView(sortedElementIndicesPerAxis[0], 0, sortedElementIndicesPerAxis[0].length),
      createArrayView(sortedElementIndicesPerAxis[1], 0, sortedElementIndicesPerAxis[1].length),
      createArrayView(sortedElementIndicesPerAxis[2], 0, sortedElementIndicesPerAxis[2].length)
    ];
    {
      let result = Result.SUCCESS;
      for (let parallelItemIndex = 0; parallelItemIndex < perNodeElementIndexRanges[currentNodeRangeList].length; parallelItemIndex++) {
        if (result != Result.SUCCESS) {
          break;
        }
        const node = perNodeElementIndexRanges[currentNodeRangeList][parallelItemIndex];
        if (node.count <= input.config.maxClusterSize) {
          if (node.count == 0) {
            result = Result.ERROR_INTERNAL;
            break;
          }
          clusters.clusterRanges[outputSizes.maxClusterCount++] = node;
          if (node.count < input.config.minClusterSize) {
            underflowClusters++;
          }
        } else {
          let res = splitNode(input, intermediates, node, perNodeElementIndexRanges[nextNodeRangeList], nodesBAlloc);
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
  if (input.config.preSplitThreshold == 0) {
    if (underflowClusters > 1) {
      return Result.ERROR_INTERNAL;
    }
  } else {
    if (underflowClusters > div_ceil(spatialElements.elementCount, sanitizedPreSplitThreshold)) {
      return Result.ERROR_INTERNAL;
    }
  }
  clusters.clusteredElementIndexCount = outputSizes.maxClusteredElementCount;
  clusters.clusterCount = outputSizes.maxClusterCount;
  return Result.SUCCESS;
}

export { clusterize };
