import { Range, ClusterGetRequirementsSegmentedInfo, nvclusterGetRequirementsSegmented, Result, Requirements, ClusterCreateSegmentedInfo, Output, nvclustersCreateSegmented } from './nvcluster.js';
import { resizeArray } from './nvclusterlod_common.js';

class ClusterStorage {
  clusterRanges = [];
  clusterItems = [];
}
class SegmentedClusterStorage {
  clusterRangeSegments = [];
  clusterRanges = [];
  clusterItems = [];
}
function generateSegmentedClusters(input, itemSegments, itemSegmentCount, segmentedClusterStorage) {
  resizeArray(segmentedClusterStorage.clusterRangeSegments, itemSegmentCount, () => new Range());
  let info = new ClusterGetRequirementsSegmentedInfo();
  info.input = input;
  info.elementSegmentCount = itemSegmentCount;
  info.elementSegments = itemSegments;
  let reqs = new Requirements();
  let result = nvclusterGetRequirementsSegmented(info, reqs);
  if (result != Result.SUCCESS) {
    return result;
  }
  resizeArray(segmentedClusterStorage.clusterRanges, reqs.maxClusterCount, () => new Range());
  resizeArray(segmentedClusterStorage.clusterItems, reqs.maxClusteredElementCount, () => 0);
  let createInfo = new ClusterCreateSegmentedInfo();
  createInfo.input = input;
  createInfo.elementSegmentCount = itemSegmentCount;
  createInfo.elementSegments = itemSegments;
  let clusters = new Output();
  clusters.clusteredElementIndices = segmentedClusterStorage.clusterItems;
  clusters.clusterRanges = segmentedClusterStorage.clusterRanges;
  clusters.clusterCount = reqs.maxClusterCount;
  clusters.clusteredElementIndexCount = reqs.maxClusteredElementCount;
  result = nvclustersCreateSegmented(createInfo, clusters, segmentedClusterStorage.clusterRangeSegments);
  if (result == Result.SUCCESS) {
    resizeArray(segmentedClusterStorage.clusterRanges, clusters.clusterCount, () => new Range());
    resizeArray(segmentedClusterStorage.clusterItems, clusters.clusteredElementIndexCount, () => 0);
  }
  return result;
}

export { ClusterStorage, SegmentedClusterStorage, generateSegmentedClusters };
