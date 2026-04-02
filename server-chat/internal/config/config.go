package config

import (
	"fmt"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/joho/godotenv"
)

type Config struct {
	DatabaseDSN       string
	Addr              string
	JWTSecret         string
	JWTTTL            time.Duration
	AllowedOrigins    []string
	DBMaxOpenConns    int
	DBMaxIdleConns    int
	DBConnMaxLifetime time.Duration
	LiveKitURL        string
	LiveKitAPIKey     string
	LiveKitAPISecret  string
	SMTPHost          string
	SMTPPort          int
	SMTPUser          string
	SMTPPass          string
	SMTPFrom          string
	// Midtrans Snap (optional — empty server key disables POST /api/payments/midtrans/snap-token)
	MidtransServerKey    string
	MidtransIsProduction bool
	// Web Push VAPID keys (optional — empty disables push notifications)
	VAPIDPublicKey  string
	VAPIDPrivateKey string
	VAPIDSubject    string
}

func Load() (*Config, error) {
	_ = godotenv.Load()

	dsn := os.Getenv("DATABASE_DSN")
	if dsn == "" {
		return nil, fmt.Errorf("DATABASE_DSN is not set")
	}

	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		return nil, fmt.Errorf("JWT_SECRET is not set")
	}

	ttlStr := os.Getenv("JWT_TTL")
	if ttlStr == "" {
		ttlStr = "72h"
	}
	jwtTTL, err := time.ParseDuration(ttlStr)
	if err != nil {
		return nil, fmt.Errorf("JWT_TTL: %w", err)
	}

	addr := os.Getenv("ADDR")
	if addr == "" {
		addr = ":8080"
	}

	// Allowed CORS origins (comma-separated, default localhost dev servers)
	originsEnv := os.Getenv("ALLOWED_ORIGINS")
	var allowedOrigins []string
	if originsEnv != "" {
		for _, o := range strings.Split(originsEnv, ",") {
			if trimmed := strings.TrimSpace(o); trimmed != "" {
				allowedOrigins = append(allowedOrigins, trimmed)
			}
		}
	}
	if len(allowedOrigins) == 0 {
		allowedOrigins = []string{
			"http://localhost:5173",
			"http://localhost:5174",
			"http://localhost:3000",
			"http://localhost:4173",
		}
	}

	dbMaxOpen := envInt("DB_MAX_OPEN_CONNS", 25)
	dbMaxIdle := envInt("DB_MAX_IDLE_CONNS", 10)
	dbConnLifetime, _ := time.ParseDuration(os.Getenv("DB_CONN_MAX_LIFETIME"))
	if dbConnLifetime == 0 {
		dbConnLifetime = 30 * time.Minute
	}

	return &Config{
		DatabaseDSN:       dsn,
		Addr:              addr,
		JWTSecret:         jwtSecret,
		JWTTTL:            jwtTTL,
		AllowedOrigins:    allowedOrigins,
		DBMaxOpenConns:    dbMaxOpen,
		DBMaxIdleConns:    dbMaxIdle,
		DBConnMaxLifetime: dbConnLifetime,
		LiveKitURL:        os.Getenv("LIVEKIT_URL"),
		LiveKitAPIKey:     os.Getenv("LIVEKIT_API_KEY"),
		LiveKitAPISecret:  os.Getenv("LIVEKIT_API_SECRET"),
		SMTPHost:          os.Getenv("SMTP_HOST"),
		SMTPPort:          envInt("SMTP_PORT", 587),
		SMTPUser:          os.Getenv("SMTP_USER"),
		SMTPPass:          os.Getenv("SMTP_PASS"),
		SMTPFrom:          os.Getenv("SMTP_FROM"),
		MidtransServerKey:    strings.TrimSpace(os.Getenv("MIDTRANS_SERVER_KEY")),
		MidtransIsProduction: strings.EqualFold(strings.TrimSpace(os.Getenv("MIDTRANS_IS_PRODUCTION")), "true"),
		VAPIDPublicKey:  strings.TrimSpace(os.Getenv("VAPID_PUBLIC_KEY")),
		VAPIDPrivateKey: strings.TrimSpace(os.Getenv("VAPID_PRIVATE_KEY")),
		VAPIDSubject:    strings.TrimSpace(os.Getenv("VAPID_SUBJECT")),
	}, nil
}

func envInt(key string, def int) int {
	if v := os.Getenv(key); v != "" {
		if n, err := strconv.Atoi(v); err == nil {
			return n
		}
	}
	return def
}
