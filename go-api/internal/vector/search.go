package vector

type Neighbor struct {
	ID       uint32
	Label    byte
	Distance float32
}

type SearchDebug struct {
	SearchMode        string `json:"search_mode"`
	Nprobe            int    `json:"nprobe"`
	BboxRepairLimit   int    `json:"bbox_repair_limit"`
	SelectedClusters  int    `json:"selected_clusters"`
	CentroidClusters  int    `json:"centroid_clusters"`
	RepairClusters    int    `json:"repair_clusters"`
	ScannedCandidates int    `json:"scanned_candidates"`
	NearestFound      int    `json:"nearest_found"`
}

type SearchConfig struct {
	Nprobe          int
	BboxRepairLimit int
}

type SearchResult struct {
	Nearest []Neighbor
	Debug   SearchDebug
}

type ClusterCandidate struct {
	ClusterID int
	Distance  float32
}

func containsCluster(clusters []int, clusterID int) bool {
	for _, id := range clusters {
		if id == clusterID {
			return true
		}
	}
	return false
}

func SearchIvf(
	query [14]float32,
	refs *References,
	ivf *IvfIndex,
	config SearchConfig,
) SearchResult {
	nprobe := config.Nprobe
	bboxRepairLimit := config.BboxRepairLimit

	centroidClusters := findNearestCentroids(query, ivf, nprobe)
	selected := make([]int, 0, nprobe+bboxRepairLimit)

	for _, cluster := range centroidClusters {
		selected = append(selected, cluster.ClusterID)
	}

	repairClusters := findRepairClusters(query, ivf, selected, bboxRepairLimit)

	for _, cluster := range repairClusters {
		if !containsCluster(selected, cluster.ClusterID) {
			selected = append(selected, cluster.ClusterID)
		}
	}

	nearest := make([]Neighbor, 0, 5)
	worstDistance := maxFloat32
	scannedCandidates := 0

	for _, clusterID := range selected {
		start := ivf.ClusterOffsets[clusterID]
		end := ivf.ClusterOffsets[clusterID+1]

		for position := start; position < end; position++ {
			vectorID := ivf.ClusterIndex[position]
			base := int(vectorID) * VectorSize

			distance, eligible := distanceFromReferenceBounded(query, refs.Vectors, base, worstDistance)
			scannedCandidates++

			if !eligible {
				continue
			}

			worstDistance = tryNeighbor(&nearest, Neighbor{
				ID:       vectorID,
				Label:    refs.Labels[vectorID],
				Distance: distance,
			})
		}
	}

	return SearchResult{
		Nearest: nearest,
		Debug: SearchDebug{
			SearchMode:        "ivf",
			Nprobe:            nprobe,
			BboxRepairLimit:   bboxRepairLimit,
			SelectedClusters:  len(selected),
			CentroidClusters:  len(centroidClusters),
			RepairClusters:    len(repairClusters),
			ScannedCandidates: scannedCandidates,
			NearestFound:      len(nearest),
		},
	}
}

func findNearestCentroids(query [14]float32, ivf *IvfIndex, limit int) []ClusterCandidate {
	nearest := make([]ClusterCandidate, 0, limit)

	for clusterID := 0; clusterID < ivf.Nlist; clusterID++ {
		distance := distanceToCentroid(query, ivf.Centroids, clusterID)

		tryClusterCandidate(&nearest, ClusterCandidate{
			ClusterID: clusterID,
			Distance:  distance,
		}, limit)
	}

	return nearest
}

func findRepairClusters(
	query [14]float32,
	ivf *IvfIndex,
	alreadySelected []int,
	limit int,
) []ClusterCandidate {
	nearest := make([]ClusterCandidate, 0, limit)

	if limit <= 0 {
		return nearest
	}

	for clusterID := 0; clusterID < ivf.Nlist; clusterID++ {
		if containsCluster(alreadySelected, clusterID) {
			continue
		}

		distance := distanceToBbox(query, ivf.BboxMin, ivf.BboxMax, clusterID)

		tryClusterCandidate(&nearest, ClusterCandidate{
			ClusterID: clusterID,
			Distance:  distance,
		}, limit)
	}

	return nearest
}

func distanceToCentroid(query [14]float32, centroids []float32, clusterID int) float32 {
	base := clusterID * VectorSize

	var distance float32 = 0

	for i := 0; i < VectorSize; i++ {
		diff := query[i] - centroids[base+i]
		distance += diff * diff
	}

	return distance
}

func distanceToBbox(query [14]float32, bboxMin []float32, bboxMax []float32, clusterID int) float32 {
	base := clusterID * VectorSize

	var distance float32 = 0

	for i := 0; i < VectorSize; i++ {
		value := query[i]
		minValue := bboxMin[base+i]
		maxValue := bboxMax[base+i]

		var diff float32 = 0

		if value < minValue {
			diff = minValue - value
		} else if value > maxValue {
			diff = value - maxValue
		}

		distance += diff * diff
	}

	return distance
}

const maxFloat32 float32 = 3.4028234663852886e+38

func distanceFromReferenceBounded(query [14]float32, vectors []float32, base int, maxDistance float32) (float32, bool) {
	var distance float32 = 0

	for i := 0; i < VectorSize; i++ {
		diff := query[i] - vectors[base+i]
		distance += diff * diff

		if distance >= maxDistance {
			return distance, false
		}
	}

	return distance, true
}

func tryNeighbor(nearest *[]Neighbor, candidate Neighbor) float32 {
	if len(*nearest) < 5 {
		*nearest = append(*nearest, candidate)

		if len(*nearest) < 5 {
			return maxFloat32
		}
	} else {
		worstIndex := 0

		for i := 1; i < len(*nearest); i++ {
			if (*nearest)[i].Distance > (*nearest)[worstIndex].Distance {
				worstIndex = i
			}
		}

		if candidate.Distance < (*nearest)[worstIndex].Distance {
			(*nearest)[worstIndex] = candidate
		}
	}

	worstIndex := 0

	for i := 1; i < len(*nearest); i++ {
		if (*nearest)[i].Distance > (*nearest)[worstIndex].Distance {
			worstIndex = i
		}
	}

	return (*nearest)[worstIndex].Distance
}

func tryClusterCandidate(nearest *[]ClusterCandidate, candidate ClusterCandidate, limit int) {
	if len(*nearest) < limit {
		*nearest = append(*nearest, candidate)
		return
	}

	worstIndex := 0

	for i := 1; i < len(*nearest); i++ {
		if (*nearest)[i].Distance > (*nearest)[worstIndex].Distance {
			worstIndex = i
		}
	}

	if candidate.Distance < (*nearest)[worstIndex].Distance {
		(*nearest)[worstIndex] = candidate
	}
}
