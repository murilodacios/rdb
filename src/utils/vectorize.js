import fs from "node:fs";
import { getNormalizedDayOfWeek } from "../utils/get-normalized-day-of-week.js";
import { limitar } from "../utils/clamp.js";

const normalizationFile = fs.readFileSync(
  "./src/datasets/normalization.json",
  "utf-8",
);
const normalization = JSON.parse(normalizationFile);

const merchantFile = fs.readFileSync("./src/datasets/mcc_risk.json", "utf-8");
const mcc = JSON.parse(merchantFile);

export function vectorize(data) {
  const normalizatedData = {
    amount: limitar(data.transaction.amount / normalization.max_amount),
    installments: limitar(
      data.transaction.installments / normalization.max_installments,
    ),
    amount_vs_avg: limitar(
      data.transaction.amount /
        data.customer.avg_amount /
        normalization.amount_vs_avg_ratio,
    ),
    hour_of_day: new Date(data.transaction.requested_at).getUTCHours() / 23,
    day_of_week: getNormalizedDayOfWeek(data.transaction.requested_at),
    minutes_since_last_tx:
      data.last_transaction === null
        ? -1
        : limitar(
            (new Date(data.transaction.requested_at).getTime() -
              new Date(data.last_transaction.timestamp).getTime()) /
              1000 /
              60 /
              normalization.max_minutes,
          ),
    km_from_last_tx:
      data.last_transaction === null
        ? -1
        : limitar(data.last_transaction.km_from_current / normalization.max_km),
    km_from_home: limitar(data.terminal.km_from_home / normalization.max_km),
    tx_count_24h: limitar(
      data.customer.tx_count_24h / normalization.max_tx_count_24h,
    ),
    is_online: data.terminal.is_online ? 1 : 0,
    card_present: data.terminal.card_present ? 1 : 0,
    unknown_merchant: data.customer.known_merchants.includes(data.merchant.id)
      ? 0
      : 1,
    mcc_risk: mcc[data.merchant.mcc] ?? 0.5,
    merchant_avg_amount: limitar(
      data.merchant.avg_amount / normalization.max_merchant_avg_amount,
    ),
  };

  return [
    normalizatedData.amount,
    normalizatedData.installments,
    normalizatedData.amount_vs_avg,
    normalizatedData.hour_of_day,
    normalizatedData.day_of_week,
    normalizatedData.minutes_since_last_tx,
    normalizatedData.km_from_last_tx,
    normalizatedData.km_from_home,
    normalizatedData.tx_count_24h,
    normalizatedData.is_online,
    normalizatedData.card_present,
    normalizatedData.unknown_merchant,
    normalizatedData.mcc_risk,
    normalizatedData.merchant_avg_amount,
  ];
}
