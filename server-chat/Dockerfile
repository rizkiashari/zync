# Build
FROM golang:1.25-alpine AS build
RUN apk add --no-cache git ca-certificates
WORKDIR /src

COPY go.mod go.sum ./
RUN go mod download

COPY . .
# Small VPS: default parallel compile can OOM and fail with exit 1 (no obvious log in compose).
# GOMAXPROCS + -p 1 keeps one package compiling at a time.
RUN CGO_ENABLED=0 GOOS=linux GOMAXPROCS=1 \
	go build -p 1 -trimpath -ldflags="-s -w" -o /out/server ./cmd/server

# Run
FROM alpine:3.21
RUN apk add --no-cache ca-certificates tzdata
COPY --from=build /out/server /usr/local/bin/server
WORKDIR /
EXPOSE 8080
ENV ADDR=:8080
CMD ["server"]
