import fs from "node:fs";

const URL = process.env.BENCH_URL ?? "http://localhost:9999/fraud-score";

const PAYLOADS_FILE =
  process.env.PAYLOADS_FILE ?? "./src/datasets/example-payloads.json";

const TOTAL_REQUESTS = Number(process.env.TOTAL_REQUESTS ?? 5000);
const CONCURRENCY = Number(process.env.CONCURRENCY ?? 10);

function loadPayloads() {
  const file = fs.readFileSync(PAYLOADS_FILE, "utf-8");
  const payloads = JSON.parse(file);

  if (!Array.isArray(payloads)) {
    throw new Error("O arquivo de payloads precisa ser um array JSON.");
  }

  if (payloads.length === 0) {
    throw new Error("O arquivo de payloads está vazio.");
  }

  return payloads;
}

function percentile(sortedValues, percentileValue) {
  if (sortedValues.length === 0) return 0;

  const index = Math.ceil((percentileValue / 100) * sortedValues.length) - 1;

  return sortedValues[Math.max(0, Math.min(index, sortedValues.length - 1))];
}

function average(values) {
  if (values.length === 0) return 0;

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function summarize(values) {
  const sorted = [...values].sort((a, b) => a - b);

  return {
    min: Number((sorted[0] ?? 0).toFixed(3)),
    avg: Number(average(sorted).toFixed(3)),
    p50: Number(percentile(sorted, 50).toFixed(3)),
    p95: Number(percentile(sorted, 95).toFixed(3)),
    p99: Number(percentile(sorted, 99).toFixed(3)),
    max: Number((sorted[sorted.length - 1] ?? 0).toFixed(3)),
  };
}

async function sendRequest(index, payloads) {
  const payload = payloads[index % payloads.length];

  const start = performance.now();

  try {
    const response = await fetch(URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const end = performance.now();

    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        duration: end - start,
        error: `HTTP ${response.status}`,
      };
    }

    const body = await response.json();

    return {
      ok: true,
      status: response.status,
      duration: end - start,
      body,
    };
  } catch (error) {
    const end = performance.now();

    return {
      ok: false,
      status: 0,
      duration: end - start,
      error: error.message,
    };
  }
}

async function runBenchmark() {
  const payloads = loadPayloads();

  console.log("Iniciando benchmark com payloads do arquivo...");
  console.log({
    url: URL,
    payloadsFile: PAYLOADS_FILE,
    payloadsLoaded: payloads.length,
    totalRequests: TOTAL_REQUESTS,
    concurrency: CONCURRENCY,
  });

  const results = [];
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < TOTAL_REQUESTS) {
      const currentIndex = nextIndex;
      nextIndex++;

      const result = await sendRequest(currentIndex, payloads);
      results.push(result);

      if (results.length % 100 === 0) {
        console.log(`${results.length}/${TOTAL_REQUESTS} requests finalizadas`);
      }
    }
  }

  const globalStart = performance.now();

  await Promise.all(
    Array.from({ length: CONCURRENCY }, () => {
      return worker();
    }),
  );

  const globalEnd = performance.now();

  const successful = results.filter((result) => result.ok);
  const failed = results.filter((result) => !result.ok);

  const httpDurations = successful.map((result) => result.duration);

  const internalDurations = successful
    .map((result) => result.body?.debug?.duration_ms)
    .filter((value) => typeof value === "number");

  const scannedCandidates = successful
    .map((result) => result.body?.debug?.scanned_candidates)
    .filter((value) => typeof value === "number");

  const nearestFound = successful
    .map((result) => result.body?.debug?.nearest_found)
    .filter((value) => typeof value === "number");

  const selectedClusters = successful
    .map((result) => result.body?.debug?.selected_clusters)
    .filter((value) => typeof value === "number");

  const searchModeDistribution = {};
  const scoreDistribution = {};

  for (const result of successful) {
    const searchMode = result.body?.debug?.search_mode ?? "no_debug";
    const score = result.body?.fraud_score;

    searchModeDistribution[searchMode] =
      (searchModeDistribution[searchMode] ?? 0) + 1;

    scoreDistribution[String(score)] =
      (scoreDistribution[String(score)] ?? 0) + 1;
  }

  const approvedCount = successful.filter((result) => {
    return result.body?.approved === true;
  }).length;

  const rejectedCount = successful.filter((result) => {
    return result.body?.approved === false;
  }).length;

  const lessThanFiveNeighbors = successful.filter((result) => {
    return (result.body?.debug?.nearest_found ?? 0) < 5;
  });

  const emptyCandidateCases = successful.filter((result) => {
    return (result.body?.debug?.scanned_candidates ?? 0) === 0;
  });

  const highCandidateCases = successful.filter((result) => {
    return (result.body?.debug?.scanned_candidates ?? 0) > 50000;
  });

  const totalDurationSeconds = (globalEnd - globalStart) / 1000;
  const requestsPerSecond = TOTAL_REQUESTS / totalDurationSeconds;

  console.log("\nResultado do benchmark:");
  console.log({
    totalRequests: TOTAL_REQUESTS,
    successful: successful.length,
    failed: failed.length,
    totalDurationSeconds: Number(totalDurationSeconds.toFixed(2)),
    requestsPerSecond: Number(requestsPerSecond.toFixed(2)),
    latencyHttpMs: summarize(httpDurations),
    internalDurationMs: summarize(internalDurations),
    scannedCandidates: summarize(scannedCandidates),
    nearestFound: summarize(nearestFound),
    selectedClusters: summarize(selectedClusters),
    qualityWarnings: {
      lessThanFiveNeighbors: lessThanFiveNeighbors.length,
      emptyCandidateCases: emptyCandidateCases.length,
      highCandidateCases: highCandidateCases.length,
    },
    decisions: {
      approved: approvedCount,
      rejected: rejectedCount,
    },
    searchModeDistribution,
    scoreDistribution,
  });

  if (lessThanFiveNeighbors.length > 0) {
    console.log("\nExemplos com menos de 5 vizinhos:");
    console.log(
      lessThanFiveNeighbors.slice(0, 5).map((result) => {
        return result.body;
      }),
    );
  }

  if (failed.length > 0) {
    console.log("\nPrimeiros erros:");
    console.log(failed.slice(0, 5));
  }
}

runBenchmark();
