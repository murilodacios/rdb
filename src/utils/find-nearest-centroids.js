import { IVF_NPROBE, VECTOR_SIZE } from "./vector-config.js";

function tryCentroid(nearest, candidate, limit) {
  if (nearest.length < limit) {
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

function distanceToCentroid(queryVector, centroids, centroidId) {
  const base = centroidId * VECTOR_SIZE;

  let distance = 0;

  for (let i = 0; i < VECTOR_SIZE; i++) {
    const diff = queryVector[i] - centroids[base + i];
    distance += diff * diff;
  }

  return distance;
}

export function findNearestCentroids(queryVector, ivfIndex) {
  const nearest = [];

  for (let centroidId = 0; centroidId < ivfIndex.nlist; centroidId++) {
    const distance = distanceToCentroid(
      queryVector,
      ivfIndex.centroids,
      centroidId,
    );

    tryCentroid(
      nearest,
      {
        clusterId: centroidId,
        distance,
      },
      IVF_NPROBE,
    );
  }

  return nearest;
}
