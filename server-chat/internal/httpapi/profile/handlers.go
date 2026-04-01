package profile

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
	"golang.org/x/crypto/bcrypt"

	"zync-server/internal/httpapi/middleware"
	"zync-server/internal/httpapi/response"
	"zync-server/internal/repository"
)

const maxAvatarBytes = 5 << 20 // 5 MB

var allowedAvatarExt = map[string]bool{
	".jpg": true, ".jpeg": true, ".png": true, ".gif": true, ".webp": true,
}

func avatarRandHex() string {
	b := make([]byte, 16)
	_, _ = rand.Read(b)
	return hex.EncodeToString(b)
}

type updateProfileBody struct {
	Username           *string `json:"username"            binding:"omitempty,min=2,max=64"`
	Avatar             *string `json:"avatar"              binding:"omitempty,max=512"`
	Bio                *string `json:"bio"                 binding:"omitempty,max=256"`
	EmailNotifications *bool   `json:"email_notifications"`
}

type changePasswordBody struct {
	CurrentPassword string `json:"current_password" binding:"required"`
	NewPassword     string `json:"new_password"     binding:"required,min=8"`
}

// handleGetProfile godoc
// @Summary      Get my profile
// @Tags         profile
// @Produce      json
// @Security     BearerAuth
// @Success      200 {object} apidocs.ProfileSuccess
// @Failure      401 {object} apidocs.ErrorEnvelope
// @Router       /api/profile [get]
func handleGetProfile(usersRepo *repository.UserRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, ok := middleware.UserID(c)
		if !ok {
			response.Error(c, http.StatusUnauthorized, response.CodeUnauthorized, "Unauthorized")
			return
		}
		u, err := usersRepo.GetByID(userID)
		if err != nil || u == nil {
			response.Error(c, http.StatusInternalServerError, response.CodeInternal, "Unable to complete the request")
			return
		}
		response.OK(c, u)
	}
}

// handleUpdateProfile godoc
// @Summary      Update profile (username / avatar / bio)
// @Tags         profile
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        body body apidocs.UpdateProfileRequest true "Profile fields to update"
// @Success      200 {object} apidocs.ProfileSuccess
// @Failure      400 {object} apidocs.ErrorEnvelope
// @Failure      401 {object} apidocs.ErrorEnvelope
// @Failure      409 {object} apidocs.ErrorEnvelope
// @Router       /api/profile [put]
func handleUpdateProfile(usersRepo *repository.UserRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, ok := middleware.UserID(c)
		if !ok {
			response.Error(c, http.StatusUnauthorized, response.CodeUnauthorized, "Unauthorized")
			return
		}
		var req updateProfileBody
		if err := c.ShouldBindJSON(&req); err != nil {
			response.Error(c, http.StatusBadRequest, response.CodeInvalidBody, "Invalid or malformed request body")
			return
		}
		updates := map[string]any{}
		if req.Username != nil {
			username := strings.TrimSpace(*req.Username)
			if username == "" {
				response.Error(c, http.StatusBadRequest, response.CodeInvalidBody, "Username cannot be empty")
				return
			}
			existing, err := usersRepo.GetByUsername(username)
			if err != nil {
				response.Error(c, http.StatusInternalServerError, response.CodeInternal, "Unable to complete the request")
				return
			}
			if existing != nil && existing.ID != userID {
				response.Error(c, http.StatusConflict, response.CodeUsernameTaken, "Username is already taken")
				return
			}
			updates["username"] = username
		}
		if req.Avatar != nil {
			updates["avatar"] = *req.Avatar
		}
		if req.Bio != nil {
			updates["bio"] = strings.TrimSpace(*req.Bio)
		}
		if req.EmailNotifications != nil {
			updates["email_notifications"] = *req.EmailNotifications
		}
		if len(updates) == 0 {
			response.Error(c, http.StatusBadRequest, response.CodeInvalidBody, "No fields to update")
			return
		}
		if err := usersRepo.UpdateProfileFields(userID, updates); err != nil {
			response.Error(c, http.StatusInternalServerError, response.CodeInternal, "Unable to complete the request")
			return
		}
		u, err := usersRepo.GetByID(userID)
		if err != nil || u == nil {
			response.Error(c, http.StatusInternalServerError, response.CodeInternal, "Unable to complete the request")
			return
		}
		response.OK(c, u)
	}
}

func handleUploadAvatar(uploadsDir string) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, ok := middleware.UserID(c)
		if !ok {
			response.Error(c, http.StatusUnauthorized, response.CodeUnauthorized, "Unauthorized")
			return
		}

		c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, maxAvatarBytes)
		file, header, err := c.Request.FormFile("file")
		if err != nil {
			response.Error(c, http.StatusBadRequest, response.CodeInvalidBody, "No file provided or file too large (max 5 MB)")
			return
		}
		defer file.Close()

		ext := strings.ToLower(filepath.Ext(header.Filename))
		if !allowedAvatarExt[ext] {
			response.Error(c, http.StatusBadRequest, response.CodeInvalidBody, "Only image files are allowed (JPEG, PNG, GIF, WEBP)")
			return
		}

		dir := filepath.Join(uploadsDir, "avatars", fmt.Sprintf("%d", userID))
		if err := os.MkdirAll(dir, 0o755); err != nil {
			response.Error(c, http.StatusInternalServerError, response.CodeInternal, "Unable to save file")
			return
		}

		filename := avatarRandHex() + ext
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

		relURL := fmt.Sprintf("/uploads/avatars/%d/%s", userID, filename)
		response.OK(c, gin.H{
			"url":  relURL,
			"name": header.Filename,
			"mime": mime,
			"size": header.Size,
		})
	}
}

type updateStatusBody struct {
	StatusMessage string `json:"status_message" binding:"max=64"`
}

func handleUpdateStatus(usersRepo *repository.UserRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, ok := middleware.UserID(c)
		if !ok {
			response.Error(c, http.StatusUnauthorized, response.CodeUnauthorized, "Unauthorized")
			return
		}
		var req updateStatusBody
		if err := c.ShouldBindJSON(&req); err != nil {
			response.Error(c, http.StatusBadRequest, response.CodeInvalidBody, "Invalid or malformed request body")
			return
		}
		if err := usersRepo.UpdateProfileFields(userID, map[string]any{"status_message": strings.TrimSpace(req.StatusMessage)}); err != nil {
			response.Error(c, http.StatusInternalServerError, response.CodeInternal, "Unable to complete the request")
			return
		}
		response.OK(c, gin.H{"status_message": strings.TrimSpace(req.StatusMessage)})
	}
}

// handleChangePassword godoc
// @Summary      Change password
// @Tags         profile
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        body body apidocs.ChangePasswordRequest true "Current and new password"
// @Success      200 {object} apidocs.OKMessage
// @Failure      400 {object} apidocs.ErrorEnvelope
// @Failure      401 {object} apidocs.ErrorEnvelope
// @Router       /api/profile/password [put]
func handleChangePassword(usersRepo *repository.UserRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, ok := middleware.UserID(c)
		if !ok {
			response.Error(c, http.StatusUnauthorized, response.CodeUnauthorized, "Unauthorized")
			return
		}
		var req changePasswordBody
		if err := c.ShouldBindJSON(&req); err != nil {
			response.Error(c, http.StatusBadRequest, response.CodeInvalidBody, "Invalid or malformed request body")
			return
		}
		u, err := usersRepo.GetByID(userID)
		if err != nil || u == nil {
			response.Error(c, http.StatusInternalServerError, response.CodeInternal, "Unable to complete the request")
			return
		}
		if bcrypt.CompareHashAndPassword([]byte(u.PasswordHash), []byte(req.CurrentPassword)) != nil {
			response.Error(c, http.StatusUnauthorized, response.CodeInvalidCredentials, "Current password is incorrect")
			return
		}
		hash, err := bcrypt.GenerateFromPassword([]byte(req.NewPassword), bcrypt.DefaultCost)
		if err != nil {
			response.Error(c, http.StatusInternalServerError, response.CodeInternal, "Unable to complete the request")
			return
		}
		if err := usersRepo.UpdatePassword(userID, string(hash)); err != nil {
			response.Error(c, http.StatusInternalServerError, response.CodeInternal, "Unable to complete the request")
			return
		}
		response.OK(c, gin.H{"message": "Password updated successfully"})
	}
}
