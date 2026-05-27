import fs from "node:fs";

import { IVF_NLIST, VECTOR_SIZE } from "../utils/vector-config.js";

const VECTORS_FILE = "./src/generated/references.vectors.bin";
const META_FILE = "./src/generated/references.meta.json";

const OUTPUT_CENTROIDS_FILE = "./src/generated/ivf.centroids.bin";

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

console.log({
  totalVectors,
  vectorSize: VECTOR_SIZE,
  nlist,
});

const centroids = new Float32Array(nlist * VECTOR_SIZE);

console.log("Gerando centroides iniciais...");

for (let centroidId = 0; centroidId < nlist; centroidId++) {
  const sourceVectorId = Math.floor((centroidId * totalVectors) / nlist);

  const sourceBase = sourceVectorId * VECTOR_SIZE;
  const centroidBase = centroidId * VECTOR_SIZE;

  for (let dimension = 0; dimension < VECTOR_SIZE; dimension++) {
    centroids[centroidBase + dimension] = vectors[sourceBase + dimension];
  }

  if (centroidId > 0 && centroidId % 500 === 0) {
    console.log(`${centroidId} centroides gerados...`);
  }
}

console.log("Salvando ivf.centroids.bin...");

fs.writeFileSync(OUTPUT_CENTROIDS_FILE, Buffer.from(centroids.buffer));

console.log("Finalizado!");
console.log({
  file: OUTPUT_CENTROIDS_FILE,
  centroids: nlist,
  size: centroids.length,
});
