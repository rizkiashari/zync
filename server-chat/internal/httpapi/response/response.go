package response

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

// OK responds 200 with { "success": true, "data": data }.
func OK(c *gin.Context, data any) {
	c.JSON(http.StatusOK, envelope{Success: true, Data: data})
}

// Created responds 201 with { "success": true, "data": data }.
func Created(c *gin.Context, data any) {
	c.JSON(http.StatusCreated, envelope{Success: true, Data: data})
}

// Error responds with 4xx/5xx and { "success": false, "error": { "code", "message" } }.
func Error(c *gin.Context, status int, code, message string) {
	c.JSON(status, envelope{
		Success: false,
		Error:   &errPayload{Code: code, Message: message},
	})
}

// Abort stops the chain and writes the same error envelope as Error.
func Abort(c *gin.Context, status int, code, message string) {
	c.AbortWithStatusJSON(status, envelope{
		Success: false,
		Error:   &errPayload{Code: code, Message: message},
	})
}
