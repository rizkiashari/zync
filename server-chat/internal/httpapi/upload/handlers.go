package upload

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/gin-gonic/gin"

	"zync-server/internal/httpapi/middleware"
	"zync-server/internal/httpapi/response"
	"zync-server/internal/repository"
)

const maxUploadSize = 10 << 20 // 10 MB

var allowedExt = map[string]bool{
	".jpg": true, ".jpeg": true, ".png": true, ".gif": true, ".webp": true,
	".pdf": true, ".doc": true, ".docx": true,
	".xls": true, ".xlsx": true,
	".txt": true, ".csv": true,
	".zip": true, ".mp4": true, ".mp3": true,
}

func randHex() string {
	b := make([]byte, 16)
	_, _ = rand.Read(b)
	return hex.EncodeToString(b)
}

func handleUpload(roomsRepo *repository.RoomRepository, uploadsDir string) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, ok := middleware.UserID(c)
		if !ok {
			response.Error(c, http.StatusUnauthorized, response.CodeUnauthorized, "Unauthorized")
			return
		}

		roomIDStr := c.Param("id")
		var roomID uint
		if _, err := fmt.Sscanf(roomIDStr, "%d", &roomID); err != nil {
			response.Error(c, http.StatusBadRequest, response.CodeInvalidBody, "Invalid room ID")
			return
		}

		isMember, err := roomsRepo.IsMember(roomID, userID)
		if err != nil || !isMember {
			response.Error(c, http.StatusForbidden, response.CodeForbidden, "Not a member of this room")
			return
		}

		c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, maxUploadSize)
		file, header, err := c.Request.FormFile("file")
		if err != nil {
			response.Error(c, http.StatusBadRequest, response.CodeInvalidBody, "No file provided or file too large (max 10 MB)")
			return
		}
		defer file.Close()

		ext := strings.ToLower(filepath.Ext(header.Filename))
		if !allowedExt[ext] {
			response.Error(c, http.StatusBadRequest, response.CodeInvalidBody, "File type not allowed")
			return
		}

		dir := filepath.Join(uploadsDir, fmt.Sprintf("%d", roomID))
		if err := os.MkdirAll(dir, 0o755); err != nil {
			response.Error(c, http.StatusInternalServerError, response.CodeInternal, "Unable to save file")
			return
		}

		filename := randHex() + ext
		dst, err := os.Create(filepath.Join(dir, filename))
		if err != nil {
			response.Error(c, http.StatusInternalServerError, response.CodeInternal, "Unable to save file")
			return
		}
		defer dst.Close()

		if _, err := io.Copy(dst, file); err != nil {
			response.Error(c, http.StatusInternalServerError, response.CodeInternal, "Unable to save file")
			return
		}

		mime := header.Header.Get("Content-Type")
		if mime == "" {
			mime = "application/octet-stream"
		}

		response.OK(c, gin.H{
			"url":  fmt.Sprintf("/uploads/%d/%s", roomID, filename),
			"name": header.Filename,
			"mime": mime,
			"size": header.Size,
		})
	}
}
