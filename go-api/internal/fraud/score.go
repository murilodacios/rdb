package fraud

import "rinha-go/internal/vector"

type ScoreDebug struct {
	vector.SearchDebug
	DurationMs float64 `json:"duration_ms,omitempty"`
	Warning    string  `json:"warning,omitempty"`
}

type ScoreResult struct {
	Approved   bool       `json:"approved"`
	FraudScore float64    `json:"fraud_score"`
	FraudCount int        `json:"-"`
	Debug      ScoreDebug `json:"debug,omitempty"`
}

func CalculateFraudScore(
	query [14]float32,
	refs *vector.References,
	ivf *vector.IvfIndex,
	searchConfig vector.SearchConfig,
) ScoreResult {
	searchResult := vector.SearchIvf(query, refs, ivf, searchConfig)

	fraudCount := 0

	for _, neighbor := range searchResult.Nearest {
		if neighbor.Label == 1 {
			fraudCount++
		}
	}

	fraudScore := float64(fraudCount) / 5.0

	result := ScoreResult{
		Approved:   fraudScore < 0.6,
		FraudScore: fraudScore,
		FraudCount: fraudCount,
		Debug: ScoreDebug{
			SearchDebug: searchResult.Debug,
		},
	}

	if len(searchResult.Nearest) < 5 {
		result.Debug.Warning = "less_than_five_neighbors"
	}

	return result
}
