import fs from "node:fs";

const VECTORS_FILE = "./src/generated/references.vectors.bin";
const LABELS_FILE = "./src/generated/references.labels.bin";
const META_FILE = "./src/generated/references.meta.json";

export function loadBinaryReferences() {
  const vectorsBuffer = fs.readFileSync(VECTORS_FILE);
  const labelsBuffer = fs.readFileSync(LABELS_FILE);
  const metaFile = fs.readFileSync(META_FILE, "utf-8");

  const meta = JSON.parse(metaFile);

  const vectors = new Float32Array(
    vectorsBuffer.buffer,
    vectorsBuffer.byteOffset,
    vectorsBuffer.byteLength / Float32Array.BYTES_PER_ELEMENT,
  );

  const labels = new Uint8Array(
    labelsBuffer.buffer,
    labelsBuffer.byteOffset,
    labelsBuffer.byteLength,
  );

  return {
    vectors,
    labels,
    count: meta.count,
    vectorSize: meta.vectorSize,
  };
}
