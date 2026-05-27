package vector

import (
	"encoding/json"
	"os"
)

type IvfIndex struct {
	Nlist          int
	VectorSize     int
	Count          int
	Centroids      []float32
	ClusterIndex   []uint32
	ClusterOffsets []uint32
	ClusterSizes   []uint32
	BboxMin        []float32
	BboxMax        []float32

	mmaps [][]byte
}

type IvfMeta struct {
	Nlist          int      `json:"nlist"`
	VectorSize     int      `json:"vectorSize"`
	Count          int      `json:"count"`
	ClusterOffsets []uint32 `json:"clusterOffsets"`
	ClusterSizes   []uint32 `json:"clusterSizes"`
}

func LoadIvfIndex(basePath string) (*IvfIndex, error) {
	meta, err := loadIvfMeta(basePath + "/ivf.cluster-meta.json")
	if err != nil {
		return nil, err
	}

	centroidsMap, err := mmapReadOnly(basePath + "/ivf.centroids.bin")
	if err != nil {
		return nil, err
	}

	clusterIndexMap, err := mmapReadOnly(basePath + "/ivf.cluster-index.bin")
	if err != nil {
		return nil, err
	}

	bboxMinMap, err := mmapReadOnly(basePath + "/ivf.bbox-min.bin")
	if err != nil {
		return nil, err
	}

	bboxMaxMap, err := mmapReadOnly(basePath + "/ivf.bbox-max.bin")
	if err != nil {
		return nil, err
	}

	return &IvfIndex{
		Nlist:          meta.Nlist,
		VectorSize:     meta.VectorSize,
		Count:          meta.Count,
		Centroids:      bytesToFloat32Slice(centroidsMap),
		ClusterIndex:   bytesToUint32Slice(clusterIndexMap),
		ClusterOffsets: meta.ClusterOffsets,
		ClusterSizes:   meta.ClusterSizes,
		BboxMin:        bytesToFloat32Slice(bboxMinMap),
		BboxMax:        bytesToFloat32Slice(bboxMaxMap),
		mmaps: [][]byte{
			centroidsMap,
			clusterIndexMap,
			bboxMinMap,
			bboxMaxMap,
		},
	}, nil
}

func loadIvfMeta(path string) (*IvfMeta, error) {
	file, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}

	var meta IvfMeta

	if err := json.Unmarshal(file, &meta); err != nil {
		return nil, err
	}

	return &meta, nil
}
