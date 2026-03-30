package hub

import (
	"encoding/json"
	"strconv"
	"sync"
)

// Client sends/broadcasts through these channels.
type Client interface {
	Send() chan<- []byte
	SendCh() chan []byte // underlying bidirectional channel, used for closing
	ID() string
	Room() string
}

type Hub struct {
	mu sync.RWMutex

	// roomID -> clients in that room
	rooms map[string]map[Client]struct{}

	register   chan Client
	unregister chan Client
}

func New() *Hub {
	return &Hub{
		rooms:      make(map[string]map[Client]struct{}),
		register:   make(chan Client),
		unregister: make(chan Client),
	}
}

func (h *Hub) Run() {
	for {
		select {
		case c, ok := <-h.register:
			if !ok {
				return
			}
			h.addClient(c)
		case c := <-h.unregister:
			h.removeClient(c)
		}
	}
}

// Shutdown closes all client send channels and stops the hub loop.
func (h *Hub) Shutdown() {
	h.mu.Lock()
	defer h.mu.Unlock()
	for _, clients := range h.rooms {
		for c := range clients {
			close(c.SendCh())
		}
	}
	h.rooms = make(map[string]map[Client]struct{})
	close(h.register)
}

func (h *Hub) Register(c Client) {
	h.register <- c
}

func (h *Hub) Unregister(c Client) {
	h.unregister <- c
}

// BroadcastToRoom sends one message JSON payload to all clients in a room.
func (h *Hub) BroadcastToRoom(room string, v any) error {
	b, err := json.Marshal(v)
	if err != nil {
		return err
	}
	h.mu.RLock()
	defer h.mu.RUnlock()
	set, ok := h.rooms[room]
	if !ok {
		return nil
	}
	for c := range set {
		select {
		case c.Send() <- b:
		default:
			go h.Unregister(c)
		}
	}
	return nil
}

// NotifyUser sends a message to the user's personal notify WS connection (room key "user:{id}").
func (h *Hub) NotifyUser(userID uint, v any) error {
	b, err := json.Marshal(v)
	if err != nil {
		return err
	}
	userKey := "user:" + strconv.FormatUint(uint64(userID), 10)
	h.mu.RLock()
	defer h.mu.RUnlock()
	set, ok := h.rooms[userKey]
	if !ok {
		return nil // user not connected to notify WS
	}
	for c := range set {
		select {
		case c.Send() <- b:
		default:
			go h.Unregister(c)
		}
	}
	return nil
}

func (h *Hub) addClient(c Client) {
	h.mu.Lock()
	defer h.mu.Unlock()
	if h.rooms[c.Room()] == nil {
		h.rooms[c.Room()] = make(map[Client]struct{})
	}
	h.rooms[c.Room()][c] = struct{}{}
}

func (h *Hub) removeClient(c Client) {
	h.mu.Lock()
	defer h.mu.Unlock()
	room := c.Room()
	set, ok := h.rooms[room]
	if !ok {
		return
	}
	delete(set, c)
	if len(set) == 0 {
		delete(h.rooms, room)
	}
}
