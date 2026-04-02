package payments

import (
	"bytes"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

type snapTransactionPayload struct {
	TransactionDetails map[string]any   `json:"transaction_details"`
	CustomerDetails    map[string]any   `json:"customer_details"`
	ItemDetails        []map[string]any `json:"item_details"`
	EnabledPayments    []string         `json:"enabled_payments,omitempty"`
}

type snapTransactionResponse struct {
	Token string `json:"token"`
}

func midtransSnapBaseURL(production bool) string {
	if production {
		return "https://app.midtrans.com"
	}
	return "https://app.sandbox.midtrans.com"
}

func createSnapToken(serverKey string, production bool, payload snapTransactionPayload) (string, error) {
	body, err := json.Marshal(payload)
	if err != nil {
		return "", err
	}
	base := midtransSnapBaseURL(production)
	req, err := http.NewRequest(http.MethodPost, base+"/snap/v1/transactions", bytes.NewReader(body))
	if err != nil {
		return "", err
	}
	auth := base64.StdEncoding.EncodeToString([]byte(serverKey + ":"))
	req.Header.Set("Authorization", "Basic "+auth)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json")

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()
	raw, _ := io.ReadAll(resp.Body)
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return "", fmt.Errorf("midtrans HTTP %d: %s", resp.StatusCode, string(raw))
	}
	var out snapTransactionResponse
	if err := json.Unmarshal(raw, &out); err != nil {
		return "", fmt.Errorf("midtrans decode: %w body=%s", err, string(raw))
	}
	if out.Token == "" {
		return "", fmt.Errorf("midtrans: empty token in response: %s", string(raw))
	}
	return out.Token, nil
}
