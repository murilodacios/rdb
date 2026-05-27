package fraud

import (
	"time"
)

func Vectorize(payload FraudScoreRequest, config *Config) [14]float32 {
	normalization := config.Normalization

	amount := clamp(payload.Transaction.Amount / normalization.MaxAmount)

	installments := clamp(
		float64(payload.Transaction.Installments) / normalization.MaxInstallments,
	)

	amountVsAvg := 0.0
	if payload.Customer.AvgAmount > 0 {
		amountVsAvg = clamp(
			(payload.Transaction.Amount / payload.Customer.AvgAmount) /
				normalization.AmountVsAvgRatio,
		)
	}

	requestedAt, _ := time.Parse(time.RFC3339, payload.Transaction.RequestedAt)

	hourOfDay := clamp(float64(requestedAt.UTC().Hour()) / 23)

	dayOfWeek := getNormalizedDayOfWeek(requestedAt)

	minutesSinceLastTx := float64(-1)
	kmFromLastTx := float64(-1)

	if payload.LastTransaction != nil {
		lastTimestamp, err := time.Parse(time.RFC3339, payload.LastTransaction.Timestamp)

		if err == nil {
			diffMinutes := requestedAt.Sub(lastTimestamp).Minutes()
			minutesSinceLastTx = clamp(diffMinutes / normalization.MaxMinutes)
		}

		kmFromLastTx = clamp(
			payload.LastTransaction.KmFromCurrent / normalization.MaxKm,
		)
	}

	kmFromHome := clamp(payload.Terminal.KmFromHome / normalization.MaxKm)

	txCount24h := clamp(
		float64(payload.Customer.TxCount24h) / normalization.MaxTxCount24h,
	)

	isOnline := float64(0)
	if payload.Terminal.IsOnline {
		isOnline = 1
	}

	cardPresent := float64(0)
	if payload.Terminal.CardPresent {
		cardPresent = 1
	}

	unknownMerchant := float64(1)
	if contains(payload.Customer.KnownMerchants, payload.Merchant.ID) {
		unknownMerchant = 0
	}

	mccRisk := 0.5
	if value, exists := config.MccRisk[payload.Merchant.MCC]; exists {
		mccRisk = clamp(value)
	}

	merchantAvgAmount := clamp(
		payload.Merchant.AvgAmount / normalization.MaxMerchantAvgAmount,
	)

	return [14]float32{
		float32(amount),
		float32(installments),
		float32(amountVsAvg),
		float32(hourOfDay),
		float32(dayOfWeek),
		float32(minutesSinceLastTx),
		float32(kmFromLastTx),
		float32(kmFromHome),
		float32(txCount24h),
		float32(isOnline),
		float32(cardPresent),
		float32(unknownMerchant),
		float32(mccRisk),
		float32(merchantAvgAmount),
	}
}

func clamp(value float64) float64 {
	if value < 0 {
		return 0
	}

	if value > 1 {
		return 1
	}

	return value
}

func getNormalizedDayOfWeek(date time.Time) float64 {
	weekday := date.UTC().Weekday()

	// Go:
	// Sunday = 0
	// Monday = 1
	// ...
	// Saturday = 6
	//
	// Rinha:
	// Monday = 0
	// Tuesday = 1
	// ...
	// Sunday = 6

	if weekday == time.Sunday {
		return 1
	}

	return float64(weekday-1) / 6
}

func contains(items []string, value string) bool {
	for _, item := range items {
		if item == value {
			return true
		}
	}

	return false
}
