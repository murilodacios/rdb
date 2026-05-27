import { findNearestFiveIvf } from "./find-nearest-five-ivf.js";

export function calculateFraudScore(currentVector, references, ivfIndex) {
  const result = findNearestFiveIvf(currentVector, references, ivfIndex);

  let fraudCount = 0;

  for (const neighbor of result.nearest) {
    if (neighbor.label === 1) {
      fraudCount++;
    }
  }

  const fraudScore = fraudCount / 5;

  return {
    approved: fraudScore < 0.6,
    fraud_score: fraudScore,
    debug: {
      ...result.debug,
      warning:
        result.nearest.length < 5 ? "less_than_five_neighbors" : undefined,
    },
  };
}
