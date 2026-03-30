package auth

import (
	"errors"
	"fmt"
	"strconv"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

var (
	ErrInvalidToken = errors.New("invalid token")
	ErrNoSecret     = errors.New("jwt secret is empty")
)

type Service struct {
	secret []byte
	ttl    time.Duration
}

func NewService(secret string, ttl time.Duration) (*Service, error) {
	if secret == "" {
		return nil, ErrNoSecret
	}
	if ttl <= 0 {
		ttl = 72 * time.Hour
	}
	return &Service{secret: []byte(secret), ttl: ttl}, nil
}

func (s *Service) IssueToken(userID uint) (string, error) {
	claims := jwt.RegisteredClaims{
		Subject:   fmt.Sprintf("%d", userID),
		ExpiresAt: jwt.NewNumericDate(time.Now().UTC().Add(s.ttl)),
		IssuedAt:  jwt.NewNumericDate(time.Now().UTC()),
	}
	t := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return t.SignedString(s.secret)
}

func (s *Service) ParseUserID(tokenStr string) (uint, error) {
	if tokenStr == "" {
		return 0, ErrInvalidToken
	}
	claims := &jwt.RegisteredClaims{}
	_, err := jwt.ParseWithClaims(tokenStr, claims, func(t *jwt.Token) (any, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method %v", t.Header["alg"])
		}
		return s.secret, nil
	})
	if err != nil {
		return 0, ErrInvalidToken
	}
	if claims.Subject == "" {
		return 0, ErrInvalidToken
	}
	id, err := strconv.ParseUint(claims.Subject, 10, 64)
	if err != nil {
		return 0, ErrInvalidToken
	}
	return uint(id), nil
}
