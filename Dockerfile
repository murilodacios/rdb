FROM golang:1.26-alpine AS builder

WORKDIR /app/go-api

COPY go-api/go.mod ./
COPY go-api/ ./

RUN CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags="-s -w" -o server .

FROM alpine:3.20

WORKDIR /app

COPY --from=builder /app/go-api/server ./server
COPY src/generated ./generated
COPY src/datasets ./datasets

ENV PORT=8080
ENV GENERATED_PATH=/app/generated
ENV DATASETS_PATH=/app/datasets
ENV IVF_NPROBE=6
ENV IVF_BBOX_REPAIR_LIMIT=4
ENV DEBUG_RESPONSE=false
ENV GOMAXPROCS=1
ENV GOMEMLIMIT=120MiB
ENV MMAP_WARMUP=index

EXPOSE 8080

CMD ["./server"]
