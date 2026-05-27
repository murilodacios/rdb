import fs from "node:fs";

import { IVF_NLIST, VECTOR_SIZE } from "../utils/vector-config.js";

const VECTORS_FILE = "./src/generated/references.vectors.bin";
const META_FILE = "./src/generated/references.meta.json";
const OUTPUT_CENTROIDS_FILE = "./src/generated/ivf.centroids.bin";

const SAMPLE_SIZE = Number(process.env.KMEANS_SAMPLE_SIZE ?? 30000);
const ITERATIONS = Number(process.env.KMEANS_ITERATIONS ?? 3);

console.log("Lendo meta...");

const meta = JSON.parse(fs.readFileSync(META_FILE, "utf-8"));

console.log("Lendo vectors.bin...");

const vectorsBuffer = fs.readFileSync(VECTORS_FILE);

const vectors = new Float32Array(
  vectorsBuffer.buffer,
  vectorsBuffer.byteOffset,
  vectorsBuffer.byteLength / Float32Array.BYTES_PER_ELEMENT,
);

const totalVectors = meta.count;
const nlist = IVF_NLIST;

if (SAMPLE_SIZE < nlist) {
  throw new Error(
    `KMEANS_SAMPLE_SIZE precisa ser maior ou igual a IVF_NLIST. Atual: sample=${SAMPLE_SIZE}, nlist=${nlist}`,
  );
}

console.log({
  totalVectors,
  vectorSize: VECTOR_SIZE,
  nlist,
  sampleSize: SAMPLE_SIZE,
  iterations: ITERATIONS,
});

function createDeterministicSampleIds() {
  const sampleIds = new Uint32Array(SAMPLE_SIZE);

  let seed = 123456789;

  function nextRandom() {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  }

  for (let i = 0; i < SAMPLE_SIZE; i++) {
    sampleIds[i] = Math.floor(nextRandom() * totalVectors);
  }

  return sampleIds;
}

function copyVectorToCentroid(vectorId, centroids, centroidId) {
  const vectorBase = vectorId * VECTOR_SIZE;
  const centroidBase = centroidId * VECTOR_SIZE;

  for (let d = 0; d < VECTOR_SIZE; d++) {
    centroids[centroidBase + d] = vectors[vectorBase + d];
  }
}

function initializeCentroids(sampleIds) {
  const centroids = new Float32Array(nlist * VECTOR_SIZE);

  for (let centroidId = 0; centroidId < nlist; centroidId++) {
    const samplePosition = Math.floor((centroidId * SAMPLE_SIZE) / nlist);
    const vectorId = sampleIds[samplePosition];

    copyVectorToCentroid(vectorId, centroids, centroidId);
  }

  return centroids;
}

function findNearestCentroid(vectorId, centroids) {
  const vectorBase = vectorId * VECTOR_SIZE;

  let nearestCentroidId = 0;
  let nearestDistance = Infinity;

  for (let centroidId = 0; centroidId < nlist; centroidId++) {
    const centroidBase = centroidId * VECTOR_SIZE;

    let distance = 0;

    for (let d = 0; d < VECTOR_SIZE; d++) {
      const diff = vectors[vectorBase + d] - centroids[centroidBase + d];
      distance += diff * diff;

      if (distance >= nearestDistance) {
        break;
      }
    }

    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestCentroidId = centroidId;
    }
  }

  return nearestCentroidId;
}

function runKmeans(sampleIds, centroids) {
  const sums = new Float64Array(nlist * VECTOR_SIZE);
  const counts = new Uint32Array(nlist);

  for (let iteration = 1; iteration <= ITERATIONS; iteration++) {
    console.log(`\nIteração ${iteration}/${ITERATIONS}`);

    sums.fill(0);
    counts.fill(0);

    for (let i = 0; i < SAMPLE_SIZE; i++) {
      const vectorId = sampleIds[i];
      const nearestCentroidId = findNearestCentroid(vectorId, centroids);

      counts[nearestCentroidId]++;

      const vectorBase = vectorId * VECTOR_SIZE;
      const sumBase = nearestCentroidId * VECTOR_SIZE;

      for (let d = 0; d < VECTOR_SIZE; d++) {
        sums[sumBase + d] += vectors[vectorBase + d];
      }

      if (i > 0 && i % 5000 === 0) {
        console.log(`${i}/${SAMPLE_SIZE} amostras processadas...`);
      }
    }

    let emptyClusters = 0;

    for (let centroidId = 0; centroidId < nlist; centroidId++) {
      const count = counts[centroidId];

      if (count === 0) {
        emptyClusters++;
        continue;
      }

      const centroidBase = centroidId * VECTOR_SIZE;

      for (let d = 0; d < VECTOR_SIZE; d++) {
        centroids[centroidBase + d] = sums[centroidBase + d] / count;
      }
    }

    console.log({
      iteration,
      emptyClusters,
    });
  }

  return centroids;
}

console.log("Gerando amostra determinística...");

const sampleIds = createDeterministicSampleIds();

console.log("Inicializando centroides...");

const centroids = initializeCentroids(sampleIds);

console.log("Rodando k-means na amostra...");

runKmeans(sampleIds, centroids);

console.log("Salvando ivf.centroids.bin...");

fs.writeFileSync(OUTPUT_CENTROIDS_FILE, Buffer.from(centroids.buffer));

console.log("Finalizado!");
console.log({
  file: OUTPUT_CENTROIDS_FILE,
  nlist,
  sampleSize: SAMPLE_SIZE,
  iterations: ITERATIONS,
});
