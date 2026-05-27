import { VECTOR_SIZE } from "./vector-config.js";

export function distanceFromBinaryVector(currentVector, vectors, base) {
  let distance = 0;

  for (let i = 0; i < VECTOR_SIZE; i++) {
    const diff = currentVector[i] - vectors[base + i];
    distance += diff * diff;
  }

  return distance;
}
