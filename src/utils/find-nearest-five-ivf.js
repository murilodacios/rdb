import { distanceFromBinaryVector } from "./distance-from-binary-vector.js";
import { distanceToBbox } from "./distance-to-bbox.js";
import { findNearestCentroids } from "./find-nearest-centroids.js";
import {
  IVF_BBOX_REPAIR_LIMIT,
  IVF_NPROBE,
  VECTOR_SIZE,
} from "./vector-config.js";

function tryCandidate(nearest, candidate) {
  if (nearest.length < 5) {
    nearest.push(candidate);
    return;
  }

  let worstIndex = 0;

  for (let i = 1; i < nearest.length; i++) {
    if (nearest[i].distance > nearest[worstIndex].distance) {
      worstIndex = i;
    }
  }

  if (candidate.distance < nearest[worstIndex].distance) {
    nearest[worstIndex] = candidate;
  }
}

function tryRepairCluster(nearestRepairClusters, candidate, selectedClusters) {
  if (selectedClusters.has(candidate.clusterId)) {
    return;
  }

  if (nearestRepairClusters.length < IVF_BBOX_REPAIR_LIMIT) {
    nearestRepairClusters.push(candidate);
    return;
  }

  let worstIndex = 0;

  for (let i = 1; i < nearestRepairClusters.length; i++) {
    if (
      nearestRepairClusters[i].distance >
      nearestRepairClusters[worstIndex].distance
    ) {
      worstIndex = i;
    }
  }

  if (candidate.distance < nearestRepairClusters[worstIndex].distance) {
    nearestRepairClusters[worstIndex] = candidate;
  }
}

function getSelectedClusters(queryVector, ivfIndex) {
  const centroidClusters = findNearestCentroids(queryVector, ivfIndex);

  const selectedClusters = new Set();

  for (const item of centroidClusters) {
    selectedClusters.add(item.clusterId);
  }

  const repairClusters = [];

  for (let clusterId = 0; clusterId < ivfIndex.nlist; clusterId++) {
    const distance = distanceToBbox(
      queryVector,
      ivfIndex.bboxMin,
      ivfIndex.bboxMax,
      clusterId,
    );

    tryRepairCluster(
      repairClusters,
      {
        clusterId,
        distance,
      },
      selectedClusters,
    );
  }

  for (const item of repairClusters) {
    selectedClusters.add(item.clusterId);
  }

  return {
    selectedClusters: Array.from(selectedClusters),
    centroidClusters,
    repairClusters,
  };
}

export function findNearestFiveIvf(currentVector, references, ivfIndex) {
  const nearest = [];

  const selected = getSelectedClusters(currentVector, ivfIndex);

  let scannedCandidates = 0;

  for (const clusterId of selected.selectedClusters) {
    const start = ivfIndex.clusterOffsets[clusterId];
    const end = ivfIndex.clusterOffsets[clusterId + 1];

    for (let position = start; position < end; position++) {
      const vectorId = ivfIndex.clusterIndex[position];
      const base = vectorId * VECTOR_SIZE;

      const distance = distanceFromBinaryVector(
        currentVector,
        references.vectors,
        base,
      );

      tryCandidate(nearest, {
        id: vectorId,
        label: references.labels[vectorId],
        distance,
      });

      scannedCandidates++;
    }
  }

  return {
    nearest,
    debug: {
      search_mode: "ivf",
      nprobe: IVF_NPROBE,
      bbox_repair_limit: IVF_BBOX_REPAIR_LIMIT,
      selected_clusters: selected.selectedClusters.length,
      centroid_clusters: selected.centroidClusters.length,
      repair_clusters: selected.repairClusters.length,
      scanned_candidates: scannedCandidates,
      nearest_found: nearest.length,
    },
  };
}
