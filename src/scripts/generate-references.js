import fs from "node:fs";
import zlib from "node:zlib";

const INPUT_FILE = "./src/resources/references.json.gz";

const OUTPUT_VECTORS_FILE = "./src/generated/references.vectors.bin";
const OUTPUT_LABELS_FILE = "./src/generated/references.labels.bin";
const OUTPUT_META_FILE = "./src/generated/references.meta.json";

const VECTOR_SIZE = 14;

console.log("Lendo references.json.gz...");

const compressed = fs.readFileSync(INPUT_FILE);

console.log("Descompactando gzip...");

const jsonBuffer = zlib.gunzipSync(compressed);
const jsonText = jsonBuffer.toString("utf-8");

console.log("Fazendo parse do JSON...");

const references = JSON.parse(jsonText);

console.log(`Total de referências: ${references.length}`);

const vectors = new Float32Array(references.length * VECTOR_SIZE);
const labels = new Uint8Array(references.length);

console.log("Convertendo referências para binário...");

for (let i = 0; i < references.length; i++) {
  const reference = references[i];

  const base = i * VECTOR_SIZE;

  for (let j = 0; j < VECTOR_SIZE; j++) {
    vectors[base + j] = reference.vector[j];
  }

  labels[i] = reference.label === "fraud" ? 1 : 0;

  if (i > 0 && i % 100000 === 0) {
    console.log(`${i} referências processadas...`);
  }
}

console.log("Salvando references.vectors.bin...");

fs.writeFileSync(OUTPUT_VECTORS_FILE, Buffer.from(vectors.buffer));

console.log("Salvando references.labels.bin...");

fs.writeFileSync(OUTPUT_LABELS_FILE, Buffer.from(labels.buffer));

console.log("Salvando references.meta.json...");

const meta = {
  count: references.length,
  vectorSize: VECTOR_SIZE,
  files: {
    vectors: OUTPUT_VECTORS_FILE,
    labels: OUTPUT_LABELS_FILE,
  },
  labels: {
    legit: 0,
    fraud: 1,
  },
};

fs.writeFileSync(OUTPUT_META_FILE, JSON.stringify(meta, null, 2));

console.log("Finalizado!");
console.log({
  vectorsFile: OUTPUT_VECTORS_FILE,
  labelsFile: OUTPUT_LABELS_FILE,
  metaFile: OUTPUT_META_FILE,
});
