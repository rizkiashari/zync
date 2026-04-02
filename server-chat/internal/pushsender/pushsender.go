// Package pushsender sends Web Push notifications using the VAPID protocol.
package pushsender

import (
	"encoding/json"
	"log"

	webpush "github.com/SherClockHolmes/webpush-go"

	"zync-server/internal/models"
	"zync-server/internal/repository"
)

// Payload is the JSON body sent as the push message.
type Payload struct {
	Title string `json:"title"`
	Body  string `json:"body"`
	Icon  string `json:"icon,omitempty"`
	URL   string `json:"url,omitempty"`
}

// SendToUser sends a push notification to all subscriptions of a user.
// Subscriptions that respond with 410 Gone are automatically removed.
func SendToUser(pushRepo *repository.PushSubscriptionRepository, userID uint, payload Payload, vapidPublic, vapidPrivate, vapidSubject string) {
	subs, err := pushRepo.ListByUser(userID)
	if err != nil {
		log.Printf("push: list subs for user %d: %v", userID, err)
		return
	}
	if len(subs) == 0 {
		return
	}
	body, _ := json.Marshal(payload)
	for _, sub := range subs {
		go sendOne(pushRepo, sub, body, vapidPublic, vapidPrivate, vapidSubject)
	}
}

func sendOne(pushRepo *repository.PushSubscriptionRepository, sub models.PushSubscription, body []byte, vapidPublic, vapidPrivate, vapidSubject string) {
	s := &webpush.Subscription{
		Endpoint: sub.Endpoint,
		Keys: webpush.Keys{
			P256dh: sub.P256DH,
			Auth:   sub.Auth,
		},
	}

	resp, err := webpush.SendNotification(body, s, &webpush.Options{
		VAPIDPublicKey:  vapidPublic,
		VAPIDPrivateKey: vapidPrivate,
		Subscriber:      vapidSubject,
		TTL:             86400,
	})
	if err != nil {
		log.Printf("push: send to %s: %v", sub.Endpoint, err)
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode == 410 || resp.StatusCode == 404 {
		if err := pushRepo.DeleteByEndpoint(sub.Endpoint); err != nil {
			log.Printf("push: delete expired sub: %v", err)
		}
		return
	}
	if resp.StatusCode >= 400 {
		log.Printf("push: endpoint %s returned %d", sub.Endpoint, resp.StatusCode)
	}
}
