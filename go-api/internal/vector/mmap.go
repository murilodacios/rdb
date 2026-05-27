package vector

import (
	"encoding/binary"
	"math"
	"os"
	"syscall"
	"unsafe"
)

func mmapReadOnly(path string) ([]byte, error) {
	file, err := os.Open(path)
	if err != nil {
		return nil, err
	}
	defer file.Close()

	stat, err := file.Stat()
	if err != nil {
		return nil, err
	}

	data, err := syscall.Mmap(
		int(file.Fd()),
		0,
		int(stat.Size()),
		syscall.PROT_READ,
		syscall.MAP_SHARED,
	)
	if err != nil {
		return nil, err
	}

	return data, nil
}

func bytesToFloat32Slice(data []byte) []float32 {
	if len(data) == 0 {
		return nil
	}

	return unsafe.Slice(
		(*float32)(unsafe.Pointer(&data[0])),
		len(data)/4,
	)
}

func bytesToUint32Slice(data []byte) []uint32 {
	if len(data) == 0 {
		return nil
	}

	return unsafe.Slice(
		(*uint32)(unsafe.Pointer(&data[0])),
		len(data)/4,
	)
}

// Mantém para arquivos pequenos ou fallback sem mmap.
func loadFloat32File(path string) ([]float32, error) {
	file, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}

	values := make([]float32, len(file)/4)

	for i := 0; i < len(values); i++ {
		bits := binary.LittleEndian.Uint32(file[i*4 : i*4+4])
		values[i] = math.Float32frombits(bits)
	}

	return values, nil
}

func loadUint32File(path string) ([]uint32, error) {
	file, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}

	values := make([]uint32, len(file)/4)

	for i := 0; i < len(values); i++ {
		values[i] = binary.LittleEndian.Uint32(file[i*4 : i*4+4])
	}

	return values, nil
}
