import { VECTOR_SIZE } from "./vector-config.js";

export function distanceToBbox(queryVector, bboxMin, bboxMax, clusterId) {
  const base = clusterId * VECTOR_SIZE;

  let distance = 0;

  for (let i = 0; i < VECTOR_SIZE; i++) {
    const value = queryVector[i];

    const min = bboxMin[base + i];
    const max = bboxMax[base + i];

    let diff = 0;

    if (value < min) {
      diff = min - value;
    } else if (value > max) {
      diff = value - max;
    }

    distance += diff * diff;
  }

  return distance;
}
