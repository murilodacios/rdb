package vector

import (
	"encoding/json"
	"os"
)

const VectorSize = 14

type References struct {
	Vectors []float32
	Labels  []byte
	Count   int

	mmaps [][]byte
}

type ReferencesMeta struct {
	Count      int `json:"count"`
	VectorSize int `json:"vectorSize"`
}

func LoadReferences(basePath string) (*References, error) {
	meta, err := loadMeta(basePath + "/references.meta.json")
	if err != nil {
		return nil, err
	}

	vectorsMap, err := mmapReadOnly(basePath + "/references.vectors.bin")
	if err != nil {
		return nil, err
	}

	labelsMap, err := mmapReadOnly(basePath + "/references.labels.bin")
	if err != nil {
		return nil, err
	}

	vectors := bytesToFloat32Slice(vectorsMap)

	return &References{
		Vectors: vectors,
		Labels:  labelsMap,
		Count:   meta.Count,
		mmaps:   [][]byte{vectorsMap, labelsMap},
	}, nil
}

func loadMeta(path string) (*ReferencesMeta, error) {
	file, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}

	var meta ReferencesMeta

	if err := json.Unmarshal(file, &meta); err != nil {
		return nil, err
	}

	return &meta, nil
}
