import { VECTOR_SIZE } from "./vector-config.js";

export function distanceBetweenVectors(vectorA, vectorB, offsetB = 0) {
  let distance = 0;

  for (let i = 0; i < VECTOR_SIZE; i++) {
    const diff = vectorA[i] - vectorB[offsetB + i];
    distance += diff * diff;
  }

  return distance;
}
