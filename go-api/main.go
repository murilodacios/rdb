package main

import (
	"encoding/json"
	"log"
	"net"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"time"

	"rinha-go/internal/fraud"
	"rinha-go/internal/vector"
)

type FraudScoreResponse struct {
	Approved   bool              `json:"approved"`
	FraudScore float64           `json:"fraud_score"`
	Debug      *fraud.ScoreDebug `json:"debug,omitempty"`
}

var jsonContentType = []string{"application/json"}

var fastFraudScoreResponses = [...][]byte{
	[]byte(`{"approved":true,"fraud_score":0}`),
	[]byte(`{"approved":true,"fraud_score":0.2}`),
	[]byte(`{"approved":true,"fraud_score":0.4}`),
	[]byte(`{"approved":false,"fraud_score":0.6}`),
	[]byte(`{"approved":false,"fraud_score":0.8}`),
	[]byte(`{"approved":false,"fraud_score":1}`),
}

func main() {
	generatedPath := os.Getenv("GENERATED_PATH")
	if generatedPath == "" {
		generatedPath = "../src/generated"
	}

	datasetsPath := os.Getenv("DATASETS_PATH")
	if datasetsPath == "" {
		datasetsPath = "../src/datasets"
	}

	refs, err := vector.LoadReferences(generatedPath)
	if err != nil {
		log.Fatal(err)
	}

	ivfIndex, err := vector.LoadIvfIndex(generatedPath)
	if err != nil {
		log.Fatal(err)
	}

	config, err := fraud.LoadConfig(datasetsPath)
	if err != nil {
		log.Fatal(err)
	}

	warmUpMmap(os.Getenv("MMAP_WARMUP"), refs, ivfIndex)

	searchConfig := vector.SearchConfig{
		Nprobe:          getEnvInt("IVF_NPROBE", 6),
		BboxRepairLimit: getEnvInt("IVF_BBOX_REPAIR_LIMIT", 4),
	}

	debugResponse := os.Getenv("DEBUG_RESPONSE") == "true"

	log.Printf("Referências carregadas: count=%d vectors=%d labels=%d\n",
		refs.Count,
		len(refs.Vectors),
		len(refs.Labels),
	)

	log.Printf("IVF carregado: nlist=%d centroids=%d clusterIndex=%d\n",
		ivfIndex.Nlist,
		len(ivfIndex.Centroids),
		len(ivfIndex.ClusterIndex),
	)

	http.HandleFunc("/ready", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})

	http.HandleFunc("/fraud-score", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			w.WriteHeader(http.StatusMethodNotAllowed)
			return
		}

		var start time.Time
		if debugResponse {
			start = time.Now()
		}

		var payload fraud.FraudScoreRequest

		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			w.WriteHeader(http.StatusBadRequest)
			return
		}

		queryVector := fraud.Vectorize(payload, config)

		result := fraud.CalculateFraudScore(queryVector, refs, ivfIndex, searchConfig)

		w.Header()["Content-Type"] = jsonContentType

		if !debugResponse {
			w.Write(fastFraudScoreResponses[result.FraudCount])
			return
		}

		result.Debug.DurationMs = float64(time.Since(start).Microseconds()) / 1000.0

		response := FraudScoreResponse{
			Approved:   result.Approved,
			FraudScore: result.FraudScore,
			Debug:      &result.Debug,
		}

		json.NewEncoder(w).Encode(response)
	})

	if socketPath := os.Getenv("UNIX_SOCKET_PATH"); socketPath != "" {
		if err := listenAndServeUnix(socketPath); err != nil {
			log.Fatal(err)
		}
		return
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "9999"
	}

	addr := ":" + port

	log.Println("Server listening on", addr)

	if err := http.ListenAndServe(addr, nil); err != nil {
		log.Fatal(err)
	}
}

func listenAndServeUnix(socketPath string) error {
	if err := os.MkdirAll(filepath.Dir(socketPath), 0o777); err != nil {
		return err
	}

	if err := os.Remove(socketPath); err != nil && !os.IsNotExist(err) {
		return err
	}

	listener, err := net.Listen("unix", socketPath)
	if err != nil {
		return err
	}

	if err := os.Chmod(socketPath, 0o666); err != nil {
		listener.Close()
		return err
	}

	log.Println("Server listening on unix socket", socketPath)

	server := &http.Server{}
	return server.Serve(listener)
}

func warmUpMmap(mode string, refs *vector.References, ivfIndex *vector.IvfIndex) {
	switch mode {
	case "full":
		log.Println("Aquecendo dados mmap: full")
		vector.WarmUpReferences(refs)
		vector.WarmUpIvfIndex(ivfIndex)
		log.Println("Aquecimento mmap concluído")
	case "off", "false", "none", "0":
		log.Println("Aquecimento mmap desabilitado")
	default:
		log.Println("Aquecendo dados mmap: index")
		vector.WarmUpIvfIndex(ivfIndex)
		log.Println("Aquecimento mmap concluído")
	}
}

func getEnvInt(name string, fallback int) int {
	value := os.Getenv(name)
	if value == "" {
		return fallback
	}

	parsed, err := strconv.Atoi(value)
	if err != nil {
		return fallback
	}

	return parsed
}
