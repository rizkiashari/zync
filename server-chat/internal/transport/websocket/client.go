package websocket

import (
	"encoding/json"
	"log"
	"net/http"
	"strconv"
	"time"

	gorillaws "github.com/gorilla/websocket"

	"zync-server/internal/hub"
)

const (
	writeWait      = 10 * time.Second
	pongWait       = 60 * time.Second
	pingPeriod     = (pongWait * 9) / 10
	maxMessageSize = 4096
)

func newUpgrader(allowedOrigins []string) gorillaws.Upgrader {
	originSet := make(map[string]struct{}, len(allowedOrigins))
	for _, o := range allowedOrigins {
		originSet[o] = struct{}{}
	}
	checkOrigin := func(r *http.Request) bool {
		if len(originSet) == 0 {
			return true
		}
		origin := r.Header.Get("Origin")
		if origin == "" {
			return true // same-origin or non-browser client
		}
		_, ok := originSet[origin]
		return ok
	}
	return gorillaws.Upgrader{
		ReadBufferSize:  1024,
		WriteBufferSize: 1024,
		CheckOrigin:     checkOrigin,
	}
}

// Incoming message types from client.
const (
	TypeChat     = "chat"
	TypeTyping   = "typing"
	TypeStopType = "stop_typing"
	TypeRead     = "read"
)

type Incoming struct {
	Type      string `json:"type"`
	Text      string `json:"text"`
	ReplyToID uint   `json:"reply_to_id,omitempty"`
	MsgID     uint   `json:"msg_id,omitempty"` // used for "read"
}

type Outgoing struct {
	Type          string `json:"type"`
	ID            uint   `json:"id,omitempty"`
	From          uint   `json:"from,omitempty"`
	Room          uint   `json:"room,omitempty"`
	Text          string `json:"text,omitempty"`
	ReplyToID     uint   `json:"reply_to_id,omitempty"`
	UserID        uint   `json:"user_id,omitempty"`
	Online        bool   `json:"online,omitempty"`
	MsgID         uint   `json:"msg_id,omitempty"`
	SentAt        int64  `json:"sent_at,omitempty"`
	StatusMessage string `json:"status_message,omitempty"`
}

// MessageStore persists chat messages.
type MessageStore interface {
	SaveMessage(roomID, senderID uint, body string, createdAt time.Time) (uint, error)
	SaveMessageWithReply(roomID, senderID uint, body string, replyToID uint, createdAt time.Time) (uint, error)
	UpdateLastRead(roomID, userID, msgID uint) error
}

// PresenceStore tracks user online status.
type PresenceStore interface {
	SetOnline(id uint, online bool) error
}

// ReadStore updates the user's read position in a room.
type ReadStore interface {
	UpdateLastRead(roomID, userID, msgID uint) error
}

// RoomMemberStore retrieves member IDs for a room.
type RoomMemberStore interface {
	GetMemberIDs(roomID uint) ([]uint, error)
}

type Client struct {
	hub           *hub.Hub
	store         MessageStore
	presence      PresenceStore
	members       RoomMemberStore
	conn          *gorillaws.Conn
	send          chan []byte
	userID        uint
	roomID        uint
	roomKey       string
	statusMessage string
}

func (c *Client) Send() chan<- []byte { return c.send }
func (c *Client) SendCh() chan []byte  { return c.send }
func (c *Client) ID() string          { return strconv.FormatUint(uint64(c.userID), 10) }
func (c *Client) Room() string        { return c.roomKey }

func Serve(h *hub.Hub, store MessageStore, presence PresenceStore, members RoomMemberStore, w http.ResponseWriter, r *http.Request, userID, roomID uint, statusMessage string, allowedOrigins []string) {
	roomKey := strconv.FormatUint(uint64(roomID), 10)
	upgrader := newUpgrader(allowedOrigins)
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("websocket upgrade: %v", err)
		return
	}
	c := &Client{
		hub:           h,
		store:         store,
		presence:      presence,
		members:       members,
		conn:          conn,
		send:          make(chan []byte, 256),
		userID:        userID,
		roomID:        roomID,
		roomKey:       roomKey,
		statusMessage: statusMessage,
	}
	c.hub.Register(c)

	if err := c.presence.SetOnline(userID, true); err != nil {
		log.Printf("set online: %v", err)
	}
	presenceOn := Outgoing{Type: "presence", UserID: userID, Online: true, StatusMessage: statusMessage}
	_ = c.hub.BroadcastToRoom(roomKey, presenceOn)
	if members != nil {
		if memberIDs, err := members.GetMemberIDs(roomID); err == nil {
			for _, mid := range memberIDs {
				if mid != userID {
					_ = c.hub.NotifyUser(mid, presenceOn)
				}
			}
		}
	}

	go c.writePump()
	go c.readPump()
}

func (c *Client) readPump() {
	defer func() {
		c.hub.Unregister(c)
		_ = c.conn.Close()
		if err := c.presence.SetOnline(c.userID, false); err != nil {
			log.Printf("set offline: %v", err)
		}
		presenceOff := Outgoing{Type: "presence", UserID: c.userID, Online: false}
		_ = c.hub.BroadcastToRoom(c.roomKey, presenceOff)
		if c.members != nil {
			if memberIDs, err := c.members.GetMemberIDs(c.roomID); err == nil {
				for _, mid := range memberIDs {
					if mid != c.userID {
						_ = c.hub.NotifyUser(mid, presenceOff)
					}
				}
			}
		}
	}()

	c.conn.SetReadLimit(maxMessageSize)
	_ = c.conn.SetReadDeadline(time.Now().Add(pongWait))
	c.conn.SetPongHandler(func(string) error {
		_ = c.conn.SetReadDeadline(time.Now().Add(pongWait))
		return nil
	})

	for {
		_, message, err := c.conn.ReadMessage()
		if err != nil {
			break
		}
		var in Incoming
		if err := json.Unmarshal(message, &in); err != nil {
			continue
		}

		switch in.Type {
		case TypeChat:
			if in.Text == "" {
				continue
			}
			now := time.Now().UTC()
			var id uint
			var saveErr error
			if in.ReplyToID > 0 {
				id, saveErr = c.store.SaveMessageWithReply(c.roomID, c.userID, in.Text, in.ReplyToID, now)
			} else {
				id, saveErr = c.store.SaveMessage(c.roomID, c.userID, in.Text, now)
			}
			if saveErr != nil {
				log.Printf("save message: %v", saveErr)
				continue
			}
			out := Outgoing{
				Type:      TypeChat,
				ID:        id,
				From:      c.userID,
				Room:      c.roomID,
				Text:      in.Text,
				ReplyToID: in.ReplyToID,
				SentAt:    now.Unix(),
			}
			if err := c.hub.BroadcastToRoom(c.roomKey, out); err != nil {
				log.Printf("broadcast: %v", err)
			}
			// Notify room members who are NOT connected to this room's WS
			if c.members != nil {
				memberIDs, err := c.members.GetMemberIDs(c.roomID)
				if err == nil {
					for _, memberID := range memberIDs {
						if memberID != c.userID {
							_ = c.hub.NotifyUser(memberID, out)
						}
					}
				}
			}

		case TypeTyping:
			_ = c.hub.BroadcastToRoom(c.roomKey, Outgoing{
				Type:   TypeTyping,
				UserID: c.userID,
				Room:   c.roomID,
			})

		case TypeStopType:
			_ = c.hub.BroadcastToRoom(c.roomKey, Outgoing{
				Type:   TypeStopType,
				UserID: c.userID,
				Room:   c.roomID,
			})

		case TypeRead:
			if in.MsgID == 0 {
				continue
			}
			if err := c.store.UpdateLastRead(c.roomID, c.userID, in.MsgID); err != nil {
				log.Printf("update last read: %v", err)
				continue
			}
			_ = c.hub.BroadcastToRoom(c.roomKey, Outgoing{
				Type:   TypeRead,
				UserID: c.userID,
				Room:   c.roomID,
				MsgID:  in.MsgID,
			})
		}
	}
}

func (c *Client) writePump() {
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
