package websocket

import (
	"log"
	"net/http"
	"strconv"
	"time"

	gorillaws "github.com/gorilla/websocket"

	"zync-server/internal/hub"
)

type notifyClient struct {
	hub      *hub.Hub
	presence PresenceStore
	conn     *gorillaws.Conn
	send     chan []byte
	userID   uint
	userKey  string
}

func (c *notifyClient) Send() chan<- []byte { return c.send }
func (c *notifyClient) SendCh() chan []byte  { return c.send }
func (c *notifyClient) ID() string          { return strconv.FormatUint(uint64(c.userID), 10) }
func (c *notifyClient) Room() string        { return c.userKey }

// ServeNotify upgrades the connection and registers the client under "user:{userID}" in the hub.
// It also manages the user's global online/offline status — online while this WS is open.
func ServeNotify(h *hub.Hub, presence PresenceStore, w http.ResponseWriter, r *http.Request, userID uint, allowedOrigins []string) {
	upgrader := newUpgrader(allowedOrigins)
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("notify ws upgrade: %v", err)
		return
	}
	userKey := "user:" + strconv.FormatUint(uint64(userID), 10)
	c := &notifyClient{
		hub:      h,
		presence: presence,
		conn:     conn,
		send:     make(chan []byte, 256),
		userID:   userID,
		userKey:  userKey,
	}
	c.hub.Register(c)
	if err := c.presence.SetOnline(userID, true); err != nil {
		log.Printf("notify: set online: %v", err)
	}
	go c.writePump()
	go c.readPump()
}

func (c *notifyClient) readPump() {
	defer func() {
		c.hub.Unregister(c)
		_ = c.conn.Close()
		if err := c.presence.SetOnline(c.userID, false); err != nil {
			log.Printf("notify: set offline: %v", err)
		}
	}()
	c.conn.SetReadLimit(512)
	_ = c.conn.SetReadDeadline(time.Now().Add(pongWait))
	c.conn.SetPongHandler(func(string) error {
		_ = c.conn.SetReadDeadline(time.Now().Add(pongWait))
		return nil
	})
	for {
		if _, _, err := c.conn.ReadMessage(); err != nil {
			break
		}
	}
}

func (c *notifyClient) writePump() {
	ticker := time.NewTicker(pingPeriod)
	defer func() {
		ticker.Stop()
		_ = c.conn.Close()
	}()
	for {
		select {
		case msg, ok := <-c.send:
			_ = c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if !ok {
				_ = c.conn.WriteMessage(gorillaws.CloseMessage, []byte{})
				return
			}
			w, err := c.conn.NextWriter(gorillaws.TextMessage)
			if err != nil {
				return
			}
			if _, err := w.Write(msg); err != nil {
				return
			}
			n := len(c.send)
			for i := 0; i < n; i++ {
				if _, err := w.Write([]byte{'\n'}); err != nil {
					return
				}
				if _, err := w.Write(<-c.send); err != nil {
					return
				}
			}
			if err := w.Close(); err != nil {
				return
			}
		case <-ticker.C:
			_ = c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if err := c.conn.WriteMessage(gorillaws.PingMessage, nil); err != nil {
				return
			}
		}
	}
}
