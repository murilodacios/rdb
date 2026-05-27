package fraud

import (
	"testing"
	"time"
)

func TestParseRFC3339ZMatchesTimeParse(t *testing.T) {
	cases := []string{
		"2026-03-11T18:45:53Z",
		"2026-03-11T20:23:35Z",
		"2026-03-17T02:04:06Z",
		"1970-01-01T00:00:00Z",
		"2024-02-29T23:59:59Z",
	}

	for _, value := range cases {
		minutes, hour, weekday, ok := parseRFC3339Z(value)
		if !ok {
			t.Fatalf("parseRFC3339Z(%q) returned ok=false", value)
		}

		parsed, err := time.Parse(time.RFC3339, value)
		if err != nil {
			t.Fatal(err)
		}

		utc := parsed.UTC()

		if minutes != utc.Unix()/60 {
			t.Fatalf("minutes mismatch for %q: got=%d want=%d", value, minutes, utc.Unix()/60)
		}

		if hour != utc.Hour() {
			t.Fatalf("hour mismatch for %q: got=%d want=%d", value, hour, utc.Hour())
		}

		if weekday != int(utc.Weekday()) {
			t.Fatalf("weekday mismatch for %q: got=%d want=%d", value, weekday, utc.Weekday())
		}
	}
}
