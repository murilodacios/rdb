import fs from "node:fs";

import { IVF_NLIST, VECTOR_SIZE } from "../utils/vector-config.js";

const VECTORS_FILE = "./src/generated/references.vectors.bin";
const META_FILE = "./src/generated/references.meta.json";
const CENTROIDS_FILE = "./src/generated/ivf.centroids.bin";

const OUTPUT_CLUSTER_INDEX_FILE = "./src/generated/ivf.cluster-index.bin";
const OUTPUT_CLUSTER_META_FILE = "./src/generated/ivf.cluster-meta.json";
const OUTPUT_BBOX_MIN_FILE = "./src/generated/ivf.bbox-min.bin";
const OUTPUT_BBOX_MAX_FILE = "./src/generated/ivf.bbox-max.bin";

console.log("Lendo meta...");

const meta = JSON.parse(fs.readFileSync(META_FILE, "utf-8"));

console.log("Lendo vectors.bin...");

const vectorsBuffer = fs.readFileSync(VECTORS_FILE);

const vectors = new Float32Array(
  vectorsBuffer.buffer,
  vectorsBuffer.byteOffset,
  vectorsBuffer.byteLength / Float32Array.BYTES_PER_ELEMENT,
);

console.log("Lendo ivf.centroids.bin...");

const centroidsBuffer = fs.readFileSync(CENTROIDS_FILE);

const centroids = new Float32Array(
  centroidsBuffer.buffer,
  centroidsBuffer.byteOffset,
  centroidsBuffer.byteLength / Float32Array.BYTES_PER_ELEMENT,
);

const totalVectors = meta.count;
const nlist = IVF_NLIST;

console.log({
  totalVectors,
  vectorSize: VECTOR_SIZE,
  nlist,
  centroidsLength: centroids.length,
});

function distanceToCentroid(vectorBase, centroidBase) {
  let distance = 0;

  for (let dimension = 0; dimension < VECTOR_SIZE; dimension++) {
    const diff =
      vectors[vectorBase + dimension] - centroids[centroidBase + dimension];

    distance += diff * diff;
  }

  return distance;
}

function findNearestCentroid(vectorId) {
  const vectorBase = vectorId * VECTOR_SIZE;

  let nearestCentroidId = 0;
  let nearestDistance = Infinity;

  for (let centroidId = 0; centroidId < nlist; centroidId++) {
    const centroidBase = centroidId * VECTOR_SIZE;
    const distance = distanceToCentroid(vectorBase, centroidBase);

    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestCentroidId = centroidId;
    }
  }

  return nearestCentroidId;
}

console.log("Primeira passada: contando vetores por cluster...");

const clusterSizes = new Uint32Array(nlist);

for (let vectorId = 0; vectorId < totalVectors; vectorId++) {
  const clusterId = findNearestCentroid(vectorId);

  clusterSizes[clusterId]++;

  if (vectorId > 0 && vectorId % 100000 === 0) {
    console.log(`${vectorId} vetores contados...`);
  }
}

console.log("Calculando offsets dos clusters...");

const clusterOffsets = new Uint32Array(nlist + 1);

for (let clusterId = 0; clusterId < nlist; clusterId++) {
  clusterOffsets[clusterId + 1] =
    clusterOffsets[clusterId] + clusterSizes[clusterId];
}

console.log("Preparando estruturas finais...");

const clusterIndex = new Uint32Array(totalVectors);
const cursor = new Uint32Array(clusterOffsets);

const bboxMin = new Float32Array(nlist * VECTOR_SIZE);
const bboxMax = new Float32Array(nlist * VECTOR_SIZE);

for (let i = 0; i < bboxMin.length; i++) {
  bboxMin[i] = Infinity;
  bboxMax[i] = -Infinity;
}

console.log("Segunda passada: montando índice e bbox...");

for (let vectorId = 0; vectorId < totalVectors; vectorId++) {
  const clusterId = findNearestCentroid(vectorId);

  const position = cursor[clusterId];

  clusterIndex[position] = vectorId;
  cursor[clusterId]++;

  const vectorBase = vectorId * VECTOR_SIZE;
  const bboxBase = clusterId * VECTOR_SIZE;

  for (let dimension = 0; dimension < VECTOR_SIZE; dimension++) {
    const value = vectors[vectorBase + dimension];
    const bboxPosition = bboxBase + dimension;

    if (value < bboxMin[bboxPosition]) {
      bboxMin[bboxPosition] = value;
    }

    if (value > bboxMax[bboxPosition]) {
      bboxMax[bboxPosition] = value;
    }
  }

  if (vectorId > 0 && vectorId % 100000 === 0) {
    console.log(`${vectorId} vetores indexados...`);
  }
}

console.log("Salvando ivf.cluster-index.bin...");

fs.writeFileSync(OUTPUT_CLUSTER_INDEX_FILE, Buffer.from(clusterIndex.buffer));

console.log("Salvando ivf.cluster-meta.json...");

const clusterMeta = {
  nlist,
  vectorSize: VECTOR_SIZE,
  count: totalVectors,
  clusterOffsets: Array.from(clusterOffsets),
  clusterSizes: Array.from(clusterSizes),
  files: {
    clusterIndex: OUTPUT_CLUSTER_INDEX_FILE,
    bboxMin: OUTPUT_BBOX_MIN_FILE,
    bboxMax: OUTPUT_BBOX_MAX_FILE,
  },
};

fs.writeFileSync(OUTPUT_CLUSTER_META_FILE, JSON.stringify(clusterMeta));

console.log("Salvando ivf.bbox-min.bin...");

fs.writeFileSync(OUTPUT_BBOX_MIN_FILE, Buffer.from(bboxMin.buffer));

console.log("Salvando ivf.bbox-max.bin...");

fs.writeFileSync(OUTPUT_BBOX_MAX_FILE, Buffer.from(bboxMax.buffer));

console.log("Finalizado!");
console.log({
  clusterIndexFile: OUTPUT_CLUSTER_INDEX_FILE,
  clusterMetaFile: OUTPUT_CLUSTER_META_FILE,
  bboxMinFile: OUTPUT_BBOX_MIN_FILE,
  bboxMaxFile: OUTPUT_BBOX_MAX_FILE,
});
