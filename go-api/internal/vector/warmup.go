package vector

var warmupFloatSink float32
var warmupUint32Sink uint32
var warmupByteSink byte

// WarmUpReferences touches one value per memory page to force mmap-backed
// reference data into memory during startup instead of during the first requests.
func WarmUpReferences(refs *References) {
	const float32PerPage = 4096 / 4

	for i := 0; i < len(refs.Vectors); i += float32PerPage {
		warmupFloatSink += refs.Vectors[i]
	}

	for i := 0; i < len(refs.Labels); i += 4096 {
		warmupByteSink ^= refs.Labels[i]
	}
}

// WarmUpIvfIndex touches one value per memory page to reduce request-time page faults.
func WarmUpIvfIndex(ivf *IvfIndex) {
	const float32PerPage = 4096 / 4
	const uint32PerPage = 4096 / 4

	for i := 0; i < len(ivf.Centroids); i += float32PerPage {
		warmupFloatSink += ivf.Centroids[i]
	}

	for i := 0; i < len(ivf.BboxMin); i += float32PerPage {
		warmupFloatSink += ivf.BboxMin[i]
	}

	for i := 0; i < len(ivf.BboxMax); i += float32PerPage {
		warmupFloatSink += ivf.BboxMax[i]
	}

	for i := 0; i < len(ivf.ClusterIndex); i += uint32PerPage {
		warmupUint32Sink ^= ivf.ClusterIndex[i]
	}
}
