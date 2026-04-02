package authroute

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"

	"zync-server/internal/auth"
	"zync-server/internal/httpapi/middleware"
	"zync-server/internal/httpapi/response"
	"zync-server/internal/models"
	"zync-server/internal/repository"
)

type registerBody struct {
	Email    string `json:"email"    binding:"required,email"`
	Password string `json:"password" binding:"required,min=8"`
	Username string `json:"username" binding:"omitempty,min=2,max=64"`
}

type loginBody struct {
	Email    string `json:"email"    binding:"required,email"`
	Password string `json:"password" binding:"required,min=8"`
}

type refreshBody struct {
	RefreshToken string `json:"refresh_token" binding:"required"`
}

// handleRegister godoc
// @Summary      Register account
// @Tags         auth
// @Accept       json
// @Produce      json
// @Param        body body apidocs.RegisterRequest true "Credentials + optional username"
// @Success      201 {object} apidocs.AuthSuccess
// @Failure      400 {object} apidocs.ErrorEnvelope
// @Failure      409 {object} apidocs.ErrorEnvelope
// @Failure      500 {object} apidocs.ErrorEnvelope
// @Router       /auth/register [post]
func handleRegister(users *repository.UserRepository, rtRepo *repository.RefreshTokenRepository, jwtSvc *auth.Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req registerBody
		if err := c.ShouldBindJSON(&req); err != nil {
			response.Error(c, http.StatusBadRequest, response.CodeInvalidBody, "Invalid or malformed request body")
			return
		}
		email := strings.ToLower(strings.TrimSpace(req.Email))
		existing, err := users.GetByEmail(email)
		if err != nil {
			response.Error(c, http.StatusInternalServerError, response.CodeInternal, "Unable to complete the request")
			return
		}
		if existing != nil {
			response.Error(c, http.StatusConflict, response.CodeEmailAlreadyRegistered, "This email is already registered")
			return
		}
		username := strings.TrimSpace(req.Username)
		if username == "" {
			parts := strings.SplitN(email, "@", 2)
			username = parts[0]
		}
		hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
		if err != nil {
			response.Error(c, http.StatusInternalServerError, response.CodeInternal, "Unable to complete the request")
			return
		}
		u := &models.User{Email: email, PasswordHash: string(hash), Username: username}
		if err := users.Create(u); err != nil {
			response.Error(c, http.StatusInternalServerError, response.CodeInternal, "Unable to complete the request")
			return
		}
		accessToken, err := jwtSvc.IssueToken(u.ID)
		if err != nil {
			response.Error(c, http.StatusInternalServerError, response.CodeInternal, "Unable to complete the request")
			return
		}
		rt, err := rtRepo.Create(u.ID)
		if err != nil {
			response.Error(c, http.StatusInternalServerError, response.CodeInternal, "Unable to complete the request")
			return
		}

		// No default workspace — client sends users to onboarding (create or join via invite link).
		response.Created(c, gin.H{
			"access_token":  accessToken,
			"refresh_token": rt.Token,
			"user":          u,
			"workspace":     nil,
		})
	}
}

// handleLogin godoc
// @Summary      Login
// @Tags         auth
// @Accept       json
// @Produce      json
// @Param        body body apidocs.AuthCredentials true "Credentials"
// @Success      200 {object} apidocs.AuthSuccess
// @Failure      400 {object} apidocs.ErrorEnvelope
// @Failure      401 {object} apidocs.ErrorEnvelope
// @Failure      500 {object} apidocs.ErrorEnvelope
// @Router       /auth/login [post]
func handleLogin(users *repository.UserRepository, rtRepo *repository.RefreshTokenRepository, jwtSvc *auth.Service, wsRepo *repository.WorkspaceRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req loginBody
		if err := c.ShouldBindJSON(&req); err != nil {
			response.Error(c, http.StatusBadRequest, response.CodeInvalidBody, "Invalid or malformed request body")
			return
		}
		email := strings.ToLower(strings.TrimSpace(req.Email))
		u, err := users.GetByEmail(email)
		if err != nil {
			response.Error(c, http.StatusInternalServerError, response.CodeInternal, "Unable to complete the request")
			return
		}
		if u == nil || bcrypt.CompareHashAndPassword([]byte(u.PasswordHash), []byte(req.Password)) != nil {
			response.Error(c, http.StatusUnauthorized, response.CodeInvalidCredentials, "Invalid email or password")
			return
		}
		accessToken, err := jwtSvc.IssueToken(u.ID)
		if err != nil {
			response.Error(c, http.StatusInternalServerError, response.CodeInternal, "Unable to complete the request")
			return
		}
		rt, err := rtRepo.Create(u.ID)
		if err != nil {
			response.Error(c, http.StatusInternalServerError, response.CodeInternal, "Unable to complete the request")
			return
		}

		// Return user's workspaces; auto-select the first one as default
		wsList, _ := wsRepo.ListForUser(u.ID)
		var defaultWS *models.Workspace
		if len(wsList) > 0 {
			defaultWS = &wsList[0]
		}

		response.OK(c, gin.H{
			"access_token":  accessToken,
			"refresh_token": rt.Token,
			"user":          u,
			"workspace":     defaultWS,
			"workspaces":    wsList,
		})
	}
}

// handleRefresh godoc
// @Summary      Refresh access token
// @Tags         auth
// @Accept       json
// @Produce      json
// @Param        body body apidocs.RefreshRequest true "Refresh token"
// @Success      200 {object} apidocs.RefreshSuccess
// @Failure      400 {object} apidocs.ErrorEnvelope
// @Failure      401 {object} apidocs.ErrorEnvelope
// @Failure      500 {object} apidocs.ErrorEnvelope
// @Router       /auth/refresh [post]
func handleRefresh(rtRepo *repository.RefreshTokenRepository, jwtSvc *auth.Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req refreshBody
		if err := c.ShouldBindJSON(&req); err != nil {
			response.Error(c, http.StatusBadRequest, response.CodeInvalidBody, "Invalid or malformed request body")
			return
		}
		rt, err := rtRepo.GetByToken(req.RefreshToken)
		if err != nil {
			response.Error(c, http.StatusInternalServerError, response.CodeInternal, "Unable to complete the request")
			return
		}
		if rt == nil {
			response.Error(c, http.StatusUnauthorized, response.CodeInvalidToken, "Invalid or expired refresh token")
			return
		}
		_ = rtRepo.Revoke(req.RefreshToken)
		newRT, err := rtRepo.Create(rt.UserID)
		if err != nil {
			response.Error(c, http.StatusInternalServerError, response.CodeInternal, "Unable to complete the request")
			return
		}
		accessToken, err := jwtSvc.IssueToken(rt.UserID)
		if err != nil {
			response.Error(c, http.StatusInternalServerError, response.CodeInternal, "Unable to complete the request")
			return
		}
		response.OK(c, gin.H{"access_token": accessToken, "refresh_token": newRT.Token})
	}
}

// handleLogout godoc
// @Summary      Logout (revoke refresh token)
// @Tags         auth
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        body body object false "Specific refresh_token to revoke; omit to revoke all"
// @Success      200 {object} apidocs.OKMessage
// @Failure      401 {object} apidocs.ErrorEnvelope
// @Router       /auth/logout [post]
func handleLogout(rtRepo *repository.RefreshTokenRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, ok := middleware.UserID(c)
		if !ok {
			response.Error(c, http.StatusUnauthorized, response.CodeUnauthorized, "Unauthorized")
			return
		}
		var req struct {
			RefreshToken string `json:"refresh_token"`
		}
		_ = c.ShouldBindJSON(&req)
		if req.RefreshToken != "" {
			_ = rtRepo.Revoke(req.RefreshToken)
		} else {
			_ = rtRepo.RevokeAllForUser(userID)
		}
		response.OK(c, gin.H{"message": "Logged out successfully"})
	}
}
