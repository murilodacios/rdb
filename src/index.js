import fastify from "fastify";
import { performance } from "node:perf_hooks";

import { calculateFraudScore } from "./utils/calculate-fraud-score.js";
import { loadBinaryReferences } from "./utils/load-binary-references.js";
import { loadIvfIndex } from "./utils/load-ivf-index.js";
import { vectorize } from "./utils/vectorize.js";

const SHOW_DEBUG = process.env.DEBUG_RESPONSE === "true";

const references = loadBinaryReferences();
const ivfIndex = loadIvfIndex();

console.log("Referências carregadas:", {
  count: references.count,
  vectorSize: references.vectorSize,
  vectorsLength: references.vectors.length,
  labelsLength: references.labels.length,
});

console.log("IVF carregado:", {
  nlist: ivfIndex.nlist,
  vectorSize: ivfIndex.vectorSize,
  centroidsLength: ivfIndex.centroids.length,
  clusterIndexLength: ivfIndex.clusterIndex.length,
  bboxMinLength: ivfIndex.bboxMin.length,
  bboxMaxLength: ivfIndex.bboxMax.length,
});

const app = fastify({
  logger: true,
});

app.get("/ready", async (request, reply) => {
  return reply.status(200).send();
});

app.post("/fraud-score", async (request, reply) => {
  const start = performance.now();

  const vector = vectorize(request.body);

  const result = calculateFraudScore(vector, references, ivfIndex);

  const duration = performance.now() - start;

  if (!SHOW_DEBUG) {
    return reply.status(200).send({
      approved: result.approved,
      fraud_score: result.fraud_score,
    });
  }

  return reply.status(200).send({
    ...result,
    debug: {
      ...result.debug,
      duration_ms: duration,
    },
  });
});

app.listen({ port: 9999 }, (err, address) => {
  if (err) {
    app.log.error(err);
    process.exit(1);
  }

  app.log.info(`Server listening at ${address}`);
});
