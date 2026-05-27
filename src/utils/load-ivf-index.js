import fs from "node:fs";

const CENTROIDS_FILE = "./src/generated/ivf.centroids.bin";
const CLUSTER_INDEX_FILE = "./src/generated/ivf.cluster-index.bin";
const CLUSTER_META_FILE = "./src/generated/ivf.cluster-meta.json";
const BBOX_MIN_FILE = "./src/generated/ivf.bbox-min.bin";
const BBOX_MAX_FILE = "./src/generated/ivf.bbox-max.bin";

export function loadIvfIndex() {
  const centroidsBuffer = fs.readFileSync(CENTROIDS_FILE);
  const clusterIndexBuffer = fs.readFileSync(CLUSTER_INDEX_FILE);
  const clusterMetaFile = fs.readFileSync(CLUSTER_META_FILE, "utf-8");
  const bboxMinBuffer = fs.readFileSync(BBOX_MIN_FILE);
  const bboxMaxBuffer = fs.readFileSync(BBOX_MAX_FILE);

  const meta = JSON.parse(clusterMetaFile);

  const centroids = new Float32Array(
    centroidsBuffer.buffer,
    centroidsBuffer.byteOffset,
    centroidsBuffer.byteLength / Float32Array.BYTES_PER_ELEMENT,
  );

  const clusterIndex = new Uint32Array(
    clusterIndexBuffer.buffer,
    clusterIndexBuffer.byteOffset,
    clusterIndexBuffer.byteLength / Uint32Array.BYTES_PER_ELEMENT,
  );

  const bboxMin = new Float32Array(
    bboxMinBuffer.buffer,
    bboxMinBuffer.byteOffset,
    bboxMinBuffer.byteLength / Float32Array.BYTES_PER_ELEMENT,
  );

  const bboxMax = new Float32Array(
    bboxMaxBuffer.buffer,
    bboxMaxBuffer.byteOffset,
    bboxMaxBuffer.byteLength / Float32Array.BYTES_PER_ELEMENT,
  );

  return {
    nlist: meta.nlist,
    vectorSize: meta.vectorSize,
    count: meta.count,
    centroids,
    clusterIndex,
    clusterOffsets: Uint32Array.from(meta.clusterOffsets),
    clusterSizes: Uint32Array.from(meta.clusterSizes),
    bboxMin,
    bboxMax,
  };
}
