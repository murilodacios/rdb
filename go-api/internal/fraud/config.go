package fraud

import (
	"encoding/json"
	"os"
)

type Normalization struct {
	MaxAmount            float64 `json:"max_amount"`
	MaxInstallments      float64 `json:"max_installments"`
	AmountVsAvgRatio     float64 `json:"amount_vs_avg_ratio"`
	MaxMinutes           float64 `json:"max_minutes"`
	MaxKm                float64 `json:"max_km"`
	MaxTxCount24h        float64 `json:"max_tx_count_24h"`
	MaxMerchantAvgAmount float64 `json:"max_merchant_avg_amount"`
}

type Config struct {
	Normalization Normalization
	MccRisk       map[string]float64
}

func LoadConfig(datasetsPath string) (*Config, error) {
	normalization, err := loadNormalization(datasetsPath + "/normalization.json")
	if err != nil {
		return nil, err
	}

	mccRisk, err := loadMccRisk(datasetsPath + "/mcc_risk.json")
	if err != nil {
		return nil, err
	}

	return &Config{
		Normalization: normalization,
		MccRisk:       mccRisk,
	}, nil
}

func loadNormalization(path string) (Normalization, error) {
	file, err := os.ReadFile(path)
	if err != nil {
		return Normalization{}, err
	}

	var normalization Normalization

	if err := json.Unmarshal(file, &normalization); err != nil {
		return Normalization{}, err
	}

	return normalization, nil
}

func loadMccRisk(path string) (map[string]float64, error) {
	file, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}

	var mccRisk map[string]float64

	if err := json.Unmarshal(file, &mccRisk); err != nil {
		return nil, err
	}

	return mccRisk, nil
}
